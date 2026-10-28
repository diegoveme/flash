# Flash API

REST API served by AWS API Gateway (HTTP API) with one Lambda per route.
Locally, `apps/api/src/local/server.js` serves the same handlers on `http://localhost:3001`.

## Conventions

- JSON in and out (`Content-Type: application/json`), UTF-8.
- Auth: `Authorization: Bearer <token>`. The token is opaque, lasts 24 hours and is
  validated on the server on every request that sends it. Logout revokes it immediately.
- Auth levels per route:
  - `none`: public, the token is ignored.
  - `optional`: public, but a valid token adds viewer data (for example `viewerReaction`).
    An invalid or expired token on an optional route is treated as a visitor.
  - `required`: `401` without a valid session.
- Dates are ISO 8601 strings in UTC.
- Cursor pagination: list responses return `nextCursor` (string or `null`). Send it back as
  `?cursor=<value>` to get the next page. No offsets.
- Public responses never include email, date of birth, password hashes or the `visible` flag.

### Errors

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Readable message", "fields": { "email": "Invalid email" } } }
```

| Status | `code`                   | When                                             |
| ------ | ------------------------ | ------------------------------------------------ |
| 400    | `VALIDATION_ERROR`       | Invalid input. `fields` may detail each problem. |
| 401    | `UNAUTHORIZED`           | Missing, expired or revoked session.             |
| 403    | `FORBIDDEN`              | Valid session but not allowed (not the author).  |
| 404    | `NOT_FOUND`              | Missing resource or hidden post.                 |
| 409    | `CONFLICT`               | Username or email already registered.            |
| 413    | `PAYLOAD_TOO_LARGE`      | Image over 10 MB or body too large.              |
| 415    | `UNSUPPORTED_MEDIA_TYPE` | Image is not a real JPEG or PNG.                 |
| 500    | `INTERNAL_ERROR`         | Unexpected error. No internals are exposed.      |

## Shapes

```js
// PublicUser
{ id, username, createdAt }

// Session (only returned to its owner)
{ token, expiresAt, user: PublicUser }

// Exif: every field optional, strings only, never GPS
{ cameraMake, cameraModel, lens, focalLength, aperture, shutterSpeed, iso,
  exposureBias, meteringMode, flash, dateTaken }

// Post
{
  id,
  author: { id, username },
  imageUrl,               // served through CloudFront (local: dev server)
  description,            // string or null
  tags,                   // string[]
  exif,                   // Exif (may be {})
  createdAt,
  reactionsCount: { like, inspire, wow },
  commentsCount,
  viewerReaction          // 'like' | 'inspire' | 'wow' | null (null for visitors)
}

// Comment
{ id, postId, author: { id, username }, content, createdAt }

// Notification
{
  id,
  type,                   // 'comment' | 'reaction'
  actor: { id, username },
  post: { id, imageUrl }, // imageUrl is null if the post was hidden later
  reactionType,           // only for type 'reaction'
  commentSnippet,         // only for type 'comment' (first 120 characters)
  read,
  createdAt,
  expiresAt               // createdAt + 7 days
}
```

## Routes

Handler files live in `apps/api/src/interfaces/http/handlers/<handler>.js` and export `handler`.

| Method | Path                          | Auth     | Handler                             |
| ------ | ----------------------------- | -------- | ----------------------------------- |
| POST   | `/auth/register`              | none     | `auth/register`                     |
| POST   | `/auth/login`                 | none     | `auth/login`                        |
| POST   | `/auth/logout`                | required | `auth/logout`                       |
| GET    | `/auth/me`                    | required | `auth/me`                           |
| POST   | `/auth/password-recovery`     | none     | `auth/requestPasswordRecovery`      |
| POST   | `/auth/password-reset`        | none     | `auth/resetPassword`                |
| GET    | `/posts`                      | optional | `posts/listFeed`                    |
| POST   | `/posts`                      | required | `posts/createPost`                  |
| GET    | `/posts/{postId}`             | optional | `posts/getPost`                     |
| DELETE | `/posts/{postId}`             | required | `posts/hidePost`                    |
| GET    | `/posts/{postId}/comments`    | none     | `comments/listComments`             |
| POST   | `/posts/{postId}/comments`    | required | `comments/addComment`               |
| PUT    | `/posts/{postId}/reaction`    | required | `reactions/setReaction`             |
| GET    | `/users/{username}`           | none     | `users/getProfile`                  |
| GET    | `/users/{username}/posts`     | optional | `users/listUserPosts`               |
| POST   | `/uploads`                    | required | `uploads/createUpload`              |
| GET    | `/uploads/{uploadId}/exif`    | required | `uploads/getUploadExif`             |
| GET    | `/notifications`              | required | `notifications/listNotifications`   |
| GET    | `/notifications/unread-count` | required | `notifications/getUnreadCount`      |
| POST   | `/notifications/read-all`     | required | `notifications/markAllRead`         |

### Auth

`POST /auth/register` body `{ email, birthDate, username, password }` returns `201` with a Session.
- `birthDate` is `YYYY-MM-DD`; the person must be at least `MIN_SIGNUP_AGE` (18, pending confirmation).
- `username`: 3 to 30 characters, lowercase letters, digits, `_` or `.`. Unique.
- `email`: unique, stored lowercase, never returned.
- `password`: 8 characters minimum, 72 bytes maximum (bcrypt limit).
- `409 CONFLICT` with `fields.username` or `fields.email` when taken.

`POST /auth/login` body `{ identifier, password }` (`identifier` = username or email) returns `200`
with a Session. Wrong credentials always return the same `401` message.

`POST /auth/logout` returns `204`. The token stops working right away.

`GET /auth/me` returns `200 { user: PublicUser, expiresAt }`.

`POST /auth/password-recovery` body `{ email }` always returns
`202 { message: "If the email is registered, you will receive a link to reset your password." }`,
whether or not the email exists. The link points to `APP_BASE_URL/auth/reset?token=<token>`.
The token is single-use and valid for 1 hour.

`POST /auth/password-reset` body `{ token, password }` returns `204`. An invalid, used or expired
token returns `400 VALIDATION_ERROR` with `fields.token`.

### Posts

`GET /posts?cursor=` returns `200 { items: Post[], nextCursor }`, newest first, 12 per page.

`POST /posts` body `{ uploadId, description?, tags?, exif? }` returns `201 { post: Post }`.
- `uploadId` must belong to the session user and point to an uploaded JPEG or PNG of 10 MB max.
- `description`: up to 1000 characters. `tags`: array or comma separated string, up to 10 tags.
- `exif`: when present it replaces the extracted EXIF (manual edit). Only whitelisted fields are
  kept; GPS is always dropped. When absent, the automatically extracted EXIF is used.
- The stored image has its EXIF, XMP and other metadata removed (orientation is kept).

`GET /posts/{postId}` returns `200 { post: Post }`. Hidden posts return `404`.

`DELETE /posts/{postId}` sets `visible = false` and returns `204`. Only the author can do it
(`403` otherwise). Hidden posts disappear from the feed, the profile and the detail route.

### Comments

`GET /posts/{postId}/comments?cursor=` returns `200 { items: Comment[], nextCursor }`, oldest
first, 50 per page. `404` if the post is hidden or missing.

`POST /posts/{postId}/comments` body `{ content }` returns `201 { comment: Comment }`.
`content` is 1 to 500 characters (counted by code point). Comments cannot be edited or deleted.
The post author gets a notification unless they commented on their own post.

### Reactions

`PUT /posts/{postId}/reaction` body `{ type }` (`like` | `inspire` | `wow`) returns
`200 { reaction: { type, createdAt, updatedAt }, reactionsCount }`.
- One reaction per user per post, enforced by the database key.
- The first reaction from someone other than the author creates a notification.
- Changing the type updates the counters and never creates another notification.
- Sending the current type again is a no-op. Removing a reaction is not part of the MVP.

### Users (public profile = feed filtered by user)

`GET /users/{username}` returns `200 { user: PublicUser }`.

`GET /users/{username}/posts?cursor=` returns `200 { items: Post[], nextCursor }`, newest first,
12 per page, visible posts only.

### Uploads (direct to S3 with a presigned POST)

`POST /uploads` body `{ contentType, size }` returns
`201 { uploadId, url, fields, maxBytes, expiresAt }`.
- `contentType` must be `image/jpeg` or `image/png`; `size` must be 1 byte to 10 MB.
- The client sends `multipart/form-data` to `url` with every entry of `fields` first and the
  file last under the name `file`. The storage rejects files over 10 MB or with another type.
- The presigned policy expires after 10 minutes.

`GET /uploads/{uploadId}/exif` returns `200 { uploadId, contentType, size, exif, gpsRemoved }`.
The server checks the real file signature (`415` if not JPEG/PNG), the size (`413`), extracts
EXIF and reports whether GPS data was found and discarded. Nothing is published yet.

### Notifications

`GET /notifications?cursor=` returns `200 { items: Notification[], unreadCount, nextCursor }`,
newest first, 20 per page. Only notifications from the last 7 days are returned; expired ones are
filtered at query time (DynamoDB TTL is not exact).

`GET /notifications/unread-count` returns `200 { unreadCount }`.

`POST /notifications/read-all` returns `204`.

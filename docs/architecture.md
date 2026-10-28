# Architecture

## Overview

```
Browser (React SPA, CloudFront)
   |  JSON + Bearer token            multipart POST (presigned)
   v                                         v
API Gateway HTTP API  ------------->  S3 private bucket (uploads/)
   |  one Lambda per route                   |
   v                                         |  read, strip metadata, write posts/
Lambda handlers --> use cases --> ports <----+
                                   |
            +----------------------+----------------------+
            v                      v                      v
        DynamoDB            ElastiCache (Valkey)        SES
   (users, sessions,       (password reset tokens)  (recovery email)
    posts, comments,
    reactions, notifications)

CloudFront (OAC) serves posts/* images from the private bucket.
```

## Backend layers (`apps/api/src`)

The backend follows ports and adapters. Dependencies point inwards only.

| Folder                    | Responsibility                                                                 |
| ------------------------- | ------------------------------------------------------------------------------ |
| `domain/`                 | Pure product rules: validation, EXIF parsing, GPS stripping, notification rules. No I/O. |
| `application/`            | One use case per file (`createPost`, `setReaction`...). Depends on ports only (`ports.js`). |
| `infrastructure/`         | Adapters per port: `dynamodb/`, `redis/`, `aws/` (S3, SES, Secrets Manager), `memory/`, `local/`, `security/`. |
| `bootstrap/container.js`  | Composition root: picks one adapter per port from the configured drivers.      |
| `interfaces/http/`        | Lambda handlers (one file per route), request parsing, auth levels, error mapping. |
| `local/`                  | Dev server that turns HTTP requests into API Gateway events, and the DynamoDB Local table script. |
| `config/`, `lib/`         | Environment loading, errors, clock, ids, cursors, logger with redaction.       |

Drivers are chosen independently with environment variables:

| Port             | Local default          | AWS                         |
| ---------------- | ---------------------- | --------------------------- |
| Repositories     | `memory`               | `dynamodb`                  |
| Password resets  | `memory`               | `redis` (ElastiCache)       |
| Object storage   | `local` (disk)         | `s3`                        |
| Mailer           | `outbox` (.eml files)  | `ses`                       |

The in-memory adapters keep the same guarantees as the AWS ones (atomic comment + counter +
notification, reaction uniqueness, expiring single-use tokens), so use case tests run fast and
without Docker. The integration tests run the real DynamoDB and Redis adapters.

## Key decisions

- **Sessions**: opaque 256-bit tokens. Only their SHA-256 hash is stored (DynamoDB, with `expiresAt`,
  `revoked` and TTL). Every request with a token reads the session with a strongly consistent
  read, so logout takes effect immediately.
- **Password recovery**: token hash in Redis with `EX 3600`, consumed with `GETDEL` (single use).
  A new request invalidates the previous token. The endpoint answers the same for unknown emails
  and never reports delivery errors.
- **Images**: the browser uploads straight to S3 with a presigned POST whose policy enforces the
  content type and the 10 MB limit. The backend then checks the magic bytes, extracts EXIF and
  rewrites the file keeping only rendering data (JFIF, ICC profile, image data) plus the
  orientation tag. EXIF, XMP, IPTC, comments, PNG text chunks and anything after the end of the
  image are dropped, and the result is verified to carry no GPS before it is stored.
- **EXIF**: the displayed EXIF is a whitelist (`packages/shared/src/exif.js`). Manual edits go
  through the same whitelist; GPS fields can not be stored and degree coordinates are rejected.
- **Feed and profile**: sparse GSIs. Hiding a post removes its index keys, so hidden posts never
  appear and pages always contain 12 items. Cursors are validated against the expected partition.
- **Reactions**: the key `POST#id / REACTION#userId` with `attribute_not_exists` enforces one
  reaction per user per post. Counters and notifications change in the same transaction. Changing
  the type is a conditional update, so concurrent requests can not double count.
- **Notifications**: the sort key starts with the creation date, so queries only read the last
  7 days, and a filter on `expiresAt` hides anything DynamoDB TTL has not deleted yet.
- **Logging**: structured JSON. Sensitive keys and email addresses inside messages are redacted.

## Frontend (`apps/web/src`)

| Folder        | Responsibility                                                         |
| ------------- | ---------------------------------------------------------------------- |
| `app/`        | Layout, router, auth provider, route guards                            |
| `features/*/` | One folder per feature (auth, feed, profile, posts, new-post, comments, reactions, notifications) with its screens, components and hooks |
| `components/` | Shared UI (Avatar, Alert, ConfirmDialog, Spinner...)                   |
| `lib/api/`    | Fetch client and one module per API area                               |
| `lib/`        | Session storage, formatters, safe redirects                            |

Five screens, plus the public profile as a variant of the feed:

| Route              | Screen                                      |
| ------------------ | ------------------------------------------- |
| `/auth`            | Sign in, sign up, recovery, reset           |
| `/`                | Feed                                        |
| `/new`             | New post (signed in)                        |
| `/posts/:postId`   | Post detail                                 |
| `/notifications`   | Notifications and sign out (signed in)      |
| `/u/:username`     | Public profile (feed filtered by author)    |

## Known risks

- The single `FEED` partition is accepted for the first version only.
- CloudFront may keep serving a hidden post's image until its cache expires (1 hour `Cache-Control`).
- No rate limiting on login or recovery in the MVP.
- Password reset does not revoke existing sessions ("sign out of all sessions" is outside the MVP).
- The recovery endpoint takes a little longer when the email exists (Redis + SES).
- No moderation: abusive content is an accepted operational risk for the MVP.

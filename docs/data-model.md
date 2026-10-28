# Data model

## DynamoDB (single table)

Table `flash` (local: `flash-local`). Billing on demand. TTL attribute: `ttl` (epoch seconds).

| Key        | Type   |
| ---------- | ------ |
| `pk`       | String |
| `sk`       | String |
| `gsi1pk`   | String |
| `gsi1sk`   | String |
| `gsi2pk`   | String |
| `gsi2sk`   | String |

- `GSI1` (`gsi1pk`, `gsi1sk`), projection ALL: global feed.
- `GSI2` (`gsi2pk`, `gsi2sk`), projection ALL: posts by author (public profile).

Both indexes are sparse: only visible posts carry `gsi*` keys.

| Entity                | `pk`                    | `sk`                            | Notes |
| --------------------- | ----------------------- | ------------------------------- | ----- |
| User                  | `USER#<userId>`         | `PROFILE`                       | `username`, `email`, `birthDate`, `passwordHash`, `createdAt`. Email and birth date are private. |
| Username (unique)     | `USERNAME#<username>`   | `USERNAME`                      | `userId`. Written in the same transaction as the user with `attribute_not_exists`. |
| Email (unique)        | `EMAIL#<email>`         | `EMAIL`                         | `userId`. Same transaction as the user. |
| Session               | `SESSION#<sha256(token)>` | `SESSION`                     | `userId`, `username`, `createdAt`, `expiresAt`, `revoked`, `ttl`. Only the token hash is stored. |
| Post                  | `POST#<postId>`         | `POST`                          | `authorId`, `authorUsername`, `imageKey`, `description`, `tags`, `exif`, `createdAt`, `visible`, `likeCount`, `inspireCount`, `wowCount`, `commentsCount`. Visible posts also have `gsi1pk = FEED`, `gsi1sk = <createdAt>#<postId>`, `gsi2pk = AUTHOR#<authorId>`, `gsi2sk = <createdAt>#<postId>`. |
| Comment               | `POST#<postId>`         | `COMMENT#<createdAt>#<commentId>` | `authorId`, `authorUsername`, `content`, `createdAt`. Queried in ascending order. |
| Reaction              | `POST#<postId>`         | `REACTION#<userId>`             | `type`, `createdAt`, `updatedAt`. The key itself guarantees one reaction per user per post. |
| Notification          | `NOTIF#<recipientId>`   | `<createdAt>#<notificationId>`  | `type`, `actorId`, `actorUsername`, `postId`, `reactionType`, `commentSnippet`, `read`, `createdAt`, `expiresAt`, `ttl`. |

### Access patterns

| Pattern                         | Operation |
| ------------------------------- | --------- |
| Sign up                         | `TransactWriteItems`: put user + username + email, each with `attribute_not_exists(pk)`. |
| Log in                          | `GetItem` username or email item, then `GetItem` user. `PutItem` session. |
| Validate session                | `GetItem` session by token hash; check `revoked = false` and `expiresAt > now`. |
| Log out                         | `UpdateItem` session `SET revoked = true`. |
| Feed page                       | `Query` GSI1 `gsi1pk = FEED`, descending, `Limit 12`, `ExclusiveStartKey` from the cursor. |
| Profile page                    | `Query` GSI2 `gsi2pk = AUTHOR#<id>`, descending, `Limit 12`. |
| Viewer reactions for a page     | `BatchGetItem` of `POST#<id> / REACTION#<viewerId>`. |
| Post detail                     | `GetItem` post; `404` when `visible = false`. |
| Hide post                       | `UpdateItem SET visible = false REMOVE gsi1pk, gsi1sk, gsi2pk, gsi2sk` with condition `authorId = :me`. |
| Comments                        | `Query pk = POST#<id> AND begins_with(sk, COMMENT#)`, ascending. |
| Add comment                     | `TransactWriteItems`: update post `commentsCount + 1` (condition `visible = true`), put comment, put notification when the actor is not the author. |
| First reaction                  | `TransactWriteItems`: put reaction (`attribute_not_exists`), `ADD <type>Count 1` on the post (condition `visible = true`), put notification when the actor is not the author. |
| Change reaction                 | `TransactWriteItems`: update reaction (condition `type = :old`), `ADD <old>Count -1, <new>Count 1`. No notification. |
| Notifications                   | `Query pk = NOTIF#<me> AND sk >= <now - 7 days>`, descending, plus `FilterExpression expiresAt > :now`. |
| Unread count                    | Same query with `read = false`, `Select COUNT`. |
| Mark all read                   | Query unread, then `UpdateItem SET read = true` for each. |

## ElastiCache (Valkey / Redis OSS)

| Key                                 | Value     | TTL    | Purpose |
| ----------------------------------- | --------- | ------ | ------- |
| `flash:pwreset:<sha256(token)>`     | `userId`  | 3600 s | Password recovery token. Consumed with `GETDEL`, so it works once. |
| `flash:pwreset:user:<userId>`       | token hash | 3600 s | Lets a new request invalidate the previous token of the same user. |

## S3

One private bucket. Objects are never public; images are served through CloudFront with
Origin Access Control.

| Prefix                         | Content |
| ------------------------------ | ------- |
| `uploads/<userId>/<uploadId>`  | Raw upload from the presigned POST. Lifecycle rule deletes it after 1 day. |
| `posts/<postId>.<jpg|png>`     | Published image with EXIF, XMP and GPS removed. Served by CloudFront. |

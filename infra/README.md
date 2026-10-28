# Flash infrastructure (AWS SAM)

`template.yaml` describes the whole Flash backend on AWS. Nothing here is deployed automatically:
deploying needs an AWS account and tools that are not installed in this repo (see Prerequisites).

## What the template creates

| Area      | Resources |
| --------- | --------- |
| API       | One HTTP API (API Gateway v2) with CORS and default throttling (50 req/s, burst 100). |
| Compute   | 20 Lambda functions, one per route in `docs/api.md`. Node.js 22, arm64, ESM bundles. |
| IAM       | One IAM role per function with only the actions that route needs. No shared role, no SAM default role. |
| Logs      | One CloudWatch log group per function (`/aws/lambda/flash-<stage>-<function>`), 14 days retention. |
| Data      | DynamoDB single table `flash-<stage>` with `GSI1` (feed) and `GSI2` (posts by author), TTL on `ttl`, on-demand billing, point-in-time recovery, encryption with the AWS managed key. Retained on stack deletion. |
| Cache     | ElastiCache Serverless (Valkey 8) for password recovery tokens, TLS, RBAC user whose password lives in Secrets Manager. |
| Storage   | Private images bucket (`uploads/` for raw uploads, `posts/` for published images), lifecycle rule that deletes `uploads/` after 1 day, CORS for presigned POST uploads from the web origin. Retained on stack deletion. |
| CDN       | CloudFront + Origin Access Control for published images (`posts/*` only). A second CloudFront distribution + private bucket hosts the React SPA, with a CloudFront Function that sends app routes to `index.html`. |
| Network   | Only the two password recovery functions run in the VPC (they need Valkey). One security group for them and one for the cache, which only accepts ports 6379-6380 from the Lambda group. |
| Email     | Uses an existing verified SES identity (not created by the template). |

### Function map

`scripts/functions.mjs` is the source of truth for the function list. Every function is named
`flash-<stage>-<key>` and its code is `dist/<key>/index.mjs`.

| Route | Function key | Handler (apps/api/src/interfaces/http/handlers/) | IAM (besides its own logs) |
| ----- | ------------ | ------------------------------------------------ | -------------------------- |
| POST /auth/register | auth-register | auth/register | DynamoDB PutItem |
| POST /auth/login | auth-login | auth/login | DynamoDB GetItem, PutItem |
| POST /auth/logout | auth-logout | auth/logout | DynamoDB GetItem, UpdateItem |
| GET /auth/me | auth-me | auth/me | DynamoDB GetItem |
| POST /auth/password-recovery | auth-request-password-recovery | auth/requestPasswordRecovery | DynamoDB GetItem; GetSecretValue (Valkey secret); ses:SendEmail (SES identity); VPC ENI |
| POST /auth/password-reset | auth-reset-password | auth/resetPassword | DynamoDB UpdateItem; GetSecretValue (Valkey secret); VPC ENI |
| GET /posts | posts-list-feed | posts/listFeed | DynamoDB GetItem, BatchGetItem; Query on GSI1 |
| POST /posts | posts-create-post | posts/createPost | DynamoDB GetItem, PutItem; S3 GetObject + DeleteObject on `uploads/*`, PutObject on `posts/*` |
| GET /posts/{postId} | posts-get-post | posts/getPost | DynamoDB GetItem |
| DELETE /posts/{postId} | posts-hide-post | posts/hidePost | DynamoDB GetItem, UpdateItem |
| GET /posts/{postId}/comments | comments-list-comments | comments/listComments | DynamoDB GetItem, Query |
| POST /posts/{postId}/comments | comments-add-comment | comments/addComment | DynamoDB GetItem, PutItem, UpdateItem |
| PUT /posts/{postId}/reaction | reactions-set-reaction | reactions/setReaction | DynamoDB GetItem, PutItem, UpdateItem |
| GET /users/{username} | users-get-profile | users/getProfile | DynamoDB GetItem |
| GET /users/{username}/posts | users-list-user-posts | users/listUserPosts | DynamoDB GetItem, BatchGetItem; Query on GSI2 |
| POST /uploads | uploads-create-upload | uploads/createUpload | DynamoDB GetItem; S3 PutObject on `uploads/*` |
| GET /uploads/{uploadId}/exif | uploads-get-upload-exif | uploads/getUploadExif | DynamoDB GetItem; S3 GetObject + DeleteObject on `uploads/*` |
| GET /notifications | notifications-list | notifications/listNotifications | DynamoDB GetItem, Query, BatchGetItem |
| GET /notifications/unread-count | notifications-get-unread-count | notifications/getUnreadCount | DynamoDB GetItem, Query |
| POST /notifications/read-all | notifications-mark-all-read | notifications/markAllRead | DynamoDB GetItem, Query, UpdateItem |

DynamoDB transactions (`TransactWriteItems`) have no IAM action of their own: AWS authorizes each
item operation inside them (`PutItem`, `UpdateItem`, `DeleteItem`, `ConditionCheckItem`), so the
roles only list those. If a handler starts using a separate `ConditionCheck` element, add
`dynamodb:ConditionCheckItem` to that role.

## Prerequisites

- An AWS account and credentials for a user or role allowed to deploy CloudFormation stacks.
- AWS SAM CLI and AWS CLI installed by you (they are not part of this repo).
- Bun (already used by the repo) to bundle the Lambda code.
- A verified SES identity (domain or email). While the account is in the SES sandbox, recipients
  must be verified too.
- A VPC with two or three private subnets in different Availability Zones, each with a route to a
  NAT gateway. The recovery functions reach DynamoDB, Secrets Manager and SES through it.

## Build and deploy

```bash
# 1. Repo root: install dependencies and bundle every handler into infra/dist/<function>/index.mjs
bun install
bun infra/scripts/build-lambdas.mjs

# 2. Deploy from this folder
cd infra
sam validate --lint        # optional, if cfn-lint is available
sam deploy --guided        # first time; later runs can use plain `sam deploy`
```

`sam deploy` zips each `dist/<function>/` folder and uploads it. There is no `sam build` step on
purpose:

- SAM's Node.js builders (including `BuildMethod: esbuild`) run `npm install` inside `apps/api`,
  and npm does not understand the `workspace:*` protocol that bun workspaces use for
  `@flash/shared`. The build would fail.
- `scripts/build-lambdas.mjs` uses Bun's built-in bundler (no extra dependency) and produces one
  self-contained ESM file per function: minified, with linked source maps
  (`NODE_OPTIONS=--enable-source-maps` turns them into readable stack traces).
- Everything is bundled, including AWS SDK v3. The runtime ships its own SDK copy, but its version
  is not pinned and may lack `@aws-sdk/s3-presigned-post`. Bundling deploys the exact versions that
  were tested locally, at the cost of a bigger zip (about 1 to 2 MB per function).

### Web app

```bash
# Repo root. Use the ApiUrl output of the stack.
VITE_API_URL=<ApiUrl> bun run build
aws s3 sync apps/web/dist s3://<WebBucketName> --delete
aws cloudfront create-invalidation --distribution-id <WebDistributionId> --paths "/*"
```

Check `apps/web` for the exact name of the API URL variable if it differs.

## Parameters

| Parameter | Default | Description |
| --------- | ------- | ----------- |
| `Stage` | `dev` | Environment name used in resource names (lowercase, 2 to 16 characters). |
| `WebAppUrl` | empty | Web app origin for CORS and email links (`https://host`, no trailing slash). Empty means the CloudFront web distribution of this stack. |
| `SesFromAddress` | (required) | Sender of password recovery emails. |
| `SesIdentityName` | (required) | Verified SES identity that owns the sender (domain or email). Used to build the IAM resource ARN. |
| `VpcId` | (required) | VPC for ElastiCache and the recovery functions. |
| `PrivateSubnetIds` | (required) | Private subnets (2 or 3 AZs) with NAT egress. |
| `BcryptCost` | `12` | bcrypt cost factor (10 to 14). |

## Environment variables set on the functions

| Variable | Functions | Value |
| -------- | --------- | ----- |
| `NODE_OPTIONS` | all | `--enable-source-maps` |
| `DB_DRIVER`, `STORAGE_DRIVER`, `MAIL_DRIVER` | all | `dynamodb`, `s3`, `ses` |
| `DYNAMODB_TABLE`, `S3_BUCKET` | all | Table and images bucket names |
| `IMAGES_BASE_URL` | all | `https://<images CloudFront domain>` |
| `APP_BASE_URL`, `CORS_ORIGIN` | all | Web app origin |
| `BCRYPT_COST` | all | `BcryptCost` parameter |
| `CACHE_DRIVER`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_TLS`, `REDIS_SECRET_ARN` | recovery functions | `redis`, Valkey endpoint and port, `true`, secret ARN (JSON with `username` and `password`) |
| `SES_FROM_ADDRESS` | request recovery | `SesFromAddress` parameter |

## IAM exceptions (the only wildcards)

The project policy forbids `*` in IAM. No Allow statement uses a wildcard action. These are the only
wildcards in resources, and why each is unavoidable:

1. **`Resource: '*'` for the VPC network interface actions** (`ec2:CreateNetworkInterface`,
   `DescribeNetworkInterfaces`, `DescribeSubnets`, `DeleteNetworkInterface`,
   `AssignPrivateIpAddresses`, `UnassignPrivateIpAddresses`), only on the two recovery roles.
   The `Describe*` actions do not support resource-level permissions at all, and Lambda checks the
   other actions against network interfaces it creates at runtime, whose IDs do not exist when the
   policy is written. These are the actions of the AWS managed `AWSLambdaVPCAccessExecutionRole`
   policy, which also uses `*`.
2. **Log streams `log-group:/aws/lambda/flash-<stage>-<function>:*`**: the `Arn` attribute of a
   log group ends in `:*`, meaning "the streams of this one log group". Stream names are created
   by Lambda at runtime.
3. **S3 object prefixes `uploads/*` and `posts/*`**: object keys (`uploads/<userId>/<uploadId>`,
   `posts/<postId>.<ext>`) are generated at runtime, so the prefix is the narrowest possible scope.
   The same applies to the CloudFront read grant on `posts/*` and on the web bucket.
4. **`DenyInsecureTransport` bucket statements** use `Principal: '*'` and `Action: 's3:*'`, but
   they are Deny statements: they block plain HTTP for everyone and grant nothing.

Notes for the API code:

- No role has `s3:ListBucket`, so `GetObject` on a key that does not exist returns `403
  AccessDenied` instead of `404 NoSuchKey`. Treat both as "upload not found".
- Possible extra hardening later: `dynamodb:LeadingKeys` conditions per role (for example only
  `SESSION#*` and `POST#*` partitions for `posts-get-post`). Left out for now to avoid breaking
  handlers while the key usage settles.
- X-Ray tracing is off on purpose: `xray:PutTraceSegments` only works with `Resource: '*'`.

## Costs to keep in mind

- **NAT gateway**: billed per hour and per GB in each AZ where you have one. It is usually the
  biggest fixed cost of this stack. Alternative: VPC endpoints (DynamoDB gateway endpoint is free;
  Secrets Manager and SES interface endpoints are billed per hour), which would also need route
  table IDs as parameters.
- **ElastiCache Serverless**: billed for stored data (with a minimum per hour, check current Valkey
  pricing) plus ECPUs. The template caps usage at 1 GB and 1000 ECPU/s.
- CloudFront, DynamoDB on demand, point-in-time recovery, Secrets Manager (per secret per month)
  and CloudWatch Logs are pay per use.

## Known risks

- **Single `FEED` partition** (`GSI1`): accepted for the first version only. A large
  community would need a sharded or time-bucketed feed key.
- **Hidden posts and CloudFront cache**: hiding a post removes it from the API, but its image URL
  keeps working until the CloudFront cache expires (managed CachingOptimized policy, up to 24 hours
  by default) or until it is invalidated. The object stays in S3 (logical deletion).
- **SES sandbox**: new accounts can only send to verified recipients and at low rates. Request
  production access before real use. In the sandbox, if `SendEmail` is denied for a verified
  recipient, add that recipient identity ARN to the `SendRecoveryEmail` statement.
- **Retained resources**: the table and images bucket survive `sam delete`. Because their names are
  fixed per stage (`flash-<stage>`), redeploying the same stage after a delete fails until they are
  removed by hand. Empty the web bucket before deleting the stack.
- **Password reset does not revoke existing sessions**: there is no session index per user, and
  "sign out of all sessions" is outside the MVP.

## Properties to verify on the first deploy

These follow the documented CloudFormation shapes, but were not deployed from this repo:

- `Engine: valkey` on `AWS::ElastiCache::User` and `AWS::ElastiCache::UserGroup`, and whether a
  Valkey user group still requires the disabled `default` user (kept because it is required for
  Redis OSS and harmless otherwise).
- The access strings `off -@all` (default user) and
  `on ~flash:* -@all +@read +@write +@connection -@dangerous` (app user). If the client fails on
  connect, check whether it sends a command outside these categories (for example `CLIENT SETINFO`).
- `CacheUsageLimits` minimums for Valkey Serverless (1 GB data, 1000 ECPU/s).
- Intrinsic functions inside `CorsConfiguration` of `AWS::Serverless::HttpApi`. API Gateway
  answers preflight requests and sets CORS headers itself, overriding the ones the handlers send.
- `LoggingConfig.LogGroup` on `AWS::Serverless::Function` (needs a recent SAM transform, available
  since late 2023).

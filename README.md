# Flash

A photography community platform. Share photos together with their technical EXIF data,
comment, react, and get notified when people engage with your work.

Built as a serverless application on AWS: a React single page app in front of Node.js Lambda
functions, with DynamoDB and ElastiCache for data.

## Features

- **Publishing**: JPEG or PNG uploads up to 10 MB, sent directly to S3 with presigned requests.
  Description, tags and EXIF are optional.
- **EXIF with privacy**: camera, lens and exposure data are extracted automatically and can be
  edited before publishing. GPS and every other metadata block are removed from the image file
  before it is stored, so locations are never published.
- **Feed and profiles**: public, newest first, 12 posts per page with cursor pagination. Each
  photographer has a public profile with their own posts.
- **Comments and reactions**: comments up to 500 characters in chronological order; one reaction
  per user per post (like, inspire or wow) that can be changed at any time.
- **Notifications**: comments and first reactions from other people, unread counter, mark all as
  read, automatic expiry after 7 days.
- **Accounts**: sign up with email, date of birth, username and password (bcrypt). Sessions last
  24 hours, are validated on every request and are revoked on the server at logout. Password
  recovery uses single-use links that expire in one hour.
- **Moderation by the author**: authors can hide their own posts, which removes them from every
  public view.

## Tech stack

| Layer    | Technology                                                                     |
| -------- | ------------------------------------------------------------------------------ |
| Frontend | React 19, React Router, Vite, Tailwind CSS                                     |
| Backend  | Node.js 22 on AWS Lambda behind API Gateway (HTTP API), one function per route |
| Data     | Amazon DynamoDB (single-table design), Amazon ElastiCache (Valkey)             |
| Storage  | Private S3 bucket served through CloudFront                                    |
| Services | Amazon SES, AWS Secrets Manager, IAM roles scoped per function                 |
| Tooling  | bun workspaces, ESLint, Prettier, Node test runner, bun test, AWS SAM          |

## Architecture

```
React SPA ──► API Gateway ──► Lambda (one per route) ──► DynamoDB
    │                                │                 ├► ElastiCache (reset tokens)
    │                                │                 └► SES (emails)
    └─ presigned upload ──► S3 ◄─────┘ metadata stripped, published under posts/
                             └──► CloudFront ──► images
```

The backend follows a ports and adapters structure. Business rules and use cases have no AWS
dependencies; each port has an AWS adapter and an in-memory or local adapter, selected through
environment variables. This keeps the test suite fast and lets the whole stack run locally
without an AWS account.

More detail in [`docs/architecture.md`](docs/architecture.md), the API contract in
[`docs/api.md`](docs/api.md) and the DynamoDB design in [`docs/data-model.md`](docs/data-model.md).

## Getting started

### Requirements

- [bun](https://bun.sh) 1.4 or newer
- Node.js 22 or newer
- Docker (optional, only to run DynamoDB Local and Valkey)

### Run locally

```bash
bun install
bun run dev
```

- Web app: http://localhost:5173
- API: http://localhost:3001

No configuration is needed. By default the API keeps data in memory (persisted to
`apps/api/.local/`), stores images on disk and writes outgoing emails to
`apps/api/.local/outbox/` as `.eml` files, where password reset links can be opened.

### Run against DynamoDB and Valkey

```bash
bun run docker:up     # DynamoDB Local + Valkey
bun run dev:docker    # creates the table and starts the API against them
bun run dev:web       # in a second terminal
```

## Scripts

| Command                    | Description                                          |
| -------------------------- | ---------------------------------------------------- |
| `bun run dev`              | Start the API and the web app                        |
| `bun run dev:api`          | Start only the API                                   |
| `bun run dev:web`          | Start only the web app                               |
| `bun run dev:docker`       | Start the API against DynamoDB Local and Valkey      |
| `bun run test`             | Run the test suites of every package                 |
| `bun run test:integration` | Run the DynamoDB and Redis adapter tests (Docker)    |
| `bun run lint`             | Lint the whole repository                            |
| `bun run format`           | Format the whole repository                          |
| `bun run build`            | Build the web app for production                     |
| `bun run infra:build`      | Bundle every Lambda function for deployment          |

## Project structure

```
apps/
├── api/                    Backend
│   ├── src/domain/         Business rules, EXIF parsing, metadata stripping
│   ├── src/application/    Use cases and ports
│   ├── src/infrastructure/ DynamoDB, Redis, S3, SES, Secrets Manager, memory and local adapters
│   ├── src/interfaces/http Lambda handlers (one file per route)
│   ├── src/local/          Local server that runs the handlers as API Gateway would
│   ├── test/               Unit, use case and HTTP tests
│   └── test-integration/   Adapter tests against DynamoDB Local and Valkey
└── web/                    Frontend
    └── src/
        ├── app/            Layout, routing, session provider
        ├── features/       auth, feed, profile, posts, new-post, comments, reactions, notifications
        ├── components/     Shared UI components
        └── lib/            API client, formatting, session storage
packages/
└── shared/                 Limits and validation rules shared by the API and the web app
infra/                      AWS SAM template and deployment scripts
docs/                       Architecture, API contract and data model
```

## Testing

```bash
bun run test               # all packages
bun run test:integration   # requires bun run docker:up
```

The suites cover the critical rules end to end: GPS removal from uploaded images (including
manually edited EXIF), session rejection after logout and after 24 hours, single-use password
reset tokens, one reaction per user per post under concurrent requests, notification expiry,
and hidden posts never being returned by the feed, profiles or detail routes.

## Deployment

The `infra/` folder contains an AWS SAM template that provisions the API, the Lambda functions
(each with its own least-privilege IAM role), DynamoDB, S3, CloudFront, ElastiCache and the
Secrets Manager secret. See [`infra/README.md`](infra/README.md) for prerequisites, parameters
and step by step instructions.

```bash
bun run infra:build
cd infra && sam deploy --guided
```

## Configuration

| File                    | Purpose                                                    |
| ----------------------- | ---------------------------------------------------------- |
| `apps/api/.env`         | Optional API overrides, see `apps/api/.env.example`        |
| `apps/web/.env.local`   | Optional web overrides, see `apps/web/.env.example`        |

In AWS, configuration comes from the SAM template and secrets from Secrets Manager. No secret
is stored in the repository.

## Commit convention

Commits follow [Conventional Commits](https://www.conventionalcommits.org/) and are validated
by commitlint. A pre-commit hook runs lint and the test suites.

```
feat(api): add cursor pagination to the feed
fix(web): keep reaction counters in sync
```

Scopes: `repo`, `api`, `web`, `shared`, `infra`, `docs`, `deps`.

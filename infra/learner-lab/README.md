# Deploying to an AWS Academy Learner Lab

AWS Academy Learner Lab accounts can not create IAM roles and do not offer every service the
full template uses. These scripts deploy a reduced version of Flash that works inside the lab
with the AWS CLI. For a regular AWS account, use the SAM template in [`../README.md`](../README.md).

## What gets created

| Piece       | Service                                                                    |
| ----------- | -------------------------------------------------------------------------- |
| Web app     | S3 static website (`flash-lab-web-<account>`)                              |
| API         | One Lambda (`flash-lab-api`, Node.js 22) with a function URL               |
| Permissions | The lab's existing `LabRole`                                               |
| Data        | DynamoDB table `flash-lab` with `GSI1`, `GSI2` and TTL                     |
| Images      | S3 bucket `flash-lab-images-<account>`; only `posts/` is publicly readable |

The single Lambda (`apps/api/src/interfaces/http/lambdaRouter.js`) routes every request to the
same handlers that API Gateway invokes one per route in the full template.

## Differences from the full architecture

| Full template                                  | Learner Lab                                         |
| ---------------------------------------------- | --------------------------------------------------- |
| 20 Lambdas, one least-privilege role each      | 1 Lambda with `LabRole` (role creation is blocked)  |
| API Gateway HTTP API                           | Lambda function URL                                 |
| Images private, served through CloudFront      | `posts/` served directly from S3                    |
| Web app on CloudFront over HTTPS               | S3 static website over HTTP                         |
| Password reset tokens in ElastiCache (Valkey)  | Lambda memory, so links may not survive a cold start |
| Recovery emails through SES                    | Not sent (SES is not available in the lab)          |

## Requirements

- AWS CLI v2 and bun installed.
- The lab started (**Start Lab**, green indicator).
- Lab credentials: **AWS Details** > **AWS CLI** > **Show**, then paste the whole block
  (`[default]`, `aws_access_key_id`, `aws_secret_access_key`, `aws_session_token`) into
  `~/.aws/credentials` (Windows: `C:\Users\<you>\.aws\credentials`). They expire with the lab
  session, so paste them again after every restart.

## Deploy

```bash
bun install
bun run deploy:lab
```

The script is safe to run again: it updates the code and configuration of what already exists.
It prints the web app and API URLs at the end.

## Remove everything

```bash
bun run teardown:lab
```

Deletes the Lambda and its function URL, both buckets (with their content), the DynamoDB table
and the Lambda log group.

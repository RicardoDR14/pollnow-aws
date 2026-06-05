# PollNow - AWS Deployment Guide

This guide summarizes the AWS resources and configuration needed to deploy the PollNow backend and connect it to the Netlify frontend.

## DynamoDB

Create three DynamoDB tables:

| Table | Primary key | Purpose |
|---|---|---|
| `users` | `userId` | Stores registered users, email addresses, password hashes and notification subscription state. |
| `polls` | `pollId` | Stores poll metadata, owner data, options, closing date, status and optional image metadata. |
| `votes` | `voteId` | Stores anonymous votes with `pollId`, `voterId`, selected option and timestamp. |

The Lambda functions also query by attributes such as `ownerId`, `pollId` and `voterId`. The exact indexes should match the deployed Lambda query patterns.

## S3

Use one S3 bucket for uploaded poll images and generated result exports.

| Prefix | Usage |
|---|---|
| `banners/` | Optional poll images uploaded during poll creation. |
| `results/` | CSV files generated when expired polls are processed. |

Poll images must be readable by the frontend. In this project, image URLs are stored directly in DynamoDB and displayed by the React application, so the bucket/object policy must allow public read access for the uploaded banner objects.

## SNS

Create one SNS topic:

```text
pollnow-notifications
```

This topic is used for two notification types:

- Admin action notifications when polls are created, edited, closed or deleted.
- Per-owner result notifications when a poll expires and results are generated.

Per-owner subscriptions use an SNS filter policy based on the poll owner:

```json
{
  "ownerId": ["<userId>"]
}
```

The `checkExpired` Lambda publishes result notifications with `ownerId` as a message attribute so only the matching owner subscription receives the email.

## EventBridge

Create an EventBridge scheduled rule:

| Field | Value |
|---|---|
| Rule name | `pollnow-check-expired` |
| Schedule | `rate(5 minutes)` |
| Target | `checkExpired` Lambda |

The rule must have permission to invoke the `checkExpired` Lambda.

## Lambda Functions

Deploy the following Lambda functions from `backend/lambdas/`:

| Lambda | Purpose |
|---|---|
| `registerUser` | Register a new user. |
| `loginUser` | Authenticate a user and return identity/notification state. |
| `listPolls` | List polls owned by the authenticated user. |
| `createPoll` | Create a poll, upload optional image and publish admin notification. |
| `getPoll` | Return public poll data. |
| `updatePoll` | Update a poll owned by the authenticated user. |
| `deletePoll` | Delete a poll and its votes. |
| `closePoll` | Close a poll manually. |
| `castVote` | Create or update an anonymous vote. |
| `getResults` | Return poll result totals and percentages. |
| `toggleNotifications` | Subscribe or unsubscribe a user from result notifications. |
| `getNotificationStatus` | Return notification state for the authenticated user. |
| `checkExpired` | Process expired polls, export CSV results, send owner notifications and mark polls as notified. |

Each Lambda must have IAM permissions only for the AWS resources it needs, including DynamoDB table access, S3 access for image/result operations, SNS publish/subscribe operations and CloudWatch logging.

## API Gateway Routes

Create an HTTP API with CORS enabled and route each endpoint to the matching Lambda.

| Method | Route | Lambda | Authentication |
|---|---|---|---|
| `POST` | `/register` | `registerUser` | Public |
| `POST` | `/login` | `loginUser` | Public |
| `GET` | `/polls` | `listPolls` | `x-user-id` header |
| `POST` | `/polls` | `createPoll` | `x-user-id` header |
| `GET` | `/polls/{pollId}` | `getPoll` | Public |
| `PUT` | `/polls/{pollId}` | `updatePoll` | `x-user-id` header |
| `DELETE` | `/polls/{pollId}` | `deletePoll` | `x-user-id` header |
| `PATCH` | `/polls/{pollId}/close` | `closePoll` | `x-user-id` header |
| `POST` | `/polls/{pollId}/vote` | `castVote` | Public |
| `GET` | `/polls/{pollId}/results` | `getResults` | Public |
| `POST` | `/notifications` | `toggleNotifications` | `x-user-id` header |
| `GET` | `/notifications` | `getNotificationStatus` | `x-user-id` header |

## Common Environment Variables

Configure the relevant variables on the Lambda functions:

| Variable | Used for |
|---|---|
| `USERS_TABLE` | DynamoDB users table name. |
| `POLLS_TABLE` | DynamoDB polls table name. |
| `VOTES_TABLE` | DynamoDB votes table name. |
| `S3_BUCKET` | S3 bucket used for poll images and result CSV exports. |
| `SNS_TOPIC_ARN` | ARN of the `pollnow-notifications` SNS topic. |
| `SNS_REGION` | AWS region used by SNS clients. Defaults to `us-east-1` in the code when not set. |
| `FRONTEND_URL` | Public frontend URL used in notification links. |

## CORS Requirements

API Gateway must allow requests from the deployed Netlify frontend and local development origin when needed.

Recommended CORS configuration:

- Allowed origins: `https://pollnow.netlify.app` and `http://localhost:3000` for local testing.
- Allowed methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`.
- Allowed headers: `Content-Type`, `x-user-id`.

## Netlify Configuration

Set the frontend environment variable in Netlify:

```text
REACT_APP_API_URL=<API Gateway base URL>
```

The React app also requires the SPA redirect rule in `frontend/public/_redirects`:

```text
/*    /index.html   200
```

This allows direct access to routes such as `/vote/{pollId}`, `/results/{pollId}` and `/share/{pollId}`.

## Deployment Order

1. Create the DynamoDB tables: `users`, `polls` and `votes`.
2. Create the S3 bucket and configure access for `banners/` images and `results/` exports.
3. Create the SNS topic `pollnow-notifications`.
4. Deploy all Lambda functions with the required environment variables.
5. Attach IAM permissions for DynamoDB, S3, SNS and CloudWatch logs.
6. Create the API Gateway HTTP API routes and integrations.
7. Configure API Gateway CORS.
8. Create the EventBridge rule `pollnow-check-expired` with `rate(5 minutes)` and target `checkExpired`.
9. Grant EventBridge permission to invoke `checkExpired`.
10. Configure Netlify with `REACT_APP_API_URL`.
11. Deploy the React frontend to Netlify.
12. Run the final checklist in [`04-final-test-checklist.md`](04-final-test-checklist.md).

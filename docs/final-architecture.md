# PollNow — Final Architecture

## Overview

PollNow is a serverless web application for creating, sharing and voting in
online polls. The frontend is hosted on Netlify; the backend runs entirely on
AWS managed services.

---

## High-level architecture

```text
                ┌─────────────────────┐
                │     User Browser     │
                └──────────┬──────────┘
                           │
                           ▼
                ┌─────────────────────┐
                │   Netlify Frontend   │
                │      React App       │
                └──────────┬──────────┘
                           │ HTTPS
                           ▼
                ┌─────────────────────┐
                │   API Gateway        │
                │   HTTP API Routes    │
                └──────────┬──────────┘
                           │
                           ▼
                ┌─────────────────────┐
                │     AWS Lambda       │
                │ Backend Functions    │
                └──────┬───────┬──────┘
                       │       │
        ┌──────────────┘       └──────────────┐
        ▼                                     ▼
┌─────────────────┐                  ┌─────────────────┐
│    DynamoDB     │                  │       S3         │
│ users/polls/    │                  │ images / CSVs    │
│ votes           │                  └─────────────────┘
└─────────────────┘
        │
        ▼
┌─────────────────┐
│       SNS       │
│ Admin broadcast │
│ + per-owner     │
│ result emails   │
└─────────────────┘

┌─────────────────┐
│  EventBridge    │
│ rate(5 minutes) │
└────────┬────────┘
         ▼
┌─────────────────┐
│  checkExpired   │
│     Lambda      │
└─────────────────┘
```

---

## Frontend

React application deployed on Netlify.

| Route | Access | Purpose |
|---|---|---|
| `/` | Private | Dashboard — manage polls, toggle notifications |
| `/login` | Public | Login |
| `/register` | Public | Registration |
| `/vote/{pollId}` | Public | Anonymous voting |
| `/results/{pollId}` | Public | Poll results with chart |
| `/share/{pollId}` | Public | QR Code share page |

---

## API Gateway (HTTP API)

| Method | Route | Lambda | Auth |
|---|---|---|---|
| `POST` | `/register` | `registerUser` | — |
| `POST` | `/login` | `loginUser` | — |
| `GET` | `/polls` | `listPolls` | x-user-id |
| `POST` | `/polls` | `createPoll` | x-user-id |
| `GET` | `/polls/{pollId}` | `getPoll` | — |
| `PUT` | `/polls/{pollId}` | `updatePoll` | x-user-id |
| `DELETE` | `/polls/{pollId}` | `deletePoll` | x-user-id |
| `PATCH` | `/polls/{pollId}/close` | `closePoll` | x-user-id |
| `POST` | `/polls/{pollId}/vote` | `castVote` | — |
| `GET` | `/polls/{pollId}/results` | `getResults` | — |
| `POST` | `/notifications` | `toggleNotifications` | x-user-id |
| `GET` | `/notifications` | `getNotificationStatus` | x-user-id |

---

## Lambda functions

| Lambda | Responsibility |
|---|---|
| `registerUser` | Create user account |
| `loginUser` | Authenticate; return `notificationStatus` |
| `createPoll` | Create poll; resolve owner email from `users` table; upload optional image to S3; publish admin SNS notification |
| `listPolls` | Return polls owned by authenticated user |
| `getPoll` | Return public poll data |
| `updatePoll` | Edit poll if requester is owner; publish admin SNS notification |
| `deletePoll` | Delete poll and its votes if requester is owner; publish admin SNS notification |
| `closePoll` | Close poll manually; publish admin SNS notification |
| `castVote` | Create or update vote |
| `getResults` | Calculate and return results |
| `checkExpired` | Process expired polls: aggregate votes, export CSV to S3, publish result email via SNS with `ownerId` MessageAttribute, mark as `notified` |
| `toggleNotifications` | Subscribe / unsubscribe authenticated user to SNS topic with filter policy `{ ownerId: [userId] }` |
| `getNotificationStatus` | Return current subscription state (`off` / `pending` / `on`) |

---

## DynamoDB

| Table | Key | Notable attributes |
|---|---|---|
| `users` | `userId` | `username`, `email`, `passwordHash`, `createdAt`, `notificationSubArn`, `notificationsEnabled` |
| `polls` | `pollId` | `ownerId`, `ownerEmail`, `title`, `description`, `options`, `closesAt`, `status`, `imageUrl`, `imageKey`, `imageContentType`, `createdAt` |
| `votes` | `voteId` | `pollId`, `voterId`, `option`, `createdAt` |

`notificationSubArn` and `notificationsEnabled` are optional attributes on `users` — absent on accounts created before phase 9, treated as `off`.

Poll `status` values: `open` → `closed` → `notified`.

---

## S3

One bucket used for two purposes:

| Prefix | Content |
|---|---|
| `banners/<pollId>.<ext>` | Optional poll images (JPG / PNG / WEBP, max 1.5 MB) |
| `results/<pollId>.csv` | Result CSVs exported by `checkExpired` |

Images require public read access for the frontend to display them.

---

## SNS topic: `pollnow-notifications`

Two types of messages published to the same topic:

| Message type | Publisher | Subject | MessageAttribute |
|---|---|---|---|
| Admin action | `createPoll`, `updatePoll`, `closePoll`, `deletePoll` | e.g. `PollNow — Nova sondagem criada` | none |
| Poll results | `checkExpired` | `Sondagem "<title>" fechou!` | `ownerId: StringValue` |

Two types of subscribers:

| Subscriber | Filter policy | Receives |
|---|---|---|
| Admin email(s) | none | all messages |
| Per-owner email | `{ "ownerId": ["<userId>"] }` | only results for their polls |

Per-owner subscriptions are created/removed via the dashboard toggle (phase 9).

---

## EventBridge

| Field | Value |
|---|---|
| Rule name | `pollnow-check-expired` |
| Schedule | `rate(5 minutes)` |
| Target | `checkExpired` Lambda |

---

## CloudWatch

All Lambda functions emit logs to `/aws/lambda/<name>`. Key log patterns:

| Pattern | Meaning |
|---|---|
| `SNS publish: sondagem ... \| ownerId=...` | Result email published |
| `Sondagem ... encerrada e marcada como notified` | Poll processed |
| `SNS_TOPIC_ARN not configured. Notification skipped.` | Missing env var |

---

## Security model

Authentication uses `x-user-id` header (userId from login response stored in
localStorage). Actions on polls validate that `ownerId === x-user-id`.

**Voting is anonymous** — no authentication required. Vote identity is
browser-session-based (voterId in localStorage).

---

## Known limitations

- Authentication is custom (not Amazon Cognito).
- Image editing after poll creation is not supported.
- Notification status stays `pending` in the UI after confirmation until the user
  re-logs in (DynamoDB `notificationSubArn` is not updated automatically when
  the SNS subscription is confirmed).
- If a user already has an SNS subscription from a previous session (or created
  manually) but DynamoDB has no matching `notificationSubArn`, toggling on
  returns a 409 conflict. Resolution: delete the old SNS subscription and
  toggle again.
- Public S3 image access depends on bucket/object configuration.
- No WebSocket real-time updates (results page polls the API).
- Vote identity is browser-based, not account-based.

# Runbook — PollNow Owner Notifications (SNS Per-User Subscription)

This runbook supersedes `RUNBOOK-ses-email-notifications.md`.

Steps tagged **[CLAUDE CODE]** are already applied to the repo.
Steps tagged **[MANUAL / AWS]** require action in the AWS Console or CLI.

---

## Step 1 — [CLAUDE CODE] `registerUser` — revert SES

Simple registration, no SES calls. Returns `userId`, `username`, `email`,
`createdAt`. Env var required: `USERS_TABLE`.

File: `backend/lambdas/registerUser/index.mjs` ✓ applied

---

## Step 2 — [CLAUDE CODE] `loginUser` — return notificationStatus

Authenticates the user and checks the stored `notificationSubArn` against SNS
to return `notificationStatus` (off | pending | on).
Env vars: `USERS_TABLE`, `SNS_REGION`, `SNS_TOPIC_ARN`.

File: `backend/lambdas/loginUser/index.mjs` ✓ applied

---

## Step 3 — [CLAUDE CODE] `createPoll` — ownerEmail from users table

Unchanged from phase-9 SES branch. Resolves owner email from `USERS_TABLE`.
No per-poll notification email field.

File: `backend/lambdas/createPoll/index.mjs` ✓ applied

---

## Step 4 — [CLAUDE CODE] `checkExpired` — SNS publish with ownerId attribute

Publishes result emails to the SNS topic with
`MessageAttributes.ownerId = poll.ownerId`. SNS routes to the matching
per-owner subscriber. Keeps CSV→S3 and `status→notified`.
Env vars: `POLLS_TABLE`, `VOTES_TABLE`, `S3_BUCKET`, `SNS_REGION`, `SNS_TOPIC_ARN`.

File: `backend/lambdas/checkExpired/index.mjs` ✓ applied

---

## Step 5 — [CLAUDE CODE] New lambda: `toggleNotifications`

Subscribe / unsubscribe the authenticated user to the SNS topic with a filter
policy `{ ownerId: [userId] }`. Stores `notificationSubArn` on the user item.
Env vars: `USERS_TABLE`, `SNS_REGION`, `SNS_TOPIC_ARN`.

File: `backend/lambdas/toggleNotifications/index.mjs` ✓ applied

---

## Step 6 — [CLAUDE CODE] New lambda: `getNotificationStatus`

Returns the current `notificationStatus` (off | pending | on) for the
authenticated user by reading the stored ARN and optionally calling
`sns:GetSubscriptionAttributes`.
Env vars: `USERS_TABLE`, `SNS_REGION`, `SNS_TOPIC_ARN`.

File: `backend/lambdas/getNotificationStatus/index.mjs` ✓ applied

---

## Step 7 — [CLAUDE CODE] Frontend: notification toggle card

Adds a notification settings card to `Home.jsx` showing the 3 states and
the toggle/verify/cancel buttons. Removes the SES banner.

File: `frontend/src/pages/Home.jsx` ✓ applied

---

## Step 8 — [MANUAL / AWS] Set environment variables

### `registerUser`

| Key | Value |
|---|---|
| `USERS_TABLE` | `users` |

(Remove `SES_REGION` if previously set.)

### `loginUser`

| Key | Value |
|---|---|
| `USERS_TABLE` | `users` |
| `SNS_REGION` | `us-east-1` |
| `SNS_TOPIC_ARN` | `arn:aws:sns:us-east-1:ACCOUNT_ID:pollnow-notifications` |

(Remove `SES_REGION` if previously set.)

### `createPoll`

Keep existing vars. Confirm `USERS_TABLE=users` is present.

### `checkExpired`

| Key | Value |
|---|---|
| `POLLS_TABLE` | `polls` |
| `VOTES_TABLE` | `votes` |
| `S3_BUCKET` | existing bucket name |
| `SNS_REGION` | `us-east-1` |
| `SNS_TOPIC_ARN` | `arn:aws:sns:us-east-1:ACCOUNT_ID:pollnow-notifications` |

Remove `SES_REGION` and `SES_FROM_ADDRESS` if previously set.

### `toggleNotifications` (new lambda)

| Key | Value |
|---|---|
| `USERS_TABLE` | `users` |
| `SNS_REGION` | `us-east-1` |
| `SNS_TOPIC_ARN` | `arn:aws:sns:us-east-1:ACCOUNT_ID:pollnow-notifications` |

### `getNotificationStatus` (new lambda)

| Key | Value |
|---|---|
| `USERS_TABLE` | `users` |
| `SNS_REGION` | `us-east-1` |
| `SNS_TOPIC_ARN` | `arn:aws:sns:us-east-1:ACCOUNT_ID:pollnow-notifications` |

---

## Step 9 — [MANUAL / AWS] IAM — add SNS actions to LabRole

If LabRole does not already have these actions, add them:

| Action | Lambda |
|---|---|
| `sns:Subscribe` | `toggleNotifications` |
| `sns:Unsubscribe` | `toggleNotifications` |
| `sns:GetSubscriptionAttributes` | `loginUser`, `getNotificationStatus` |

`sns:Publish` is already present for the existing lambdas.

---

## Step 10 — [MANUAL / AWS] Create the two new Lambda functions

For each new lambda (`toggleNotifications`, `getNotificationStatus`):

1. AWS Console → Lambda → Create function → Author from scratch
2. Name: `toggleNotifications` (or `getNotificationStatus`)
3. Runtime: Node.js 22.x (or latest available)
4. Execution role: use existing `LabRole`
5. Create function → paste the code from the matching `index.mjs` → Deploy
6. Set environment variables (Step 8)

---

## Step 11 — [MANUAL / AWS] Add API Gateway routes

In the existing API Gateway (HTTP API):

| Method | Route | Lambda integration |
|---|---|---|
| `POST` | `/notifications` | `toggleNotifications` |
| `GET` | `/notifications` | `getNotificationStatus` |
| `OPTIONS` | `/notifications` | (handled by CORS config or lambda) |

Enable CORS on `/notifications` (same settings as existing routes — allow
`*` origin, allow `Content-Type` and `x-user-id` headers).

Deploy the API stage after adding the routes.

---

## Step 12 — [MANUAL / AWS] Deploy updated lambdas

Open each lambda in the console, paste the file from the repo, click Deploy:

| Lambda | File |
|---|---|
| `registerUser` | `backend/lambdas/registerUser/index.mjs` |
| `loginUser` | `backend/lambdas/loginUser/index.mjs` |
| `checkExpired` | `backend/lambdas/checkExpired/index.mjs` |

(`createPoll` only needs redeployment if the code changed since last deploy.)

---

## Step 13 — [MANUAL / AWS] Confirm EventBridge trigger for checkExpired

```bash
aws lambda get-policy --function-name checkExpired
```

If empty:

```bash
aws lambda add-permission \
  --function-name checkExpired \
  --statement-id eventbridge-invoke \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn arn:aws:events:us-east-1:ACCOUNT_ID:rule/pollnow-check-expired
```

---

## Step 14 — [MANUAL] End-to-end test

See `docs/owner-notifications-sns.md` → Tests section.

---

## Combined checklist

Repo (Claude Code — already applied):

- [x] `registerUser` reverted (no SES).
- [x] `loginUser` returns `notificationStatus`.
- [x] `checkExpired` publishes with `MessageAttribute ownerId`.
- [x] `toggleNotifications` lambda created.
- [x] `getNotificationStatus` lambda created.
- [x] `Home.jsx` notification toggle card added, SES banner removed.

AWS (manual):

- [ ] Env vars set on all 6 lambdas.
- [ ] `SNS_REGION` / `SES_REGION` cleanup done on `registerUser`, `loginUser`, `checkExpired`.
- [ ] LabRole has `sns:Subscribe`, `sns:Unsubscribe`, `sns:GetSubscriptionAttributes`.
- [ ] `toggleNotifications` lambda created and deployed.
- [ ] `getNotificationStatus` lambda created and deployed.
- [ ] API Gateway routes `POST /notifications` and `GET /notifications` created.
- [ ] API stage redeployed.
- [ ] `registerUser`, `loginUser`, `checkExpired` redeployed.
- [ ] EventBridge permission confirmed for `checkExpired`.
- [ ] Activate toggle → SNS confirmation email arrives → confirm → status "on".
- [ ] Close a poll → owner receives result email → other users do not.
- [ ] Deactivate toggle → `sns:Unsubscribe` called → stop receiving emails.
- [ ] Voting, in-app results, admin SNS notifications all still work.

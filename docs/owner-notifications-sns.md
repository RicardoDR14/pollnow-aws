# Owner Notifications via SNS (Per-User Subscription)

## Status

This is the **authoritative documentation** for PollNow poll-result email
notifications. It supersedes `email-notifications-ses.md` (SES approach,
not applied).

- **Poll-result emails** go through the existing **SNS topic**, but each user
  subscribes individually with a **filter policy** so they only receive
  results for polls they own.
- **Admin action notifications** (poll created / edited / closed / deleted)
  continue to use the same SNS topic as a broadcast — unchanged.
- **Voting is anonymous** and unchanged. Only the authenticated poll owner
  can subscribe to their own results.

---

## Design

```
Dashboard toggle ON
  -> toggleNotifications lambda
  -> sns:Subscribe (email, FilterPolicy: { ownerId: [userId] })
  -> SNS sends confirmation email to user
  -> user clicks link -> subscription confirmed

Poll closes (checkExpired)
  -> sns:Publish with MessageAttribute ownerId = poll.ownerId
  -> SNS routes to subscribers whose FilterPolicy matches
  -> only the poll owner receives the result email

Dashboard toggle OFF
  -> toggleNotifications lambda
  -> sns:Unsubscribe (if ARN confirmed) or just clears state (if pending)
```

### 3 subscription states

| State | Meaning | notificationSubArn stored |
|---|---|---|
| `off` | No subscription | empty / not present |
| `pending` | Subscribed, awaiting SNS confirmation click | `"pending confirmation"` |
| `on` | Confirmed, filter active | real `arn:aws:sns:...` ARN |

---

## Files changed / created

```text
backend/lambdas/registerUser/index.mjs   # reverted: no SES, simple registration
backend/lambdas/loginUser/index.mjs      # returns notificationStatus (off|pending|on)
backend/lambdas/createPoll/index.mjs     # unchanged (resolves ownerEmail from users table)
backend/lambdas/checkExpired/index.mjs   # sns:Publish with MessageAttribute ownerId
backend/lambdas/toggleNotifications/index.mjs   # NEW: subscribe / unsubscribe
backend/lambdas/getNotificationStatus/index.mjs # NEW: refresh status without re-login
frontend/src/pages/Home.jsx              # notification toggle card (off/pending/on)
```

---

## DynamoDB — users table

No schema changes needed (DynamoDB is schemaless). The following attributes
are added to each user item as needed:

| Attribute | Type | Set by |
|---|---|---|
| `notificationSubArn` | String | `toggleNotifications` (enabled=true) |
| `notificationsEnabled` | Boolean | `toggleNotifications` |

These attributes are absent on existing users — treated as `off`.

---

## Environment variables

### `registerUser`

| Key | Value |
|---|---|
| `USERS_TABLE` | `users` |

### `loginUser`

| Key | Value |
|---|---|
| `USERS_TABLE` | `users` |
| `SNS_REGION` | `us-east-1` |
| `SNS_TOPIC_ARN` | SNS topic ARN |

### `createPoll`

| Key | Value |
|---|---|
| `POLLS_TABLE` | `polls` |
| `USERS_TABLE` | `users` |
| `S3_BUCKET` | existing S3 bucket |
| `SNS_REGION` | `us-east-1` |
| `SNS_TOPIC_ARN` | SNS topic ARN |
| `FRONTEND_URL` | Netlify frontend URL |

### `checkExpired`

| Key | Value |
|---|---|
| `POLLS_TABLE` | `polls` |
| `VOTES_TABLE` | `votes` |
| `S3_BUCKET` | existing S3 bucket |
| `SNS_REGION` | `us-east-1` |
| `SNS_TOPIC_ARN` | SNS topic ARN |

> Remove `SES_REGION` and `SES_FROM_ADDRESS` if previously set.

### `toggleNotifications` (new lambda)

| Key | Value |
|---|---|
| `USERS_TABLE` | `users` |
| `SNS_REGION` | `us-east-1` |
| `SNS_TOPIC_ARN` | SNS topic ARN |

### `getNotificationStatus` (new lambda)

| Key | Value |
|---|---|
| `USERS_TABLE` | `users` |
| `SNS_REGION` | `us-east-1` |
| `SNS_TOPIC_ARN` | SNS topic ARN |

---

## IAM (LabRole)

Actions needed in addition to existing DynamoDB / S3 / SNS publish:

| Action | Lambda |
|---|---|
| `sns:Subscribe` | `toggleNotifications` |
| `sns:Unsubscribe` | `toggleNotifications` |
| `sns:GetSubscriptionAttributes` | `loginUser`, `getNotificationStatus` |
| `sns:Publish` (already present) | `checkExpired`, `createPoll` and others |

In the Learner Lab, `LabRole` is usually permissive. If subscribe/unsubscribe
fail with `AuthorizationError`, add these actions explicitly.

---

## API Gateway routes

Two new routes are needed (same API as `/polls`):

| Method | Path | Lambda |
|---|---|---|
| `POST` | `/notifications` | `toggleNotifications` |
| `GET` | `/notifications` | `getNotificationStatus` |

Both require the `x-user-id` header (same auth pattern as poll routes).
Enable CORS on both routes.

---

## How SNS filter policies work

When `toggleNotifications` creates a subscription it sets:

```json
FilterPolicy: { "ownerId": ["<userId>"] }
```

When `checkExpired` publishes a result it sets:

```json
MessageAttributes: { "ownerId": { "DataType": "String", "StringValue": "<ownerId>" } }
```

SNS delivers the message only to subscribers whose `FilterPolicy` matches the
`ownerId` attribute. Subscribers with no filter policy (e.g. the admin inbox)
receive every message.

---

## Important: admin inbox receives all messages

The existing admin SNS subscription has no filter policy, so it receives both
admin action notifications and poll-result emails. This is expected and
distinguishable by subject line.

---

## Tests

### 1. Toggle ON — confirmation email

1. Log in → notification card shows "off".
2. Click "Ativar notificações".
3. Check inbox for SNS confirmation email titled
   `AWS Notification - Subscription Confirmation`.
4. Click the confirmation link.
5. Click "Verificar estado" on the dashboard → status becomes "on".

### 2. Poll result email (filter policy)

1. Create a poll closing in a few minutes.
2. Cast a vote.
3. Wait for close + up to 5 minutes (EventBridge `rate(5 minutes)`).
4. Check the owner inbox — result email arrives with subject
   `Sondagem "<title>" fechou!`.
5. Check that **another user** (different account, different subscription)
   does NOT receive this email.

CloudWatch:
```bash
aws logs tail /aws/lambda/checkExpired --since 15m
```
Look for `SNS publish: sondagem ... | ownerId=...`.

### 3. Toggle OFF

1. Click "Desativar notificações".
2. Status returns to "off".
3. A subsequent closed poll does not trigger an email.

---

## Common problems

### Status stays "pending" after clicking confirmation link

SNS confirmation can take a few seconds. Click "Verificar estado" after
confirming. If it still shows pending, check the SNS console:

```
SNS → Topics → pollnow-notifications → Subscriptions
```

The subscription should show status `Confirmed`.

### No result email received

Check:
- `notificationStatus` is `"on"` (not `"pending"`).
- `checkExpired` CloudWatch logs show `SNS publish` for the poll.
- The poll item in DynamoDB has `ownerId` set.
- The SNS subscription filter policy matches the `ownerId` value.

### Unsubscribe fails

If `notificationSubArn` is `"pending confirmation"`, the API cannot call
`sns:Unsubscribe` yet. The toggle clears the stored state immediately; the
SNS subscription expires automatically after 3 days without confirmation.

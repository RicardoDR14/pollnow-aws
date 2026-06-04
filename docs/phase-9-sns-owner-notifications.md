# Phase 9 — Per-Owner SNS Notifications Checklist

## Objective

This phase replaces the broadcast SNS result email with a per-owner opt-in
system. Each user can subscribe to receive their own poll results by email.
Voting remains fully anonymous and unchanged.

After this phase:

- Poll owners can activate/deactivate result notifications via a dashboard toggle.
- Each subscription has a SNS filter policy `{ "ownerId": ["<userId>"] }` so
  only the poll owner receives the result email for their own polls.
- Admin action notifications (created/edited/closed/deleted) continue to use
  the shared SNS topic as a broadcast — unchanged.

---

## Branch

```bash
phase-9-ses-email-notifications
```

---

## Files changed

```text
backend/lambdas/registerUser/index.mjs       # removed SES; simple registration
backend/lambdas/loginUser/index.mjs          # returns notificationStatus
backend/lambdas/createPoll/index.mjs         # resolves ownerEmail from users table
backend/lambdas/checkExpired/index.mjs       # sns:Publish with ownerId MessageAttribute
```

New files:

```text
backend/lambdas/toggleNotifications/index.mjs   # subscribe / unsubscribe per user
backend/lambdas/getNotificationStatus/index.mjs # refresh status without re-login
frontend/src/pages/Home.jsx                     # notification toggle card
docs/owner-notifications-sns.md                 # design reference
docs/RUNBOOK-sns-owner-notifications.md         # deployment runbook
```

---

## How it works

```
User clicks "Ativar notificações"
  -> POST /notifications { enabled: true }
  -> toggleNotifications lambda
  -> sns:Subscribe (Protocol: email, FilterPolicy: { ownerId: [userId] })
  -> SNS sends confirmation email
  -> DynamoDB users.notificationSubArn = "pending confirmation"
  -> UI shows "pending" state

User confirms SNS email link
  -> User clicks "Verificar estado" in dashboard
  -> GET /notifications
  -> getNotificationStatus lambda
  -> DynamoDB still has "pending confirmation" — known limitation (see below)

User clicks "Desativar notificações"
  -> POST /notifications { enabled: false }
  -> If ARN confirmed: sns:Unsubscribe
  -> If ARN "pending confirmation": clears DynamoDB state only (SNS expires in 3 days)

Poll closes (checkExpired)
  -> sns:Publish with MessageAttributes.ownerId = poll.ownerId
  -> SNS delivers only to subscribers whose FilterPolicy matches
```

---

## 3 notification states

| State | DynamoDB notificationSubArn | UI shown |
|---|---|---|
| `off` | absent / empty | "Ativar notificações" button |
| `pending` | `"pending confirmation"` | Confirmation message + "Verificar estado" |
| `on` | real `arn:aws:sns:...` ARN | "Notificações ativas" + "Desativar" button |

---

## Important: old users

Users registered **before this phase** have no `notificationSubArn` in DynamoDB.
This is treated as `off` — they can activate notifications normally via the toggle.

**Old user accounts with test/placeholder emails cannot receive SNS notifications.**
SNS delivers to real email addresses only. For full end-to-end testing, create a
**new user account with a real email** you can access.

---

## Known limitation: status stays "pending" after confirmation

When a user confirms the SNS email link, the DynamoDB record is not updated
automatically. `getNotificationStatus` reads `notificationSubArn = "pending
confirmation"` from DynamoDB and returns `"pending"`, even though the SNS
subscription is confirmed.

**Workaround**: the user must log out and log back in, OR the `notificationSubArn`
must be updated manually in DynamoDB with the confirmed ARN from the SNS Console.

---

## Known bug: UI shows "Ativar" when already subscribed externally

If a user has a confirmed SNS subscription (e.g., created manually or from a
previous session) but DynamoDB has no `notificationSubArn`, the UI shows the
"Ativar notificações" button. Clicking it returns a **409** error:
`"O teu email ja esta subscrito a este topico com configuracao diferente"`.

This is the correct API behaviour — the error is shown as a toast and no state
is corrupted. To resolve: delete the existing SNS subscription in the AWS
Console and click the toggle again.

---

## AWS changes required

### New lambdas to create

| Lambda | File |
|---|---|
| `toggleNotifications` | `backend/lambdas/toggleNotifications/index.mjs` |
| `getNotificationStatus` | `backend/lambdas/getNotificationStatus/index.mjs` |

```
Lambda → Create function → Author from scratch
Runtime: Node.js 22.x
Role: LabRole
→ paste code → Deploy → set env vars
```

### API Gateway routes to add

| Method | Route | Lambda |
|---|---|---|
| `POST` | `/notifications` | `toggleNotifications` |
| `GET` | `/notifications` | `getNotificationStatus` |

Enable CORS on `/notifications` (origin `*`, headers `Content-Type, x-user-id`).
Deploy the API stage after adding routes.

### Environment variables

| Lambda | Variables |
|---|---|
| `registerUser` | `USERS_TABLE=users` |
| `loginUser` | `USERS_TABLE=users`, `SNS_REGION=us-east-1`, `SNS_TOPIC_ARN=<arn>` |
| `createPoll` | keep existing + confirm `USERS_TABLE=users` |
| `checkExpired` | `POLLS_TABLE`, `VOTES_TABLE`, `S3_BUCKET`, `SNS_REGION=us-east-1`, `SNS_TOPIC_ARN=<arn>` |
| `toggleNotifications` | `USERS_TABLE=users`, `SNS_REGION=us-east-1`, `SNS_TOPIC_ARN=<arn>` |
| `getNotificationStatus` | `USERS_TABLE=users`, `SNS_REGION=us-east-1`, `SNS_TOPIC_ARN=<arn>` |

Remove `SES_REGION` and `SES_FROM_ADDRESS` if previously set on `checkExpired`.

### IAM (LabRole)

| Action | Lambda |
|---|---|
| `sns:Subscribe` | `toggleNotifications` |
| `sns:Unsubscribe` | `toggleNotifications` |
| `sns:GetSubscriptionAttributes` | `loginUser`, `getNotificationStatus` |

`sns:Publish` already present for existing lambdas.

---

## Tests

### 1. Activate notifications

1. Log in with a **real email** account.
2. Dashboard shows notification card in `off` state.
3. Click "Ativar notificações".
4. Card changes to `pending` state.
5. Check email inbox for AWS confirmation email.
6. Click the confirmation link.
7. Log out and log back in → `notificationStatus: on` returned.
8. Dashboard shows "Notificações ativas".

### 2. Result email (filter by ownerId)

1. Ensure notificationsare `on`.
2. Create a poll with a short closing time.
3. Cast one or two votes.
4. Wait for EventBridge (up to 5 minutes after close time).
5. Check owner inbox — result email arrives with subject `Sondagem "<title>" fechou!`.
6. A different user account does **not** receive this email.

CloudWatch check:
```bash
aws logs tail /aws/lambda/checkExpired --since 15m
```
Look for: `SNS publish: sondagem ... | ownerId=...`

### 3. Deactivate

1. Click "Desativar notificações" → status returns to `off`.
2. SNS Console → Subscriptions → subscription is removed (or pending expiry if was "pending").

---

## Final checklist

Repo (already applied):

- [x] `registerUser` — SES removed.
- [x] `loginUser` — returns `notificationStatus`.
- [x] `createPoll` — resolves `ownerEmail` from `users` table; no per-poll email field.
- [x] `checkExpired` — `sns:Publish` with `MessageAttribute ownerId`.
- [x] `toggleNotifications` lambda created.
- [x] `getNotificationStatus` lambda created.
- [x] `Home.jsx` — notification toggle card; SES banner removed; email form field removed.

AWS (manual):

- [ ] `toggleNotifications` lambda created and deployed.
- [ ] `getNotificationStatus` lambda created and deployed.
- [ ] Env vars set on all 6 lambdas.
- [ ] API Gateway routes `POST /notifications` and `GET /notifications` created.
- [ ] API stage redeployed.
- [ ] LabRole has `sns:Subscribe`, `sns:Unsubscribe`, `sns:GetSubscriptionAttributes`.
- [ ] Existing lambdas redeployed (`registerUser`, `loginUser`, `checkExpired`, `createPoll`).
- [ ] EventBridge permission confirmed for `checkExpired`.
- [ ] Toggle ON → SNS confirmation email arrives.
- [ ] Toggle confirmed → result email arrives on poll close.
- [ ] Other user does NOT receive the email.
- [ ] Toggle OFF → subscription removed.
- [ ] Existing voting, results, admin SNS notifications still work.

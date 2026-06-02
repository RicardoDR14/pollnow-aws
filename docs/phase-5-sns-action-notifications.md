# Phase 5 — SNS Notifications for Poll Actions Checklist

## Objective

This phase adds SNS email notifications for important poll actions.

After this phase, PollNow sends a notification when:

- a poll is created;
- a poll is edited;
- a poll is closed manually;
- a poll is deleted.

The existing `checkExpired` Lambda already sends a notification when expired polls are processed automatically.

---

## Branch

Use a separate branch:

```bash
phase-5-sns-action-notifications
```

If Phase 4 has not been merged into `main`:

```bash
git checkout phase-4-ux-vote-fixes
git pull
git checkout -b phase-5-sns-action-notifications
```

If Phase 4 has already been merged into `main`:

```bash
git checkout main
git pull
git checkout -b phase-5-sns-action-notifications
```

---

## Files changed

This phase changes:

```text
backend/lambdas/createPoll/index.mjs
backend/lambdas/updatePoll/index.mjs
backend/lambdas/closePoll/index.mjs
backend/lambdas/deletePoll/index.mjs
```

This phase adds:

```text
docs/phase-5-sns-action-notifications.md
```

No frontend code is required for this phase.

---

## AWS services involved

| Service | Purpose |
|---|---|
| AWS Lambda | Sends notification after poll action |
| Amazon SNS | Delivers email notification |
| DynamoDB | Stores poll and vote data |
| API Gateway | Existing routes trigger the Lambdas |

---

## Important SNS limitation

This project uses an SNS topic for email notifications.

That means all confirmed email subscribers of the topic receive the notifications.

To receive the emails, the target email must be subscribed to the SNS topic and the subscription must be confirmed from the email inbox.

If individual per-author email delivery is required in the future, Amazon SES would be a better option.

---

## Existing SNS topic

Use the existing SNS topic already created for PollNow notifications.

Expected topic name:

```text
pollnow-notifications
```

Example ARN format:

```text
arn:aws:sns:us-east-1:ACCOUNT_ID:pollnow-notifications
```

---

## Lambda environment variables

Add these environment variables to the following Lambdas:

```text
createPoll
updatePoll
closePoll
deletePoll
```

Required variables:

| Key | Value |
|---|---|
| `SNS_REGION` | `us-east-1` |
| `SNS_TOPIC_ARN` | SNS topic ARN |
| `FRONTEND_URL` | Netlify frontend URL |

Example:

```text
SNS_REGION = us-east-1
SNS_TOPIC_ARN = arn:aws:sns:us-east-1:ACCOUNT_ID:pollnow-notifications
FRONTEND_URL = https://pollnow.netlify.app
```

Keep the existing variables already used by each Lambda.

---

## Existing variables to keep

### `createPoll`

| Key | Value |
|---|---|
| `POLLS_TABLE` | `polls` |
| `S3_BUCKET` | existing S3 bucket |
| `SNS_REGION` | `us-east-1` |
| `SNS_TOPIC_ARN` | SNS topic ARN |
| `FRONTEND_URL` | Netlify frontend URL |

### `updatePoll`

| Key | Value |
|---|---|
| `POLLS_TABLE` | `polls` |
| `SNS_REGION` | `us-east-1` |
| `SNS_TOPIC_ARN` | SNS topic ARN |
| `FRONTEND_URL` | Netlify frontend URL |

### `closePoll`

| Key | Value |
|---|---|
| `POLLS_TABLE` | `polls` |
| `SNS_REGION` | `us-east-1` |
| `SNS_TOPIC_ARN` | SNS topic ARN |
| `FRONTEND_URL` | Netlify frontend URL |

### `deletePoll`

| Key | Value |
|---|---|
| `POLLS_TABLE` | `polls` |
| `VOTES_TABLE` | `votes` |
| `SNS_REGION` | `us-east-1` |
| `SNS_TOPIC_ARN` | SNS topic ARN |
| `FRONTEND_URL` | Netlify frontend URL |

---

## Lambda code update

For each Lambda below, open the Lambda in AWS Console, replace the code with the matching file from GitHub, and click **Deploy**.

| Lambda | GitHub file |
|---|---|
| `createPoll` | `backend/lambdas/createPoll/index.mjs` |
| `updatePoll` | `backend/lambdas/updatePoll/index.mjs` |
| `closePoll` | `backend/lambdas/closePoll/index.mjs` |
| `deletePoll` | `backend/lambdas/deletePoll/index.mjs` |

---

## API Gateway

No new routes are required.

The existing routes continue to be used:

| Method | Path | Lambda |
|---|---|---|
| `POST` | `/polls` | `createPoll` |
| `PUT` | `/polls/{pollId}` | `updatePoll` |
| `PATCH` | `/polls/{pollId}/close` | `closePoll` |
| `DELETE` | `/polls/{pollId}` | `deletePoll` |

---

## SNS subscription check

Go to:

```text
AWS Console → SNS → Topics → pollnow-notifications → Subscriptions
```

Confirm that at least one email subscription exists and has status:

```text
Confirmed
```

If status is:

```text
Pending confirmation
```

open the inbox and confirm the SNS subscription email.

---

## Tests

### 1. Test notification when creating poll

1. Log in.
2. Create a new poll.
3. Check the subscribed email inbox.

Expected result:

- email received;
- subject says `PollNow — Nova sondagem criada`;
- message includes title, author and voting link.

---

### 2. Test notification when editing poll

1. Edit an existing poll.
2. Change title, description, options or closing date.
3. Save changes.
4. Check the subscribed email inbox.

Expected result:

- email received;
- subject says `PollNow — Sondagem editada`;
- message includes old title, new title and updated information.

---

### 3. Test notification when closing poll manually

1. Click `Fechar` on an open poll.
2. Confirm the action.
3. Check the subscribed email inbox.

Expected result:

- email received;
- subject says `PollNow — Sondagem fechada manualmente`;
- message includes result link.

---

### 4. Test notification when deleting poll

1. Click `Eliminar` on a poll.
2. Confirm the action.
3. Check the subscribed email inbox.

Expected result:

- email received;
- subject says `PollNow — Sondagem eliminada`;
- message includes title and number of deleted votes.

---

## Common problems

### No email received

Check:

- SNS topic ARN is correct;
- email subscription is confirmed;
- Lambda has `SNS_TOPIC_ARN`;
- Lambda has permission to publish to SNS through `LabRole`;
- Lambda was deployed after code change.

---

### Lambda succeeds but no notification is sent

Check CloudWatch logs.

If logs show:

```text
SNS_TOPIC_ARN not configured. Notification skipped.
```

then the environment variable is missing.

---

### Wrong frontend link in email

Check:

```text
FRONTEND_URL
```

It should be the Netlify URL, for example:

```text
https://pollnow.netlify.app
```

Do not include a final slash.

Correct:

```text
https://pollnow.netlify.app
```

Avoid:

```text
https://pollnow.netlify.app/
```

---

### Emails go to all subscribers

This is expected when using an SNS topic.

SNS topic email sends the notification to all confirmed subscribers.

---

## Final checklist

Before approving merge into `main`, confirm:

- [ ] Branch `phase-5-sns-action-notifications` was created.
- [ ] `createPoll` was updated.
- [ ] `updatePoll` was updated.
- [ ] `closePoll` was updated.
- [ ] `deletePoll` was updated.
- [ ] All four Lambdas were updated in AWS.
- [ ] All four Lambdas were deployed.
- [ ] `SNS_REGION` was added.
- [ ] `SNS_TOPIC_ARN` was added.
- [ ] `FRONTEND_URL` was added.
- [ ] SNS email subscription is confirmed.
- [ ] Creating a poll sends email.
- [ ] Editing a poll sends email.
- [ ] Closing a poll sends email.
- [ ] Deleting a poll sends email.
- [ ] Existing voting and results still work.
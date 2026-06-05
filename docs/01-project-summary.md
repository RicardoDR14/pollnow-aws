# PollNow — Final Project Summary

## Project name

```text
PollNow
```

## Short description

PollNow is a serverless web application for creating, sharing and voting in
online polls. Users manage their polls from a private dashboard, share them
via public links and QR Codes, and can subscribe to receive results by email
when their polls close.

---

## Main goal

Demonstrate a complete AWS serverless architecture using multiple managed
services, integrating authentication, data storage, file storage, scheduled
automation, and pub/sub notifications in a practical and interactive
application.

---

## Implemented features

### Authentication

- Registration with username, email and password.
- Login returning user identity and notification status.
- Private dashboard per user — each user sees only their own polls.

### Poll management

- Create polls with title, description, options, closing date and optional image.
- Edit existing polls.
- Close polls manually.
- Delete polls.
- Search polls by title, description or status.

### Optional poll images

- Upload JPG, PNG or WEBP images (max 1.5 MB) stored in Amazon S3.
- Images displayed on dashboard, voting page, results page and share page.

### Public voting (anonymous)

- Vote at `/vote/{pollId}` without authentication.
- Change vote while poll is open (browser-session-based identity).
- Voting blocked on closed polls.

### Results

- View results at `/results/{pollId}` with chart, percentages and totals.
- Open polls show a live-update indicator.

### QR Code sharing

- Share page at `/share/{pollId}` with QR Code, copy-link and download-QR.
- QR Code points only to the public voting route — no edit/delete access.

### Per-owner email notifications (phase 9)

- Dashboard toggle to subscribe/unsubscribe to result emails.
- Each subscription uses a SNS filter policy `{ "ownerId": [userId] }` so
  users receive results only for their own polls.
- Three states: `off` / `pending` (awaiting confirmation) / `on` (active).
- Admin action notifications (created/edited/closed/deleted) continue as
  an unfiltered broadcast on the same SNS topic.

### Automatic poll expiration

- EventBridge rule triggers `checkExpired` every 5 minutes.
- Expired polls: aggregate votes, export CSV to S3, publish result email
  via SNS with ownerId routing, mark as `notified`.

---

## AWS services

| Service | Usage |
|---|---|
| Amazon API Gateway | HTTP API exposing all backend endpoints |
| AWS Lambda | All backend logic (12 functions) |
| Amazon DynamoDB | Users, polls and votes storage |
| Amazon S3 | Poll images and result CSV exports |
| Amazon SNS | Admin action notifications + per-owner result emails |
| Amazon EventBridge | Scheduled poll expiration check (every 5 min) |
| Amazon CloudWatch | Lambda execution logs |

---

## Frontend hosting

React application deployed on Netlify with `_redirects` rule for SPA routing.

---

## Architecture pattern

```text
User Browser
   ↓
Netlify (React SPA)
   ↓
API Gateway (HTTP API)
   ↓
Lambda (serverless functions)
   ↓
DynamoDB / S3 / SNS
              ↑
EventBridge → checkExpired Lambda
```

---

## Important note for testing

Users registered **before phase 9** cannot receive result emails unless they
re-register or the notification subscription is manually created for them.
For end-to-end notification testing, **create a new user account with a real,
accessible email address**.

---

## Known limitations

- Custom authentication (not Amazon Cognito).
- Notification status stays `pending` in UI after confirming SNS email until
  re-login (DynamoDB not updated automatically on confirmation).
- Conflict error if same email already has an SNS subscription with different
  attributes — user must delete old subscription and toggle again.
- Image editing after poll creation not supported.
- No WebSocket real-time updates.
- Vote identity is browser-session-based, not account-based.

---

## Possible future improvements

- Amazon Cognito for authentication.
- WebSocket API for real-time results.
- S3 pre-signed URLs for direct image upload.
- Image editing when updating polls.
- SQS for vote processing decoupling.
- Automatic DynamoDB update when SNS subscription is confirmed (SNS → Lambda → DynamoDB).
- CloudWatch dashboard with custom metrics.

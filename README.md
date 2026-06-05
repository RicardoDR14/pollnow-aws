# PollNow — Serverless Polling Application

PollNow is a serverless web application for creating, sharing and voting in online polls.

The application allows authenticated users to create and manage their own polls, share public voting links and QR Codes, collect anonymous votes, display results, upload optional poll images, and receive poll-result notifications by email.

## Live application

Frontend:

```text
https://pollnow.netlify.app/
```

## Main features

- User registration and login.
- Private dashboard for each authenticated user.
- Poll creation, editing, closing and deletion.
- Anonymous voting through public poll links.
- Public results pages with charts, totals and percentages.
- QR Code sharing page for each poll.
- Optional poll image upload and display.
- Email notifications when owned polls close.
- Automatic poll expiration handled by a scheduled AWS Lambda.

## Technology stack

- **Frontend:** React, hosted on Netlify.
- **Backend:** AWS Lambda functions exposed through Amazon API Gateway.
- **Database:** Amazon DynamoDB.
- **Storage:** Amazon S3 for poll images and exported result CSV files.
- **Notifications:** Amazon SNS for admin and per-owner email notifications.
- **Automation:** Amazon EventBridge scheduled rule for poll expiration checks.
- **Monitoring:** Amazon CloudWatch Lambda logs.

## Repository structure

```text
backend/   AWS Lambda source code
frontend/  React frontend application
docs/      Final project documentation
```

## Documentation

The main documentation for evaluation is organized as numbered deliverables:

- [`01-project-summary.md`](docs/01-project-summary.md) - final feature and service summary.
- [`02-architecture.md`](docs/02-architecture.md) - architecture, routes, Lambda responsibilities and AWS resources.
- [`03-aws-deployment-guide.md`](docs/03-aws-deployment-guide.md) - AWS resources, configuration and deployment order.
- [`04-final-test-checklist.md`](docs/04-final-test-checklist.md) - manual validation checklist for presentation/testing.
- [`05-known-limitations.md`](docs/05-known-limitations.md) - current limitations and recommended production improvements.
- [`06-presentation-notes.md`](docs/06-presentation-notes.md) - presentation structure, demo flow and talking points.

Historical phase notes and old approaches are preserved in [`docs/archive/`](docs/archive/) for traceability.

## Local frontend build check

```bash
cd frontend
npm install
npm run build
```

Expected result:

```text
Compiled successfully.
```

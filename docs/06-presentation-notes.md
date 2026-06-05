# PollNow - Presentation Notes

## Elevator Pitch

PollNow is a serverless polling platform where users can create polls, share public voting links or QR Codes, collect anonymous votes and receive result notifications by email when polls close.

## Problem

Many simple polling tools are either too limited for presentation workflows or require managing traditional servers. The goal was to build a practical application that demonstrates serverless cloud architecture while still solving a recognizable user problem: creating and sharing polls quickly.

## Solution

PollNow provides:

- A React frontend for registration, login, poll management, voting, results and sharing.
- AWS Lambda backend functions exposed through API Gateway.
- DynamoDB storage for users, polls and votes.
- S3 storage for optional poll images and generated result CSV exports.
- SNS email notifications for poll actions and owner-specific poll results.
- EventBridge automation for closing expired polls.

## AWS Architecture Explanation

The user interacts with the React frontend hosted on Netlify. The frontend calls API Gateway routes, and each route invokes a specific Lambda function. Lambda functions read and write data in DynamoDB, upload images or CSV exports to S3 and publish email notifications through SNS.

The `checkExpired` Lambda is triggered automatically by an EventBridge rule every five minutes. It finds expired open polls, calculates results, exports a CSV file to S3, publishes the result email to SNS with the `ownerId` message attribute and marks the poll as notified.

Per-owner result emails are handled with SNS subscription filter policies. Each owner subscription filters messages by its own `ownerId`, so users receive result emails only for their own polls.

## Recommended Demo Flow

1. Open the live Netlify application.
2. Register or log in with a test account.
3. Show the private dashboard and explain user isolation.
4. Create a poll with title, options, closing date and optional image.
5. Open the share page and show the public link and QR Code.
6. Open the voting page in another browser/session and cast a vote anonymously.
7. Show the results page with totals, percentages and chart.
8. Return to the dashboard and demonstrate edit, close or delete actions.
9. Show the notification toggle and explain SNS email confirmation.
10. Explain the automatic expiration flow with EventBridge and `checkExpired`.

## Features to Highlight

- Fully serverless backend using AWS managed services.
- Public anonymous voting without requiring voter login.
- Private poll management per authenticated owner.
- QR Code sharing for easy access from phones.
- Optional S3-hosted poll images.
- Result pages with clear visual feedback.
- Scheduled automatic poll processing.
- SNS filter policies for per-owner result notifications.

## Limitations to Mention

- Authentication is custom and not based on Cognito.
- Anonymous voting uses a browser `localStorage` voter identifier.
- Results are not pushed with WebSockets.
- Poll images cannot be edited after creation.
- S3 image display requires public read access.
- SNS email subscriptions depend on user confirmation and may remain pending until the user confirms and refreshes their session.
- AWS Academy restrictions can affect some service behavior.

## Future Work

- Add Amazon Cognito authentication.
- Add WebSocket or AppSync real-time result updates.
- Replace public S3 image access with pre-signed URLs or CloudFront.
- Add image editing and cleanup.
- Add infrastructure as code for repeatable deployments.
- Add stronger vote validation options.
- Add CloudWatch dashboards and alerts.
- Add automated end-to-end tests.

## Final Conclusion

PollNow demonstrates a complete serverless application using AWS compute, storage, database, messaging and scheduling services. It connects those services into a working product that can be used from a public frontend while keeping the architecture simple enough to explain and evaluate clearly.

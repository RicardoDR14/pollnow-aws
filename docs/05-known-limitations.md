# PollNow - Known Limitations

This document lists the current limitations of the PollNow project and the recommended improvements for a production-grade version.

## Current Limitations

### Custom Authentication

PollNow uses custom registration and login logic instead of Amazon Cognito. The application stores the logged-in user identity in the frontend and sends it to the backend with the `x-user-id` header.

This is acceptable for the academic prototype, but a production deployment should use a managed identity provider with stronger authentication flows, token validation and account recovery features.

### Anonymous Voting

Voting is anonymous and uses a browser-generated `voterId` stored in `localStorage`. This allows the same browser to change a vote while the poll is open, but it does not strongly prevent voting from another browser, another device or a cleared browser profile.

### No WebSockets

The results page does not use WebSockets or push-based updates. Results are loaded from the API, and open polls show a live-update indicator rather than real-time server push.

### Image Editing

Poll images can be uploaded during poll creation, but editing or replacing the image after creation is not supported.

### S3 Public Access Requirement

Poll images are displayed through direct S3 URLs. The relevant objects must be publicly readable, which is simple for this project but not ideal for production.

### SNS Confirmation and Pending State

Email subscriptions require the user to confirm the SNS confirmation email. Until confirmation is complete and the user refreshes their session, the UI can remain in a `pending` state.

Accounts created before the per-owner notification feature may also require re-registration or manual subscription cleanup before result notifications work correctly.

### AWS Academy Limitations

In AWS Academy environments, some services, IAM permissions, email sending behavior, regions or account-level features may be restricted. These limitations can affect SNS email confirmation, public S3 access, scheduled EventBridge execution or resource persistence after a lab session ends.

## Recommended Production Improvements

- Replace custom authentication with Amazon Cognito or another managed identity provider.
- Use signed JWTs instead of trusting a plain `x-user-id` header.
- Add stronger duplicate-vote protection if polls require stricter integrity.
- Use API Gateway WebSocket API or AWS AppSync for real-time result updates.
- Add image replacement and image deletion when polls are edited or deleted.
- Use S3 pre-signed URLs or CloudFront with controlled access instead of public S3 object reads.
- Add automatic SNS confirmation tracking with an SNS-to-Lambda workflow that updates DynamoDB.
- Add infrastructure as code with AWS CDK, SAM, Terraform or CloudFormation.
- Add structured monitoring dashboards, alarms and custom CloudWatch metrics.
- Add automated backend integration tests and frontend end-to-end tests.

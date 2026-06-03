# PollNow — Final Project Summary

## Project name

```text
PollNow
```

## Short description

PollNow is a serverless web application for creating, sharing and voting in online polls.

Users can create polls, manage their own polls, share them through public links or QR Codes, collect votes and view results in real time.

---

## Main goal

The goal of PollNow is to provide a simple and accessible polling platform using AWS serverless services.

The application allows:

- user registration and login;
- private dashboard per user;
- poll creation;
- poll editing;
- poll closing;
- poll deletion;
- public voting;
- vote update while poll is open;
- results visualization;
- QR Code sharing;
- optional poll images;
- email notifications through SNS.

---

## Main features

### Authentication

PollNow includes a simple authentication mechanism.

Users can:

- register;
- log in;
- access a private dashboard;
- see only their own polls.

---

### Poll management

Authenticated users can:

- create polls;
- edit polls;
- close polls manually;
- delete polls;
- search existing polls.

Each poll belongs to a user through an owner identifier.

---

### Public voting

Poll voting is public through a link:

```text
/vote/{pollId}
```

Users can vote without accessing the private dashboard.

If the poll is still open, users can also change their vote from the same browser.

If the poll is closed, voting is blocked.

---

### Results

Poll results are available through:

```text
/results/{pollId}
```

The results page includes:

- total votes;
- chart visualization;
- result percentage per option;
- live update indicator for open polls.

---

### QR Code sharing

Polls can be shared through:

```text
/share/{pollId}
```

This page includes:

- QR Code;
- public voting link;
- copy link button;
- download QR button.

The QR Code points only to the voting page, so it does not expose edit, delete or close actions.

---

### Optional images

Polls can include an optional image.

The image can represent:

- a candidate;
- an organization;
- an event;
- a class;
- a campaign;
- any visual identity related to the poll.

Images are stored in Amazon S3 and displayed in:

- dashboard;
- voting page;
- results page;
- share page.

---

### SNS notifications

PollNow sends email notifications through Amazon SNS when important poll actions happen:

- poll created;
- poll edited;
- poll closed;
- poll deleted;
- poll expired and processed automatically.

---

## AWS services used

| Service | Usage |
|---|---|
| Amazon API Gateway | Exposes backend HTTP endpoints |
| AWS Lambda | Runs backend logic |
| Amazon DynamoDB | Stores users, polls and votes |
| Amazon S3 | Stores poll images and generated files |
| Amazon SNS | Sends email notifications |
| Amazon EventBridge | Triggers scheduled poll expiration checks |
| Amazon CloudWatch | Stores Lambda execution logs |

---

## Frontend hosting

The frontend is a React application deployed on Netlify.

Netlify hosts the user interface and redirects all frontend routes to the React application using:

```text
frontend/public/_redirects
```

This allows direct access to routes such as:

```text
/vote/{pollId}
/results/{pollId}
/share/{pollId}
```

---

## Architecture summary

```text
User Browser
   ↓
Netlify React Frontend
   ↓
Amazon API Gateway
   ↓
AWS Lambda
   ↓
DynamoDB / S3 / SNS
   ↓
EventBridge scheduled trigger
```

---

## Data storage

### DynamoDB

DynamoDB stores:

- users;
- polls;
- votes.

Polls include fields such as:

- `pollId`;
- `ownerId`;
- `title`;
- `description`;
- `options`;
- `closesAt`;
- `status`;
- `imageUrl`;
- `createdAt`.

Votes include:

- `voteId`;
- `pollId`;
- `voterId`;
- selected option;
- vote date.

---

### S3

S3 stores images associated with polls.

Images are optional.

Image metadata is stored in DynamoDB:

```text
imageUrl
imageKey
imageContentType
```

---

## Security decisions

Private management actions require a user identifier.

Protected actions include:

- edit poll;
- delete poll;
- close poll;
- list own polls.

Public actions include:

- view poll;
- vote;
- view results;
- open share page.

The QR Code only links to the public voting route.

---

## Limitations

Current limitations:

- authentication is simple and not based on Amazon Cognito;
- image editing after poll creation is not implemented;
- SNS topic sends emails to confirmed subscribers, not dynamically to each individual user;
- public S3 image access depends on bucket/object configuration;
- no real-time WebSocket result updates;
- vote identity is browser-based, not account-based.

---

## Possible future improvements

Future improvements could include:

- Amazon Cognito authentication;
- S3 pre-signed URLs for direct image upload;
- Amazon SES for per-user email delivery;
- WebSocket API for real-time results;
- CloudWatch dashboard with custom metrics;
- SQS queue for vote processing;
- better admin panel;
- image replacement when editing polls;
- export reports from dashboard.

---

## Final conclusion

PollNow demonstrates a complete serverless polling application using multiple AWS services.

The project includes a functional frontend, serverless backend, persistent storage, image handling, notifications and scheduled processing.

It is suitable as an academic AWS project because it uses several cloud services with a clear purpose and integrates them into a practical application.
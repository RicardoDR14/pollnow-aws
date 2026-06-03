# PollNow — Final Architecture

## Overview

PollNow follows a serverless architecture.

The frontend is hosted separately on Netlify, while the backend is composed of AWS managed services.

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
                │   REST/HTTP Routes   │
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
│ Users/Polls/Votes│                 │ Poll Images/CSV  │
└─────────────────┘                  └─────────────────┘
        │
        ▼
┌─────────────────┐
│       SNS       │
│ Email Alerts    │
└─────────────────┘

┌─────────────────┐
│  EventBridge    │
│ Scheduled Check │
└────────┬────────┘
         ▼
┌─────────────────┐
│  checkExpired   │
│     Lambda      │
└─────────────────┘
```

---

## Frontend

The frontend is built with React and hosted on Netlify.

Main frontend routes:

| Route | Purpose |
|---|---|
| `/` | Private dashboard |
| `/login` | User login |
| `/register` | User registration |
| `/vote/{pollId}` | Public voting page |
| `/results/{pollId}` | Public results page |
| `/share/{pollId}` | Public share/QR Code page |

---

## API Gateway

API Gateway exposes the backend endpoints to the frontend.

Main routes:

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/register` | Create user |
| `POST` | `/login` | Authenticate user |
| `GET` | `/polls` | List polls owned by user |
| `POST` | `/polls` | Create poll |
| `GET` | `/polls/{pollId}` | Get public poll |
| `PUT` | `/polls/{pollId}` | Edit poll |
| `DELETE` | `/polls/{pollId}` | Delete poll |
| `PATCH` | `/polls/{pollId}/close` | Close poll manually |
| `POST` | `/polls/{pollId}/vote` | Cast or update vote |
| `GET` | `/polls/{pollId}/results` | Get poll results |

---

## Lambda functions

| Lambda | Responsibility |
|---|---|
| `registerUser` | Create user account |
| `loginUser` | Validate login |
| `createPoll` | Create poll and optionally upload image |
| `listPolls` | List polls owned by authenticated user |
| `getPoll` | Return public poll data |
| `updatePoll` | Edit poll if requester is owner |
| `deletePoll` | Delete poll if requester is owner |
| `closePoll` | Close poll manually |
| `castVote` | Create or update vote |
| `getResults` | Calculate and return results |
| `checkExpired` | Process expired polls automatically |

---

## DynamoDB

DynamoDB is used as the main database.

Tables:

| Table | Purpose |
|---|---|
| `users` | Stores user accounts |
| `polls` | Stores poll metadata |
| `votes` | Stores poll votes |

---

## S3

Amazon S3 stores poll images.

When a poll is created with an image:

1. Frontend converts image to base64.
2. `createPoll` Lambda receives image payload.
3. Lambda uploads image to S3.
4. Lambda stores `imageUrl` in DynamoDB.
5. Frontend displays the image using `imageUrl`.

---

## SNS

Amazon SNS sends email notifications for important poll events.

Events:

- poll created;
- poll edited;
- poll manually closed;
- poll deleted;
- poll expired.

---

## EventBridge

Amazon EventBridge triggers the `checkExpired` Lambda on a schedule.

The purpose is to detect polls whose closing date has passed and process them automatically.

Possible actions:

- update poll status;
- calculate final result;
- send SNS notification;
- export result file to S3 if implemented.

---

## CloudWatch

CloudWatch stores Lambda logs.

It is used for:

- debugging;
- checking errors;
- validating function execution;
- confirming EventBridge triggers.

---

## Public and private access

### Private actions

Require authenticated user context:

- create poll;
- list own polls;
- edit poll;
- close poll;
- delete poll.

### Public actions

Do not require login:

- view poll;
- vote;
- view results;
- open share page.

---

## Final architecture value

The architecture demonstrates:

- serverless backend;
- managed database;
- object storage;
- notifications;
- scheduled automation;
- frontend/backend separation;
- public/private route separation;
- practical integration of several AWS services.
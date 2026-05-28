# AWS Phase 1 — Authentication and User Poll Separation

## Purpose

This guide explains the manual AWS changes required for Phase 1 of the PollNow project.

After this phase, the application will support:

- user registration with username, email and password;
- user login;
- polls linked to a specific owner through `ownerId`;
- dashboard filtering, so each user only sees their own polls.

---

## Summary of changes

| Area | Change | Responsible |
|---|---|---|
| DynamoDB | Create a new `users` table | AWS account owner |
| Lambda | Create `registerUser` | AWS account owner |
| Lambda | Create `loginUser` | AWS account owner |
| Lambda | Update `createPoll` | AWS account owner |
| Lambda | Update `listPolls` | AWS account owner |
| API Gateway | Add authentication routes | AWS account owner |
| API Gateway | Update CORS headers | AWS account owner |
| GitHub | Store Lambda source code | Repository |

---

## 1. Create DynamoDB table `users`

Go to:

```text
AWS Console → DynamoDB → Create table
```

Use the following configuration:

| Setting | Value |
|---|---|
| Table name | `users` |
| Partition key | `userId` |
| Partition key type | `String` |
| Table settings | Default settings |

Expected item structure:

```json
{
  "userId": "uuid",
  "username": "ruben",
  "email": "ruben@email.com",
  "passwordHash": "salt:hash",
  "createdAt": "2026-05-28T20:00:00.000Z"
}
```

---

## 2. Create Lambda `registerUser`

Create a new Lambda function:

```text
Lambda → Create function → Author from scratch
```

Use:

| Setting | Value |
|---|---|
| Function name | `registerUser` |
| Runtime | `Node.js 22.x` |
| Permissions | Use existing role → `LabRole` |

Copy the code from:

```text
backend/lambdas/registerUser/index.mjs
```

Then click **Deploy**.

### Environment variables

Add:

| Key | Value |
|---|---|
| `USERS_TABLE` | `users` |

---

## 3. Create Lambda `loginUser`

Create a new Lambda function:

```text
Lambda → Create function → Author from scratch
```

Use:

| Setting | Value |
|---|---|
| Function name | `loginUser` |
| Runtime | `Node.js 22.x` |
| Permissions | Use existing role → `LabRole` |

Copy the code from:

```text
backend/lambdas/loginUser/index.mjs
```

Then click **Deploy**.

### Environment variables

Add:

| Key | Value |
|---|---|
| `USERS_TABLE` | `users` |

---

## 4. Update Lambda `createPoll`

Open the existing Lambda:

```text
createPoll
```

Replace the existing code with the code from:

```text
backend/lambdas/createPoll/index.mjs
```

Then click **Deploy**.

### Existing environment variables

Confirm that the Lambda still has:

| Key | Value |
|---|---|
| `POLLS_TABLE` | `polls` |
| `S3_BUCKET` | `pollnow-banners-ricardodr14` |

`USERS_TABLE` is not required in this Lambda.

---

## 5. Update Lambda `listPolls`

Open the existing Lambda:

```text
listPolls
```

Replace the existing code with the code from:

```text
backend/lambdas/listPolls/index.mjs
```

Then click **Deploy**.

### Existing environment variables

Confirm that the Lambda still has:

| Key | Value |
|---|---|
| `POLLS_TABLE` | `polls` |

---

## 6. Configure API Gateway routes

Open:

```text
API Gateway → pollnow-api
```

Add these new routes:

| Method | Path | Integration |
|---|---|---|
| `POST` | `/auth/register` | `registerUser` |
| `POST` | `/auth/login` | `loginUser` |

Keep the existing routes:

| Method | Path | Integration |
|---|---|---|
| `POST` | `/polls` | `createPoll` |
| `GET` | `/polls` | `listPolls` |

Important: after this phase, `POST /polls` and `GET /polls` expect the frontend to send the user id in the `x-user-id` header.

---

## 7. Update CORS configuration

In API Gateway, update CORS with:

| CORS setting | Value |
|---|---|
| Allowed origins | `*` |
| Allowed methods | `GET, POST, PUT, PATCH, DELETE, OPTIONS` |
| Allowed headers | `Content-Type, x-user-id` |

---

## 8. Test registration

Request:

```http
POST /auth/register
Content-Type: application/json
```

Body:

```json
{
  "username": "ruben",
  "email": "ruben@email.com",
  "password": "123456"
}
```

Expected response:

```json
{
  "userId": "uuid",
  "username": "ruben",
  "email": "ruben@email.com",
  "createdAt": "timestamp"
}
```

---

## 9. Test login

Request:

```http
POST /auth/login
Content-Type: application/json
```

Body:

```json
{
  "identifier": "ruben@email.com",
  "password": "123456"
}
```

Expected response:

```json
{
  "userId": "uuid",
  "username": "ruben",
  "email": "ruben@email.com"
}
```

---

## 10. Test poll creation with owner

Request:

```http
POST /polls
Content-Type: application/json
x-user-id: USER_ID_FROM_LOGIN
```

Body:

```json
{
  "title": "Melhor dia para reunião?",
  "options": ["Segunda", "Terça", "Quarta"],
  "closesAt": "2026-06-01T18:00:00.000Z",
  "ownerEmail": "ruben@email.com",
  "ownerUsername": "ruben"
}
```

Expected result:

- HTTP `201`;
- new item created in the `polls` table;
- the item includes `ownerId`.

---

## 11. Test listing polls by user

Request:

```http
GET /polls
x-user-id: USER_ID_FROM_LOGIN
```

Expected result:

- only polls where `ownerId` matches the logged-in user are returned.

---

## 12. Important note about old polls

Polls created before this phase do not have `ownerId`.

This means they will not appear in the user dashboard after this update.

To keep old polls visible, manually edit them in DynamoDB and add:

| Attribute | Value |
|---|---|
| `ownerId` | user id from the logged-in user |
| `ownerEmail` | user email |
| `ownerUsername` | username |

Alternatively, create new polls after logging in.

---

## Final checklist

Before moving to the frontend phase, confirm:

- [ ] DynamoDB table `users` exists.
- [ ] Lambda `registerUser` exists and is deployed.
- [ ] Lambda `loginUser` exists and is deployed.
- [ ] `registerUser` has `USERS_TABLE=users`.
- [ ] `loginUser` has `USERS_TABLE=users`.
- [ ] `createPoll` was updated and deployed.
- [ ] `listPolls` was updated and deployed.
- [ ] API Gateway has `POST /auth/register`.
- [ ] API Gateway has `POST /auth/login`.
- [ ] CORS allows `Content-Type` and `x-user-id`.
- [ ] Register test works.
- [ ] Login test works.
- [ ] Creating a poll with `x-user-id` works.
- [ ] Listing polls with `x-user-id` returns only that user's polls.
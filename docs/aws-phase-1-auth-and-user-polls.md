# AWS Phase 1 — Auth and User Poll Separation

## Goal

This phase adds simple user authentication and separates polls by user.

After this phase:

- users can register with username, email and password;
- users can log in;
- each poll stores an `ownerId`;
- `GET /polls` only returns polls created by the logged-in user.

---

## 1. Create DynamoDB table `users`

Go to:

```text
AWS Console → DynamoDB → Create table

Use:

Table name: users
Partition key: userId
Partition key type: String
Table settings: Default settings

Create the table.

Expected item structure:

{
  "userId": "uuid",
  "username": "ruben",
  "email": "ruben@email.com",
  "passwordHash": "salt:hash",
  "createdAt": "2026-05-28T20:00:00.000Z"
}
2. Create Lambda registerUser

Create a new Lambda:

Lambda → Create function → Author from scratch
Function name: registerUser
Runtime: Node.js 22.x
Permissions: Use existing role → LabRole

Copy the code from:

backend/lambdas/registerUser/index.mjs

Deploy the Lambda.

Environment variables

Add:

USERS_TABLE = users
3. Create Lambda loginUser

Create a new Lambda:

Lambda → Create function → Author from scratch
Function name: loginUser
Runtime: Node.js 22.x
Permissions: Use existing role → LabRole

Copy the code from:

backend/lambdas/loginUser/index.mjs

Deploy the Lambda.

Environment variables

Add:

USERS_TABLE = users
4. Update Lambda createPoll

Open Lambda:

createPoll

Replace the code with:

backend/lambdas/createPoll/index.mjs

Deploy the Lambda.

Existing environment variables

Confirm that it still has:

POLLS_TABLE = polls
S3_BUCKET = pollnow-banners-ricardodr14

No USERS_TABLE is needed in this Lambda.

5. Update Lambda listPolls

Open Lambda:

listPolls

Replace the code with:

backend/lambdas/listPolls/index.mjs

Deploy the Lambda.

Existing environment variables

Confirm that it still has:

POLLS_TABLE = polls
6. API Gateway routes

Open API Gateway:

API Gateway → pollnow-api

Add these routes:

POST /auth/register → registerUser
POST /auth/login    → loginUser

Existing route:

POST /polls → createPoll
GET /polls  → listPolls

must remain unchanged, but they now expect the frontend to send the user id.

7. CORS configuration

Update CORS in API Gateway.

Allowed origins:

*

Allowed methods:

GET, POST, PUT, PATCH, DELETE, OPTIONS

Allowed headers:

Content-Type, x-user-id
8. Test register

Request:

POST /auth/register
Content-Type: application/json

Body:

{
  "username": "ruben",
  "email": "ruben@email.com",
  "password": "123456"
}

Expected response:

{
  "userId": "uuid",
  "username": "ruben",
  "email": "ruben@email.com",
  "createdAt": "timestamp"
}
9. Test login

Request:

POST /auth/login
Content-Type: application/json

Body:

{
  "identifier": "ruben@email.com",
  "password": "123456"
}

Expected response:

{
  "userId": "uuid",
  "username": "ruben",
  "email": "ruben@email.com"
}
10. Test create poll with owner

Request:

POST /polls
Content-Type: application/json
x-user-id: USER_ID_FROM_LOGIN

Body:

{
  "title": "Melhor dia para reunião?",
  "options": ["Segunda", "Terça", "Quarta"],
  "closesAt": "2026-06-01T18:00:00.000Z",
  "ownerEmail": "ruben@email.com",
  "ownerUsername": "ruben"
}

Expected result:

HTTP 201;
new item in polls;
item has ownerId.
11. Test list user polls

Request:

GET /polls
x-user-id: USER_ID_FROM_LOGIN

Expected result:

only polls where ownerId matches the logged user.
12. Important note about old polls

Polls created before this phase do not have ownerId.

That means they will not appear in the user dashboard after this update.

To keep old polls visible, manually edit them in DynamoDB and add:

ownerId = userId
ownerEmail = user email
ownerUsername = username

Otherwise, create new polls after logging in.


---

# 6. Commit sugerido

Depois de criares/substituíres estes ficheiros:

```bash
git add backend/lambdas/registerUser/index.mjs \
        backend/lambdas/loginUser/index.mjs \
        backend/lambdas/createPoll/index.mjs \
        backend/lambdas/listPolls/index.mjs \
        docs/aws-phase-1-auth-and-user-polls.md

git commit -m "feat: add simple auth and user scoped polls"
git push

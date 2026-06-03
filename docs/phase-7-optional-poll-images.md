# Phase 7 — Optional Poll Images Checklist

## Objective

This phase adds optional images to PollNow polls.

After this phase, poll owners can:

- create a poll with an optional image;
- preview the image before creating the poll;
- create a poll without image normally;
- display the poll image in the dashboard;
- display the poll image on the public voting page;
- display the poll image on the results page;
- display the poll image on the share/QR Code page.

The image can be used as:

- a candidate photo;
- an organization logo;
- an event poster;
- a class/school image;
- any visual identification for the poll.

---

## Branch

Use a separate branch:

```bash
phase-7-optional-poll-images
```

If the branch already exists locally:

```bash
git checkout phase-7-optional-poll-images
git merge main
```

If creating from `main`:

```bash
git checkout main
git pull origin main
git checkout -b phase-7-optional-poll-images
```

---

## Files changed

This phase changes:

```text
backend/lambdas/createPoll/index.mjs
frontend/src/pages/Home.jsx
frontend/src/pages/Vote.jsx
frontend/src/pages/Results.jsx
frontend/src/pages/SharePoll.jsx
frontend/src/App.css
```

This phase adds:

```text
docs/phase-7-optional-poll-images.md
```

---

## Feature behavior

Poll image is optional.

A poll can be created with:

```text
title
description
options
closing date
notification email
optional image
```

A poll can also be created without image.

Required fields remain:

```text
title
at least 2 options
closing date
notification email
```

Optional field:

```text
poll image
```

---

## Supported image formats

Allowed formats:

```text
JPG
PNG
WEBP
```

Maximum image size:

```text
1.5MB
```

The frontend validates:

- file type;
- file size;
- preview before upload.

The backend also validates:

- file type;
- file size;
- base64 payload;
- notification email.

---

## Backend change — `createPoll`

The `createPoll` Lambda now supports optional image upload.

If the frontend sends:

```json
{
  "image": "base64-image-content",
  "imageContentType": "image/png"
}
```

then the Lambda uploads the image to S3 and stores the image metadata in DynamoDB.

Fields stored in the `polls` table:

```text
imageUrl
imageKey
imageContentType
```

If no image is sent, these fields are stored as empty strings and the poll is created normally.

---

## Important backend validation

The backend now also requires a notification email.

This is important because the frontend already requires the email, but the backend must also protect the API if someone bypasses the frontend.

Required email field comes from:

```text
authorPhone
```

or fallback:

```text
ownerEmail
```

If no valid email exists, `createPoll` returns:

```text
400 — Email para notificação obrigatório
```

or:

```text
400 — Email para notificação inválido
```

---

## AWS services involved

| Service | Purpose |
|---|---|
| AWS Lambda | Handles poll creation and image upload |
| Amazon S3 | Stores poll images |
| DynamoDB | Stores poll data and image URL |
| Amazon SNS | Sends poll creation notification if configured |
| API Gateway | Existing `POST /polls` route triggers `createPoll` |

---

## AWS changes required

Only the existing Lambda needs to be updated.

No new Lambda is required.

No new API Gateway route is required.

Update this Lambda:

```text
createPoll
```

Copy the code from:

```text
backend/lambdas/createPoll/index.mjs
```

Then click:

```text
Deploy
```

---

## Environment variables for `createPoll`

Confirm that `createPoll` has these variables:

| Key | Value |
|---|---|
| `POLLS_TABLE` | `polls` |
| `S3_BUCKET` | existing S3 bucket name |
| `SNS_REGION` | `us-east-1` |
| `SNS_TOPIC_ARN` | SNS topic ARN, if SNS notifications are enabled |
| `FRONTEND_URL` | Netlify frontend URL |

Example:

```text
POLLS_TABLE = polls
S3_BUCKET = pollnow-banners-ricardodr14
SNS_REGION = us-east-1
SNS_TOPIC_ARN = arn:aws:sns:us-east-1:ACCOUNT_ID:pollnow-notifications
FRONTEND_URL = https://pollnow.netlify.app
```

If `SNS_TOPIC_ARN` is missing, the Lambda still creates the poll and skips the notification.

---

## S3 permissions

The Lambda execution role must be able to upload images to S3.

Confirm that the role used by `createPoll`, usually `LabRole`, has permission for:

```text
s3:PutObject
```

on the image bucket.

---

## S3 image access

The frontend displays images using the `imageUrl` stored in DynamoDB.

The generated image URL format is:

```text
https://BUCKET_NAME.s3.amazonaws.com/banners/POLL_ID.extension
```

For images to appear in the frontend, the S3 object must be readable by the browser.

Depending on the current bucket setup, one of these must be true:

- the bucket/object allows public read access; or
- the project uses another valid public delivery method.

For this academic project, the simplest option is usually to confirm that uploaded poll images are publicly readable.

---

## API Gateway

No new routes are required.

The existing route remains:

| Method | Path | Lambda |
|---|---|---|
| `POST` | `/polls` | `createPoll` |

Payload now optionally includes:

```json
{
  "image": "base64-image-content",
  "imageContentType": "image/png"
}
```

---

## Frontend changes

### Dashboard

The dashboard now supports:

- image upload;
- image preview;
- image removal before creation;
- image display in poll cards.

The upload field appears as:

```text
Imagem opcional da sondagem
```

When editing a poll, image editing is disabled in this phase.

---

### Vote page

The voting page now displays the poll image when available.

If the poll has no image, the page works normally.

---

### Results page

The results page now displays the poll image when available.

If the poll has no image, the chart and results work normally.

---

### Share page

The share page now displays the poll image when available.

The QR Code still points to:

```text
/vote/{pollId}
```

This means users scanning the QR Code can vote or view results, but cannot edit, delete or close the poll.

---

## Testing checklist

### 1. Create poll without image

1. Log in.
2. Create a poll without selecting an image.
3. Submit the poll.

Expected result:

- poll is created successfully;
- poll appears in dashboard;
- voting page works;
- results page works;
- share page works.

---

### 2. Create poll with image

1. Log in.
2. Create a poll.
3. Select a JPG, PNG or WEBP image under 1.5MB.
4. Confirm that preview appears.
5. Submit the poll.

Expected result:

- poll is created successfully;
- image is uploaded to S3;
- `imageUrl` is stored in DynamoDB;
- image appears in dashboard;
- image appears in `/vote/{pollId}`;
- image appears in `/results/{pollId}`;
- image appears in `/share/{pollId}`.

---

### 3. Test invalid image format

Try uploading an unsupported file type.

Example:

```text
PDF
TXT
GIF
```

Expected result:

```text
Formato inválido. Usa JPG, PNG ou WEBP.
```

---

### 4. Test image size limit

Try uploading an image larger than:

```text
1.5MB
```

Expected result:

```text
A imagem deve ter no máximo 1.5MB.
```

---

### 5. Test required notification email

Try creating a poll without notification email.

Expected result:

Frontend should block it.

If called directly through API, backend should return:

```text
400 — Email para notificação obrigatório
```

---

### 6. Test public pages

Open:

```text
/vote/{pollId}
/results/{pollId}
/share/{pollId}
```

Expected result:

- all pages load;
- image appears when poll has image;
- pages still work when poll has no image.

---

### 7. Test S3 access

After creating a poll with image:

1. Open DynamoDB.
2. Find the poll.
3. Copy `imageUrl`.
4. Open it in a browser.

Expected result:

- image opens normally.

If Access Denied appears, S3 object/bucket public read configuration must be checked.

---

## Common problems

### Image does not appear in frontend

Check:

- `imageUrl` exists in DynamoDB;
- image exists in S3;
- S3 object is publicly readable;
- browser console does not show 403 or CORS error.

---

### Poll creation fails with image

Check CloudWatch logs for `createPoll`.

Possible causes:

- image larger than 1.5MB;
- unsupported format;
- missing `S3_BUCKET`;
- Lambda role missing `s3:PutObject`;
- bucket name incorrect.

---

### Poll creation fails without image

Check if required fields are present:

```text
title
options
closesAt
authorPhone or ownerEmail
```

Image is optional and should not block creation.

---

### SNS email not sent

This phase does not create a new SNS topic.

If SNS notification is expected, check:

- `SNS_TOPIC_ARN`;
- confirmed SNS subscription;
- Lambda permission through `LabRole`;
- CloudWatch logs.

If `SNS_TOPIC_ARN` is missing, the Lambda logs:

```text
SNS_TOPIC_ARN not configured. Notification skipped.
```

and continues creating the poll.

---

## Final checklist

Before approving merge into `main`, confirm:

- [ ] Branch `phase-7-optional-poll-images` was created.
- [ ] `createPoll` was updated.
- [ ] `Home.jsx` supports optional image upload.
- [ ] `Vote.jsx` displays poll image.
- [ ] `Results.jsx` displays poll image.
- [ ] `SharePoll.jsx` displays poll image.
- [ ] `App.css` includes image styles.
- [ ] Poll can be created without image.
- [ ] Poll can be created with image.
- [ ] Invalid image formats are rejected.
- [ ] Images over 1.5MB are rejected.
- [ ] Image is uploaded to S3.
- [ ] `imageUrl` is saved in DynamoDB.
- [ ] Image appears in dashboard.
- [ ] Image appears on vote page.
- [ ] Image appears on results page.
- [ ] Image appears on share page.
- [ ] Notification email is required.
- [ ] Existing voting still works.
- [ ] Existing results still work.
- [ ] Existing QR/share flow still works.
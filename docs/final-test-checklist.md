# PollNow — Final Test Checklist

## Objective

This checklist validates the final version of PollNow before the project presentation and report submission.

It should be used after all phases are implemented and deployed.

---

## 1. Frontend access

### 1.1 Open live application

Open:

```text
https://pollnow.netlify.app/
```

Expected result:

- application loads correctly;
- browser tab shows `PollNow`;
- dashboard/login page appears without visual errors.

---

## 2. Authentication

### 2.1 Register new user

1. Open the register page.
2. Create a new user with username, email and password.

Expected result:

- user is created successfully;
- user can log in after registration.

---

### 2.2 Login

1. Open the login page.
2. Enter valid credentials.

Expected result:

- user logs in successfully;
- dashboard opens;
- username appears in the navigation bar.

---

### 2.3 Logout

1. Click `Sair`.

Expected result:

- user is logged out;
- private dashboard is no longer accessible without login.

---

## 3. User poll separation

### 3.1 Create poll with User 1

1. Login as User 1.
2. Create a poll.

Expected result:

- poll appears in User 1 dashboard.

---

### 3.2 Login as User 2

1. Logout from User 1.
2. Login as User 2.

Expected result:

- User 2 does not see User 1 polls.

---

## 4. Poll creation

### 4.1 Create poll without image

1. Login.
2. Create a poll with:
   - title;
   - description;
   - at least 2 options;
   - closing date;
   - notification email.
3. Do not select an image.

Expected result:

- poll is created successfully;
- share page opens;
- poll appears in dashboard;
- public vote page works;
- results page works.

---

### 4.2 Create poll with image

1. Login.
2. Create a poll.
3. Select a JPG, PNG or WEBP image under 1.5MB.
4. Submit.

Expected result:

- poll is created successfully;
- image preview appears before creation;
- image is uploaded to S3;
- `imageUrl` is saved in DynamoDB;
- image appears in dashboard;
- image appears on vote page;
- image appears on results page;
- image appears on share page.

---

### 4.3 Required notification email

Try creating a poll without notification email.

Expected result:

- frontend blocks creation;
- API also rejects the request if called directly.

Expected backend response:

```text
400 — Email para notificação obrigatório
```

---

### 4.4 Invalid image format

Try uploading unsupported files:

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

### 4.5 Image too large

Try uploading an image larger than:

```text
1.5MB
```

Expected result:

```text
A imagem deve ter no máximo 1.5MB.
```

---

## 5. Poll management

### 5.1 Edit poll

1. Click `Editar`.
2. Change title, description, options or closing date.
3. Save changes.

Expected result:

- form clearly enters edit mode;
- poll is updated;
- dashboard shows the updated data.

---

### 5.2 Close poll manually

1. Click `Fechar`.
2. Confirm action.

Expected result:

- poll status changes to closed;
- voting is blocked;
- results remain visible.

---

### 5.3 Delete poll

1. Click `Eliminar`.
2. Confirm action.

Expected result:

- poll disappears from dashboard;
- poll is removed from DynamoDB;
- associated votes are removed if delete logic is active.

---

## 6. Voting

### 6.1 Vote first time

1. Open `/vote/{pollId}`.
2. Select an option.
3. Click `Votar`.

Expected result:

- vote is saved;
- user is redirected to results.

---

### 6.2 Change vote while open

1. Open the same poll again.
2. Select a different option.
3. Click `Alterar voto`.

Expected result:

- vote is updated;
- total votes do not increase incorrectly;
- results reflect the changed vote.

---

### 6.3 Vote on closed poll

1. Close a poll.
2. Open `/vote/{pollId}`.

Expected result:

- voting is blocked;
- clear message says the poll is closed.

---

## 7. Results

### 7.1 Results page

Open:

```text
/results/{pollId}
```

Expected result:

- title appears;
- image appears if poll has image;
- chart appears;
- result list appears;
- total votes appears;
- open polls show live update indicator.

---

## 8. Sharing and QR Code

### 8.1 Share page

Open:

```text
/share/{pollId}
```

Expected result:

- poll title appears;
- poll image appears if available;
- QR Code appears;
- public voting link appears;
- copy link works;
- download QR works.

---

### 8.2 QR Code scan

Scan the QR Code with a phone.

Expected result:

- opens `/vote/{pollId}`;
- user can vote if poll is open;
- user cannot edit, delete or close the poll.

---

## 9. SNS notifications

Confirm email notifications are received when:

- poll is created;
- poll is edited;
- poll is closed manually;
- poll is deleted;
- expired poll is processed by `checkExpired`.

Expected result:

- email arrives through SNS;
- message includes relevant poll information.

---

## 10. EventBridge

If EventBridge is active:

1. Create a poll with a short closing time.
2. Wait for the scheduled rule.

Expected result:

- `checkExpired` runs;
- expired poll is processed;
- SNS notification is sent;
- final results/export logic works if configured.

---

## 11. AWS validation

Confirm AWS resources:

- API Gateway routes are active;
- Lambda functions are deployed;
- DynamoDB tables contain correct data;
- S3 image bucket stores poll images;
- SNS topic has confirmed subscriptions;
- EventBridge rule is enabled;
- CloudWatch logs do not show critical errors.

---

## 12. Final acceptance checklist

Before presentation, confirm:

- [ ] Register works.
- [ ] Login works.
- [ ] Logout works.
- [ ] Polls are separated by user.
- [ ] Poll creation without image works.
- [ ] Poll creation with image works.
- [ ] Required notification email is enforced.
- [ ] Edit poll works.
- [ ] Close poll works.
- [ ] Delete poll works.
- [ ] Vote works.
- [ ] Vote update works.
- [ ] Closed poll blocks voting.
- [ ] Results page works.
- [ ] QR Code share works.
- [ ] Share page works.
- [ ] SNS emails work.
- [ ] S3 images load publicly.
- [ ] Netlify direct route refresh works.
- [ ] No major console errors.
- [ ] Final report screenshots are collected.
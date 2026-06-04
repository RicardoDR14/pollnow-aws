# PollNow — Final Test Checklist

Use this checklist to validate the full application before presentation.
All tests assume a clean deployment with all lambdas deployed and env vars set.

> **Note:** For notification tests (section 9), use a **new user** registered
> with a **real, accessible email**. Old accounts registered before phase 9 may
> not receive SNS emails.

---

## 1. Frontend access

- [ ] Open the Netlify URL — application loads without errors.
- [ ] Browser tab shows `PollNow`.
- [ ] Unauthenticated access redirects to login.

---

## 2. Authentication

- [ ] Register new user (username + real email + password ≥ 6 chars).
- [ ] Login with credentials → dashboard opens, username in navbar.
- [ ] Login with wrong password → error shown.
- [ ] Logout → private dashboard no longer accessible.

---

## 3. User isolation

- [ ] Create poll as User A.
- [ ] Login as User B → User A polls not visible.

---

## 4. Poll creation

- [ ] Create poll without image → poll appears in dashboard, share page opens.
- [ ] Create poll with JPG/PNG/WEBP image (< 1.5 MB) → image visible in
  dashboard, vote page, results page, share page.
- [ ] Upload unsupported format (PDF/GIF) → frontend blocks with message.
- [ ] Upload image > 1.5 MB → frontend blocks with message.
- [ ] Submit with empty title → blocked.
- [ ] Submit with < 2 options → blocked.
- [ ] Submit with past closing date → blocked.

---

## 5. Poll management

- [ ] Edit poll → form enters edit mode, changes saved, dashboard updates.
- [ ] Close poll manually → status changes, voting blocked.
- [ ] Delete poll → disappears from dashboard.
- [ ] Search by title / status / description → filters correctly.

---

## 6. Voting (anonymous, no login required)

- [ ] Open `/vote/{pollId}` without login → voting available.
- [ ] Vote on open poll → redirected to results.
- [ ] Open same poll again → can change vote.
- [ ] Open closed poll → voting blocked with clear message.

---

## 7. Results

- [ ] `/results/{pollId}` shows chart, percentages, totals.
- [ ] Open polls show live-update indicator.
- [ ] Results match votes cast.

---

## 8. QR Code sharing

- [ ] `/share/{pollId}` loads QR Code, public link, copy-link and download buttons.
- [ ] Scanning QR Code opens `/vote/{pollId}`.
- [ ] Share page does not expose edit / delete / close actions.

---

## 9. Per-owner email notifications

> Use an account registered with a real email you can access.

### Activate

- [ ] Dashboard shows notification card with "Ativar notificações" (off state).
- [ ] Click "Ativar notificações" → card changes to pending state with email address shown.
- [ ] SNS confirmation email arrives (check spam).
- [ ] Click the confirmation link.
- [ ] Log out → log back in → status is `on` → card shows "Notificações ativas".

### Result email

- [ ] Create a poll with a closing time a few minutes ahead.
- [ ] Cast votes.
- [ ] Wait up to 5 minutes after close time.
- [ ] Owner receives email: `Sondagem "<title>" fechou!` with results.
- [ ] CloudWatch `/aws/lambda/checkExpired` shows `SNS publish: sondagem ... | ownerId=...`.
- [ ] Poll status in DynamoDB changes to `notified`.
- [ ] Result CSV exists at `s3://<bucket>/results/<pollId>.csv`.
- [ ] Another user's account does **not** receive this email.

### Deactivate

- [ ] Click "Desativar notificações" → status returns to off.
- [ ] SNS Console → subscription removed (or pending expiry if was pending).
- [ ] Subsequent closed poll does not send email to this user.

### Known bug — conflict on re-subscribe

If clicking "Ativar notificações" returns the error
`"O teu email ja esta subscrito a este topico com configuracao diferente"`:

1. Go to SNS Console → Subscriptions.
2. Delete the existing subscription for this email.
3. Wait 30–60 seconds.
4. Click "Ativar notificações" again.

---

## 10. Admin SNS notifications

- [ ] Create poll → admin inbox receives `PollNow - Nova sondagem criada`.
- [ ] Edit poll → admin inbox receives notification.
- [ ] Close poll → admin inbox receives notification.
- [ ] Delete poll → admin inbox receives notification.

---

## 11. EventBridge

- [ ] `checkExpired` Lambda has EventBridge invoke permission.
- [ ] CloudWatch shows scheduled executions every ~5 minutes.

---

## 12. AWS resource check

- [ ] API Gateway — all routes active and CORS enabled.
- [ ] DynamoDB — `users`, `polls`, `votes` tables exist and contain correct data.
- [ ] S3 — poll images accessible publicly.
- [ ] SNS — `pollnow-notifications` topic exists; admin subscription confirmed.
- [ ] All 12 lambdas deployed with correct env vars.
- [ ] CloudWatch — no critical errors in recent logs.

---

## 13. Build check

```bash
cd frontend && npm run build
```

Expected: `Compiled successfully.`

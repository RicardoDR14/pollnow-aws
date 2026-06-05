# Phase 3 — QR Code Sharing Checklist

## Objective

This phase adds QR Code sharing to the PollNow dashboard.

After this phase, poll owners can:

- generate a QR Code for each poll;
- copy the public voting link;
- download the QR Code as a PNG image;
- share polls without giving access to edit, delete or close actions.

The QR Code points only to the public voting route:

```text
/vote/{pollId}
```

This route is public and does not expose owner/admin actions.

---

## Branch

Use a separate branch:

```bash
phase-3-qr-code-sharing
```

If Phase 2 has not been merged into `main`, create this branch from Phase 2:

```bash
git checkout phase-2-manage-polls
git pull
git checkout -b phase-3-qr-code-sharing
```

If Phase 2 has already been merged into `main`:

```bash
git checkout main
git pull
git checkout -b phase-3-qr-code-sharing
```

---

## Frontend dependency

Install the QR Code dependency inside the frontend folder:

```bash
cd frontend
npm install qrcode.react
```

This should update:

```text
frontend/package.json
frontend/package-lock.json
```

Commit both files if both exist.

---

## Files changed

This phase changes:

```text
frontend/src/pages/Home.jsx
frontend/package.json
frontend/package-lock.json
```

This phase adds:

```text
docs/phase-3-qr-code-sharing.md
```

---

## What changed in `Home.jsx`

The dashboard now includes:

- QR Code generation for each poll;
- a `QR Code` button in each poll card;
- public voting link display;
- copy link button;
- download QR Code button.

The QR Code uses:

```text
/vote/{pollId}
```

Full URL format:

```text
https://your-site-url.netlify.app/vote/{pollId}
```

---

## Security behavior

The QR Code only gives access to the public voting page.

Users scanning the QR Code can:

- view the poll;
- vote if the poll is open;
- view results.

Users scanning the QR Code cannot:

- edit the poll;
- delete the poll;
- close the poll;
- access the private dashboard.

Admin actions remain inside the protected dashboard.

---

## AWS changes

No new AWS services are required.

No new Lambda functions are required.

No new API Gateway routes are required.

Existing public routes continue to be used:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/polls/{pollId}` | Load public poll |
| `POST` | `/polls/{pollId}/vote` | Submit vote |
| `GET` | `/polls/{pollId}/results` | View results |

---

## Netlify changes

No new environment variables are required.

A new deploy is required after merging this phase.

If testing from a branch, check that Netlify deploys the branch correctly.

---

## Testing checklist

### 1. Install and run locally

From the frontend folder:

```bash
npm install
npm start
```

Expected result:

- the React app starts without errors;
- no import error for `qrcode.react`.

---

### 2. Test QR Code button

1. Log in.
2. Open the dashboard.
3. Create a poll or use an existing poll.
4. Click `QR Code`.

Expected result:

- QR Code appears;
- public voting link appears;
- buttons `Copiar link` and `Baixar QR` appear.

---

### 3. Test copy link

1. Click `Copiar link`.
2. Paste the copied link somewhere.

Expected result:

```text
https://your-site-url.netlify.app/vote/{pollId}
```

---

### 4. Test download QR

1. Click `Baixar QR`.

Expected result:

- browser downloads a PNG image;
- file name uses the poll id.

---

### 5. Test QR Code access

1. Scan the QR Code with a phone or open the copied link in an incognito window.
2. Confirm that it opens:

```text
/vote/{pollId}
```

Expected result:

- poll is visible;
- vote is possible if the poll is open;
- no edit/delete/close buttons are visible.

---

### 6. Test closed poll behavior

1. Close a poll from the dashboard.
2. Open its QR Code link.

Expected result:

- poll opens;
- voting is blocked because the poll is closed.

---

## Common problems

### Import error for `qrcode.react`

Run:

```bash
cd frontend
npm install qrcode.react
```

Then restart:

```bash
npm start
```

---

### QR Code does not download

Check the browser console.

The download button uses the canvas id:

```text
qr-{pollId}
```

If the QR Code is not expanded, the canvas will not exist.

---

### QR Code points to localhost

This is expected when testing locally.

Local example:

```text
http://localhost:3000/vote/{pollId}
```

In Netlify, it should become:

```text
https://your-site-url.netlify.app/vote/{pollId}
```

---

## Final checklist

Before approving merge into `main`, confirm:

- [ ] Branch `phase-3-qr-code-sharing` was created.
- [ ] `qrcode.react` was installed.
- [ ] `frontend/package.json` was updated.
- [ ] `frontend/package-lock.json` was updated if it exists.
- [ ] `Home.jsx` imports `QRCodeCanvas`.
- [ ] Dashboard shows a `QR Code` button for each poll.
- [ ] QR Code points to `/vote/{pollId}`.
- [ ] Copy link works.
- [ ] Download QR works.
- [ ] QR Code link works in incognito/private window.
- [ ] Public voting page does not show edit/delete/close actions.
- [ ] No AWS changes were required.
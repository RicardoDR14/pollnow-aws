# Phase 6 — UI Polish and Share Page Checklist

## Objective

This phase improves the PollNow interface and separates poll sharing into its own page.

After this phase:

- the browser tab title shows `PollNow`;
- the visual style uses the new green/celadon color palette;
- the dashboard looks less empty and more polished;
- creating a poll automatically opens a new share page;
- QR Code is displayed on `/share/{pollId}`;
- the dashboard no longer renders QR Codes inside poll cards;
- Netlify supports direct access to React routes.

---

## Branch

Use a separate branch:

```bash
phase-6-ui-polish-share-page
```

If Phase 5 has not been merged into `main`:

```bash
git checkout phase-5-sns-action-notifications
git pull
git checkout -b phase-6-ui-polish-share-page
```

If Phase 5 has already been merged into `main`:

```bash
git checkout main
git pull
git checkout -b phase-6-ui-polish-share-page
```

---

## Files changed

This phase changes:

```text
frontend/public/index.html
frontend/src/App.jsx
frontend/src/components/Navbar.jsx
frontend/src/pages/Home.jsx
frontend/src/App.css
```

This phase adds:

```text
frontend/public/_redirects
frontend/src/pages/SharePoll.jsx
docs/phase-6-ui-polish-share-page.md
```

---

## Dependency

This phase uses the dependency already introduced for QR Codes:

```bash
cd frontend
npm install qrcode.react
```

If it is already installed, no action is needed.

---

## Browser tab title

Update:

```text
frontend/public/index.html
```

Change:

```html
<title>React App</title>
```

to:

```html
<title>PollNow</title>
```

---

## Netlify redirects

Create:

```text
frontend/public/_redirects
```

Content:

```text
/* /index.html 200
```

This is needed so Netlify supports direct access to routes like:

```text
/share/{pollId}
/vote/{pollId}
/results/{pollId}
```

---

## New share page

A new route was added:

```text
/share/{pollId}
```

This page shows:

- poll title;
- poll description;
- poll status;
- QR Code;
- public voting link;
- copy link button;
- download QR button;
- button to open voting;
- button to open results.

The QR Code points to:

```text
/vote/{pollId}
```

This means users who scan the QR Code can only vote or see results. They cannot edit, delete or close the poll.

---

## Dashboard behavior

After creating a poll:

- the app opens `/share/{pollId}` in a new browser tab/window;
- the dashboard remains available for management;
- if the browser blocks the new window, the share link appears in the dashboard.

The poll card now has a `Partilhar` button that opens:

```text
/share/{pollId}
```

---

## AWS changes

No new AWS services are required.

No new Lambda functions are required.

No new API Gateway routes are required.

Existing public route used:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/polls/{pollId}` | Load poll data for share page |

---

## Netlify changes

A new deploy is required.

Confirm that the build includes:

```text
frontend/public/_redirects
```

After deployment, test opening directly:

```text
https://your-netlify-site.netlify.app/share/{pollId}
```

Expected result:

- the share page opens normally;
- no 404 error.

---

## Testing checklist

### 1. Tab title

Open the app in Chrome.

Expected result:

```text
PollNow
```

appears in the browser tab.

---

### 2. Dashboard layout

Open the dashboard.

Expected result:

- green/celadon design is applied;
- dashboard hero is visible;
- stats show total/open/closed polls;
- cards look more polished.

---

### 3. Create poll

Create a new poll.

Expected result:

- poll is created;
- a new tab/window opens with `/share/{pollId}`;
- QR Code appears on that page.

---

### 4. Share button

Click `Partilhar` on an existing poll.

Expected result:

- `/share/{pollId}` opens in a new tab/window;
- QR Code and public link appear.

---

### 5. QR Code

Scan the QR Code or open the copied link.

Expected result:

- opens `/vote/{pollId}`;
- user can vote if poll is open;
- user cannot edit/delete/close.

---

### 6. Netlify route refresh

Open `/share/{pollId}` directly in a browser tab and refresh.

Expected result:

- route still works;
- no Netlify 404.

---

## Final checklist

Before approving merge into `main`, confirm:

- [ ] Branch `phase-6-ui-polish-share-page` was created.
- [ ] Browser tab title changed to PollNow.
- [ ] `_redirects` was added.
- [ ] `SharePoll.jsx` was added.
- [ ] `/share/{pollId}` route works.
- [ ] Creating a poll opens the share page.
- [ ] `Partilhar` opens the share page.
- [ ] QR Code points to `/vote/{pollId}`.
- [ ] Dashboard design uses the new color palette.
- [ ] Netlify direct route refresh works.


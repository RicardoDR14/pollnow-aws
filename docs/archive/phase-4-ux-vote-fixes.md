# Phase 4 — UX Fixes and Vote Update Checklist

## Objective

This phase improves the user experience and voting behavior.

It fixes:

- poll edit mode not being visually clear;
- QR Code appearing displaced inside the poll card;
- voting being blocked after the first vote;
- closed polls needing a clearer message.

After this phase:

- users can change their vote while the poll is open;
- users cannot vote or change vote after the poll is closed;
- poll sharing should use a popup/modal with QR Code and link;
- edit mode should be visually clear in the dashboard.

---

## Branch

Use a separate branch:

```bash
phase-4-ux-vote-fixes
```

If Phase 3 has not been merged into `main`:

```bash
git checkout phase-3-qr-code-sharing
git pull
git checkout -b phase-4-ux-vote-fixes
```

If Phase 3 has already been merged into `main`:

```bash
git checkout main
git pull
git checkout -b phase-4-ux-vote-fixes
```

---

## Files changed

This phase changes:

```text
backend/lambdas/castVote/index.mjs
frontend/src/pages/Vote.jsx
frontend/src/pages/Home.jsx
```

This phase adds:

```text
docs/phase-4-ux-vote-fixes.md
```

---

## Backend change — `castVote`

The `castVote` Lambda now supports vote updates.

Before:

- one vote was stored;
- frontend blocked the user from voting again.

After:

- frontend sends a `voterId`;
- backend checks if the same `voterId` already voted in the poll;
- if yes, it updates the vote;
- if no, it creates a new vote.

---

## AWS changes

Update the existing Lambda:

```text
castVote
```

Copy the code from:

```text
backend/lambdas/castVote/index.mjs
```

Then click **Deploy**.

No new Lambda is required.

No new API Gateway route is required.

---

## Environment variables

Confirm `castVote` still has:

| Key | Value |
|---|---|
| `POLLS_TABLE` | `polls` |
| `VOTES_TABLE` | `votes` |

---

## API Gateway

No route changes are needed.

The existing route remains:

| Method | Path | Lambda |
|---|---|---|
| `POST` | `/polls/{pollId}/vote` | `castVote` |

---

## Frontend change — `Vote.jsx`

The public voting page now:

- creates a browser-level anonymous `voterId`;
- stores the current vote in `localStorage`;
- allows changing the vote while the poll is open;
- blocks vote changes if the poll is closed.

LocalStorage keys used:

```text
pollnow_voter_id
pollnow_votes
```

---

## Frontend change — `Home.jsx`

The dashboard should be updated so that:

- edit mode is visually obvious;
- sharing uses a popup/modal;
- QR Code is not rendered awkwardly inside the poll card;
- button should say `Partilhar` instead of just showing QR inline.

---

## Testing checklist

### 1. Test first vote

1. Open a poll through `/vote/{pollId}`.
2. Select an option.
3. Click `Votar`.

Expected result:

- vote is saved;
- user is redirected to results.

---

### 2. Test vote change

1. Open the same poll again while it is still open.
2. Select another option.
3. Click `Alterar voto`.

Expected result:

- vote is updated;
- results reflect only one vote from that browser/voter;
- total votes should not increase if only the option changed.

---

### 3. Test closed poll

1. Close the poll.
2. Open `/vote/{pollId}`.
3. Try to vote.

Expected result:

- voting is blocked;
- message says the poll is closed.

---

### 4. Test sharing popup

1. Open dashboard.
2. Click `Partilhar`.
3. Confirm a popup/modal opens.

Expected result:

- QR Code appears inside popup/modal;
- public voting link appears;
- copy link works;
- QR Code opens `/vote/{pollId}`.

---

### 5. Test edit visual state

1. Click `Editar` on a poll.

Expected result:

- dashboard clearly shows that the user is editing an existing poll;
- the form is visually different from normal create mode;
- user can cancel editing.

---

## Common problems

### Total votes increases when changing vote

Cause:

```text
castVote Lambda was not updated in AWS
```

Fix:

```text
Deploy updated backend/lambdas/castVote/index.mjs to Lambda castVote
```

---

### Vote update does not work

Check if the request body includes:

```json
{
  "option": "Option name",
  "voterId": "browser-id"
}
```

---

### Closed poll still allows voting

Check:

- poll `status`;
- `closesAt`;
- deployed version of `castVote`.

---

## Final checklist

Before approving merge into `main`, confirm:

- [ ] Branch `phase-4-ux-vote-fixes` was created.
- [ ] `castVote` Lambda was updated in the repository.
- [ ] `castVote` Lambda was updated in AWS.
- [ ] `Vote.jsx` allows changing vote while open.
- [ ] Vote change does not increase total votes.
- [ ] Closed poll blocks voting.
- [ ] Edit mode is visually clear.
- [ ] Share QR Code opens in a popup/modal.
- [ ] Public voting link still works without login.

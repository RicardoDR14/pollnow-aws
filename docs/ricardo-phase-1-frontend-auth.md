# Phase 1 Frontend Auth Checklist

## Goal

Add frontend authentication screens and scope the dashboard to the logged-in user.

## Implemented

- Login page at `/login`.
- Register page at `/register`.
- User data stored in `localStorage` under `pollnow_user`.
- Dashboard redirects anonymous users to `/login`.
- Poll creation sends the logged-in user id in the `x-user-id` header.
- Poll listing sends the logged-in user id in the `x-user-id` header.
- Navbar shows login/register links for anonymous users.
- Navbar shows the username and logout button for logged-in users.

## Environment

Create `frontend/.env` from `frontend/.env.example` and set:

```text
REACT_APP_API_URL=https://your-api-id.execute-api.your-region.amazonaws.com
```

## Manual Test

- Register a new user.
- Confirm the app redirects to the dashboard.
- Create a poll while logged in.
- Confirm the poll appears in "Minhas sondagens".
- Log out.
- Log back in.
- Confirm only that user's polls are listed.

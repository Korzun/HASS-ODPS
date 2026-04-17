# HASS-ODPS User Management Design Spec

**Date:** 2026-04-17  
**Status:** Approved

## Overview

Add a Users tab to the web UI that lets the admin view all registered KOSync users, inspect their reading progress, and delete accounts. Deleting a user also deletes all their progress records.

---

## Architecture

Two additions to the existing layered structure:

- **`app/services/UserStore.ts`** — three new methods: `listUsers`, `getUserProgress`, `deleteUser`
- **`app/routes/users.ts`** — new Express router for user management API, mounted at `/api/users`
- **`app/app.ts`** — mount the new router
- **`app/public/index.html`** — tab bar + Users tab (frontend only, no new files)

No new database tables. Uses the existing `users` and `progress` tables.

---

## UserStore Changes

### New Methods

**`listUsers(): { username: string; progressCount: number }[]`**

Returns all rows from the `users` table, each annotated with the count of their `progress` rows. Ordered by username ascending.

```sql
SELECT u.username, COUNT(p.document) AS progressCount
FROM users u
LEFT JOIN progress p ON p.username = u.username
GROUP BY u.username
ORDER BY u.username ASC
```

**`getUserProgress(username: string): Progress[]`**

Returns all progress records for a user, ordered by `timestamp` descending (most recent first).

```sql
SELECT document, progress, percentage, device, device_id, timestamp
FROM progress
WHERE username = ?
ORDER BY timestamp DESC
```

Returns `[]` if the user has no progress records.

**`deleteUser(username: string): boolean`**

Deletes the user and all their progress records atomically in a transaction. Returns `false` if the user does not exist (no rows deleted from `users`).

```sql
-- in a transaction:
DELETE FROM progress WHERE username = ?
DELETE FROM users WHERE username = ?
-- return false if second DELETE affected 0 rows
```

---

## API Endpoints — `app/routes/users.ts`

All routes protected by `sessionAuth` middleware applied at router level.

| Method | Path | Response |
|--------|------|----------|
| GET | `/api/users` | `200` — `{ username: string; progressCount: number }[]` |
| GET | `/api/users/:username/progress` | `200` — `Progress[]`; `404` if user not found |
| DELETE | `/api/users/:username` | `204` on success; `404` if user not found |

### Logging (`logger('Users')`)

| Level | Event |
|-------|-------|
| debug | `Users list fetched (N users)` |
| debug | `Progress fetched for "${username}" (N records)` |
| warn | `Progress fetch for unknown user "${username}"` |
| info | `User "${username}" deleted` |
| warn | `Delete attempted for unknown user "${username}"` |

---

## App Wiring — `app/app.ts`

Mount the users router after the OPDS and KOSync routers:

```typescript
import { createUsersRouter } from './routes/users';
// ...
app.use('/api/users', createUsersRouter(userStore));
```

`sessionAuth` is applied inside `createUsersRouter` at router level, consistent with how the UI router handles protected routes.

---

## Frontend — `app/public/index.html`

### Tab Bar

Added below the `<header>`. Two tabs: **Library** and **Users**. Clicking a tab:
- Sets the active tab style (underline / highlight)
- Shows the corresponding section (`#library-section` or `#users-section`)
- Hides the other section
- Loads data for the newly active tab if not yet loaded

### Users Section (`#users-section`)

- On first activation, fetches `GET /api/users`
- Renders a list of user rows, each showing:
  - Username
  - Synced book count (from `progressCount`)
  - Expand/collapse chevron (▶ / ▼)
  - Delete button (🗑)
- Empty state: "No KOSync users registered yet."

### Expandable Progress Detail

Clicking a user row:
1. If not yet loaded, fetches `GET /api/users/:username/progress`
2. Expands inline below the row showing progress records:
   - Document identifier (filename as sent by KoReader)
   - Percentage (formatted as e.g. `68%`)
   - Device name
   - Last sync time (relative: "2h ago", "3d ago")
3. Clicking again collapses the row (cached data, no re-fetch)

### Delete User

- Clicking 🗑 shows a `confirm()` dialog: `Delete user "alice" and all their reading progress?`
- On confirm, calls `DELETE /api/users/:username`
- On `204`: removes the row from the UI
- On `404`: shows an inline error

---

## Testing

- Unit tests for new `UserStore` methods: `listUsers` (with and without progress), `getUserProgress`, `deleteUser` (success and unknown user), and cascade deletion (user deleted → progress gone)
- Integration tests for all three new API endpoints: happy paths, 404 cases, unauthenticated access (expect redirect)

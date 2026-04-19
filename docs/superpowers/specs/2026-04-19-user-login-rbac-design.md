# User Login & Role-Based Access Control Design

**Date:** 2026-04-19
**Status:** Approved

## Overview

Allow regular users (stored in the SQLite `users` table) to log into the web UI. Enforce role-based access control so regular users can browse and upload books but cannot delete books, trigger scans, or access user management features. The single hardcoded admin (`config.username` / `config.password`) retains full access.

## Access Control Matrix

| Feature | Admin | Regular User |
|---|---|---|
| Browse books | yes | yes |
| Upload books | yes | yes |
| Download books (OPDS) | yes | yes |
| Download books (API) | yes | yes (not shown in UI) |
| Delete books | yes | no |
| Scan library | yes | no |
| Users tab | yes | no |
| GET /api/users | yes | no |
| POST /api/users | yes | no |
| DELETE /api/users/:username | yes | no |
| GET /api/users/:username/progress | yes | no |

## Architecture

### Role Source

Admin status is determined at login time by comparing credentials against `config.username` / `config.password`. Users from the SQLite `users` table are always regular users. No role column is added to the database.

### Session Fields

Two new fields added to the existing express-session interface (`app/global.d.ts`):

```typescript
username?: string;   // set at login for both admin and regular users
isAdmin?: boolean;   // true only for the config admin
```

`authenticated` remains unchanged and is still the primary gate for `sessionAuth`.

## Backend Changes

### 1. `UserStore.validateUser(username, password): boolean`

New method on `UserStore` (`app/services/user-store.ts`). Hashes `password` with MD5 (same as `hashPassword`) and compares against the stored `key` for the given `username`. Returns `false` if the user does not exist. This promotes the inline check already used in OPDS/KOSync auth to a reusable method.

### 2. `POST /login` (`app/routes/ui.ts`)

Updated login flow:

1. Check admin: `username === config.username && password === config.password`
   - Match → `session.authenticated = true`, `session.isAdmin = true`, `session.username = config.username`
2. Else check users table: `userStore.validateUser(username, password)`
   - Match → `session.authenticated = true`, `session.isAdmin = false`, `session.username = username`
3. Neither → `401` with "Invalid credentials"

### 3. `GET /api/me` (`app/routes/ui.ts`)

New endpoint, protected by `sessionAuth`. Returns:

```json
{ "username": "alice", "isAdmin": false }
```

Called once by the frontend on page load to determine UI state.

### 4. `adminAuth` middleware (`app/middleware/auth.ts`)

New middleware function:

```typescript
function adminAuth(req, res, next) {
  if (!req.session.isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}
```

Applied after `sessionAuth` on all admin-only routes. `sessionAuth` handles the unauthenticated (401/redirect) case; `adminAuth` handles the insufficient-permissions (403) case.

### 5. Route Protection

`adminAuth` is added to the following routes:

- `DELETE /api/books/:id` — `routes/ui.ts`
- `POST /api/books/scan` — `routes/ui.ts`
- Entire `/api/users` router — added at the router level in `routes/users.ts` so all user management endpoints are covered in one place

## Frontend Changes (`app/public/index.html`)

### 1. `/api/me` Fetch on Load

Before rendering the page, fetch `GET /api/me` and store the result in a module-level variable (e.g., `currentUser`). All conditional rendering depends on `currentUser.isAdmin`.

### 2. Username Display

Add a header bar showing `Logged in as: <username>` with the logout button. Positioned above or inline with the tab bar, consistent with the existing layout style.

### 3. Conditional Element Visibility

After `/api/me` resolves, toggle `display: none` on elements based on `currentUser.isAdmin`:

- **Users tab button** — hidden for regular users
- **Users section** — hidden for regular users
- **Delete book button (🗑) per book row** — hidden for regular users
- **Scan button** — hidden for regular users

### 4. Tab Guard

On load, if `localStorage` contains `"users"` as the active tab and `currentUser.isAdmin` is false, fall back to `"library"`.

## Error Handling

- A regular user calling an admin API directly (e.g., via curl) receives `403 Forbidden` with `{ "error": "Forbidden" }`.
- The frontend hides the relevant UI but does not rely on that hiding as the security boundary — the backend enforces it.

## Testing

- Unit tests for `UserStore.validateUser` (valid credentials, wrong password, unknown user)
- Integration tests for `POST /login` covering: admin login, regular user login, invalid credentials
- Integration tests for `GET /api/me` covering: admin session, regular user session, unauthenticated
- Integration tests for admin-only routes (`DELETE /api/books/:id`, `POST /api/books/scan`, `GET /api/users`) verifying `403` for a regular user session and `200`/`204` for admin session

## Out of Scope

- Password change for regular users
- Multiple admin users
- Session persistence across server restarts (existing limitation, unchanged)
- Rate limiting on login attempts

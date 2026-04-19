# Admin User Registration Design Spec

**Date:** 2026-04-19
**Status:** Approved

## Overview

Allow the admin to manually create KOSync users through the web UI. Currently users can only self-register via KOReader's `/kosync/users/create` endpoint. This adds a simple inline form to the Users tab so the admin can pre-create accounts and hand credentials off to device owners.

---

## Backend

**New endpoint:** `POST /api/users` in `app/routes/users.ts`

Protected by the existing `sessionAuth` middleware (already applied to the whole router).

**Request body:**
```json
{ "username": "string", "password": "string" }
```

**Responses:**

| Status | Condition |
|--------|-----------|
| 201 `{ username }` | User created successfully |
| 400 `{ error: "Username and password are required" }` | Missing or empty fields |
| 409 `{ error: "Username already exists" }` | Duplicate username |

**Implementation:** validate fields, hash password via `UserStore.hashPassword()` (existing MD5 method — matches what KOReader sends on self-registration), call `userStore.createUser(username, hash)`. No changes to `UserStore` required.

---

## UI

An always-visible form at the top of `#users-section` in `app/public/index.html`, above `#user-list`.

**Layout:**
```
Register User
[Username______] [Password______] [Register]
← inline status message (status-ok / status-err)
```

**Behaviour:**
- Username and password inputs on one row with a "Register" button
- Submit button disabled while request is in flight
- On success: show "✓ User registered", clear form, reload user list
- On 409: show "✗ Username already taken"
- On 400: show "✗ Username and password are required"
- On network error: show "✗ Registration failed"

Uses existing `status-ok` / `status-err` CSS classes. No new styles required.

---

## Error Handling

All error states surfaced via inline status message below the form. No modals or page reloads on error. Consistent with the existing upload status pattern in the Library tab.

---

## Testing

Add to `app/routes/users.test.ts`:
- `POST /api/users` with valid credentials → 201
- `POST /api/users` with duplicate username → 409
- `POST /api/users` with missing/empty fields → 400
- `POST /api/users` without session → 401

No UI tests (consistent with existing project approach — web UI verified manually).

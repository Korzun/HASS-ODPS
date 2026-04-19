# Admin: Clear Synced Progress Per Book — Design Spec

**Date:** 2026-04-19
**Status:** Approved

## Overview

Allow admins to clear a specific KOSync progress record (user + book) from the Users tab in the web UI. The `UserStore.clearProgress(username, document)` method already exists; this feature wires it up with an admin API endpoint and a trash button in the expanded user view.

---

## Backend

**New endpoint** in `app/routes/users.ts` (already protected by `sessionAuth` + `adminAuth`):

```
DELETE /api/users/:username/progress/:document
```

| Case | Response |
|------|----------|
| Record deleted | `204 No Content` |
| User not found | `404 { error: 'User not found' }` |
| Progress record not found | `404 { error: 'Progress record not found' }` |

- Calls the existing `userStore.clearProgress(username, document)` — no new UserStore methods needed.
- `document` is URL-encoded in the path (KOReader document identifiers may contain slashes or special characters).

---

## Frontend

In `app/public/index.html`, inside the `toggleUser()` function where each progress item is rendered:

- Add a `🗑` trash button to each progress record, using the existing `.delete-btn` style.
- The progress item grid changes from `1fr auto` to `1fr auto auto` so the trash button sits in its own column without wrapping.
- On click: `confirm("Clear progress for \"<document>\" for user \"<username>\"?")`
- On confirm: `DELETE /api/users/:username/progress/:document`
  - `204` → remove the item from the DOM; decrement the progress count shown in the user row header; delete `expandedData[username]` so the next expand re-fetches fresh data from the server.
  - failure → `alert("Failed to clear progress.")`

### Visual layout (expanded user row)

```
┌─────────────────────────────────────────────────────────┐
│  alice                                    2 synced  🗑   │  ← user row (unchanged)
├─────────────────────────────────────────────────────────┤
│  some-book-hash-abc123          87%                 🗑   │
│  /mnt/books/other.epub          12%                 🗑   │
└─────────────────────────────────────────────────────────┘
```

---

## Testing

New tests in `app/routes/users.test.ts`:

- `204` when the progress record exists and is deleted
- `404` when the user does not exist
- `404` when the user exists but has no progress for that document
- `403` when called without admin privileges (covered by the existing `adminAuth` middleware guard tests)

No new `UserStore` unit tests required — `clearProgress` is already covered in `app/services/user-store.test.ts`.

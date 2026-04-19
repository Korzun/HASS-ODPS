# Reading Progress in Library View Design

**Date:** 2026-04-19
**Status:** Approved

## Overview

Show each logged-in regular user their own KOSync reading progress directly in the Library view. Series display a combined progress percentage. Users can clear progress per book. None of these features appear for the admin. Deleting a book from the library preserves its progress records in the database.

## Access Control

| Feature | Admin | Regular User |
|---|---|---|
| See reading progress on books | no | yes |
| See series progress % | no | yes |
| Clear reading status (per book) | no | yes |
| GET /api/my/progress | returns `[]` | returns own progress |
| DELETE /api/my/progress/:document | 403 | 204 / 404 |

## Backend

### 1. `UserStore.clearProgress(username, document): boolean`

New method in `app/services/user-store.ts`.

```sql
DELETE FROM progress WHERE username = ? AND document = ?
```

Returns `true` if a row was deleted, `false` if no record existed. Does not affect other users' records for the same document.

### 2. `GET /api/my/progress` (`app/routes/ui.ts`)

Protected by `sessionAuth`. Returns the logged-in user's progress as a slim array:

```json
[{ "document": "<book-id>", "percentage": 0.72 }, ...]
```

Returns `[]` for admin (no error). `percentage` is in the 0–1 range, matching the KOSync / SQLite storage format.

### 3. `DELETE /api/my/progress/:document` (`app/routes/ui.ts`)

Protected by `sessionAuth`.

- Admin → `403 Forbidden`
- Record not found for the logged-in user → `404`
- Deleted → `204 No Content`

### 4. Book Deletion — No Change

`BookStore.deleteBook` already only removes from the `books` table. Progress records for a deleted book are preserved (orphaned) in the `progress` table. This is the intended behaviour; no code change is required.

## Frontend (`app/public/index.html`)

### Data Loading

`loadBooks()` is updated to fetch books and progress in parallel:

```js
const [booksRes, progressRes] = await Promise.all([
  fetch('/api/books'),
  currentUser.isAdmin ? Promise.resolve({ ok: true, json: () => [] }) : fetch('/api/my/progress')
]);
```

A `Map<bookId, percentage>` (`progressMap`) is built from the progress response. Admin always has an empty map.

### Standalone Book Rows

When `progressMap` has an entry for a book:
- A `"72%"` badge (green, `#16a34a`) appears in the book-info area.
- A "Clear" text button appears to the right. Hidden for admin via the existing `user-mode` CSS class + `admin-only` mechanism (inverted: shown only in non-admin mode).

### Series Row (Library View)

Series progress = average `percentage` across all books in the series, where books with no progress entry count as `0`. If the average is `> 0`, the series-meta line gains a `"· 72%"` suffix. No "Clear" button on the series row — clearing is per-book inside the series page.

### Series Page (Individual Book Rows)

Each book row shows the same `"72%"` badge and "Clear" button as standalone rows.

### Clear Button Behaviour

1. Calls `DELETE /api/my/progress/:id`
2. On `204`: removes the entry from `progressMap` and re-renders the current view (library or series page) without a full page reload — same refresh pattern used by the existing delete-book flow.
3. On error: shows a brief inline error (consistent with existing upload/scan error style).

### Visual Style

- **Progress badge**: small `font-size:.75rem`, colour `#16a34a`, displayed inline after the book author/format line.
- **Clear button**: styled like `delete-btn` — transparent background, `#9ca3af` default, `#dc2626` on hover — labelled "Clear" with `font-size:.75rem`. Uses a new CSS class `user-only` with rule `body:not(.user-mode) .user-only { display:none !important }` so it is hidden for admin and visible for regular users (the inverse of the existing `admin-only` pattern).

## Testing

### Unit tests (`app/services/user-store.test.ts`)

- `clearProgress`: deletes an existing record → returns `true`
- `clearProgress`: no record exists → returns `false`
- `clearProgress`: does not affect another user's progress for the same document

### Integration tests (`app/routes/ui.test.ts`)

- `GET /api/my/progress` — regular user → returns own records
- `GET /api/my/progress` — admin → returns `[]`
- `GET /api/my/progress` — unauthenticated → redirect to `/login`
- `DELETE /api/my/progress/:document` — regular user, record exists → `204`
- `DELETE /api/my/progress/:document` — regular user, no record → `404`
- `DELETE /api/my/progress/:document` — admin → `403`

## Out of Scope

- Bulk "clear all progress" for a user (no global clear button)
- Progress shown in OPDS feeds
- Admin viewing their own progress
- Editing or manually setting progress from the UI

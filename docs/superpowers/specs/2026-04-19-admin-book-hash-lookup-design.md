# Admin User Screen: Book Name Lookup via Hash

**Date:** 2026-04-19  
**Status:** Approved

## Overview

The Admin Users tab currently shows raw 32-character partial MD5 hashes as the identifier for each progress record in a user's expanded row. This change resolves those hashes to human-readable book titles using data already available in the frontend.

## Architecture

Pure frontend change — no backend modifications required.

`cachedBooks` (a `Book[]` array populated by `loadBooks()` at app init via `GET /api/books`) is already available as a module-level variable. The `books.id` field is the same 32-char partial MD5 that `progress.document` stores, so a direct lookup by equality resolves any hash to its book metadata.

## Component Change

**File:** `app/public/index.html`  
**Function:** `toggleUser` (line ~576)

### Before

```html
<span class="prog-doc">${esc(p.document)}</span>
```

### After

For each progress record `p`, look up `cachedBooks.find(b => b.id === p.document)`:

```html
<!-- Book found in cachedBooks -->
<span class="prog-doc">
  The Name of the Wind
  <small style="display:block;font-size:0.75em;opacity:0.5;font-family:monospace">a1b2c3...32chars</small>
</span>

<!-- Book not found (fallback) -->
<span class="prog-doc">a1b2c3...32chars</span>
```

The `<small>` element uses inline styles (consistent with this file's existing style approach).

## Data Flow

1. App init → `loadBooks()` → `GET /api/books` → `cachedBooks` populated
2. Admin expands a user → `toggleUser()` fetches progress records
3. For each `progress.document` hash → `cachedBooks.find(b => b.id === p.document)`
4. Found → render `book.title` + hash secondary; not found → render hash only

## Confirm Dialog Update

`clearAdminProgress` currently shows: `Clear progress for "${docId}" for user "${username}"?`

Update to use the book title when resolvable: `Clear progress for "${bookTitle || docId}" for user "${username}"?`

## Error Handling / Fallbacks

- **Book not in library** (deleted EPUB, never scanned): display raw hash as-is — no error state
- **`cachedBooks` empty** (books failed to load): all lookups return `undefined`, all records fall back to raw hash — graceful degradation
- **No additional loading states needed**: lookup is synchronous against already-fetched data

## Testing

- Expand a user with progress records — titles should appear for books present in the library
- Expand a user who has progress for a book no longer in the library — raw hash should display unchanged
- Clear a progress record — confirm dialog should show the book title (or hash if not found)

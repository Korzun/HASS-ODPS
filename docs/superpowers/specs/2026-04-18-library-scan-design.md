# Library Scan Design Spec

**Date:** 2026-04-18  
**Status:** Approved

## Overview

Add a manual library scan that detects EPUB files present in `booksDir` but not yet in the database (e.g., dropped in via Samba/SSH), imports them, and removes stale database entries whose files no longer exist on disk. The scan runs automatically on server startup and can be triggered manually from the web UI.

---

## BookStore.scan()

New method on `BookStore`:

```typescript
scan(): { imported: string[]; removed: string[] }
```

**Logic:**

1. Read all `.epub` filenames from `booksDir` (same extension filter as upload)
2. Read all book records currently in the DB
3. **New files** = disk filenames not in DB → for each: call `parseEpub()` + `partialMD5()` + `addBook()`. On parse failure, skip the file and log a warning — do not abort the whole scan.
4. **Stale entries** = DB records whose `path` no longer exists on disk → call existing `deleteBook()` (which wraps `fs.unlinkSync` in try/catch, so missing files are handled gracefully)
5. Return `{ imported, removed }` — both as arrays of filenames

---

## API Endpoint

**Route:** `POST /api/books/scan`  
**Auth:** `sessionAuth` (same as all other `/api/*` routes)  
**Handler:** calls `bookStore.scan()`, returns JSON:

```json
{ "imported": ["Book A.epub", "Book B.epub"], "removed": ["Old.epub"] }
```

---

## Startup Scan

In `index.ts`, after services are initialized and before `app.listen()`:

- Call `bookStore.scan()` synchronously
- Log results: `[INFO] Startup scan: 2 imported, 1 removed`
- If the scan throws (e.g., `booksDir` inaccessible), log the error and continue — do not crash the process

---

## Web UI

A **"Scan Library" button** placed above the book list in the Library tab.

**States:**

| State | Button | Drop zone / file input |
|-------|--------|------------------------|
| Idle | "Scan Library" (enabled) | Normal |
| Scanning | "Scanning…" (disabled) | Disabled (dimmed, pointer-events: none) |
| Done | "Scan Library" (re-enabled) | Re-enabled |

**Status display:** a `#scan-status` element below the button shows:
- `"✓ Scan complete: N imported, N removed"` — when something changed
- `"✓ Library already up to date"` — when both lists are empty
- `"✗ Scan failed"` — on network/server error

After a successful scan, the book list is refreshed.

---

## Error Handling

- **Per-file parse failure during scan:** log warning, skip file, continue scan
- **Startup scan failure:** log error, do not crash server
- **API scan failure:** return 500, UI shows "✗ Scan failed"

---

## Files Changed

| File | Change |
|------|--------|
| `app/services/BookStore.ts` | Add `scan()` method |
| `app/routes/ui.ts` | Add `POST /api/books/scan` route |
| `app/index.ts` | Call `bookStore.scan()` on startup |
| `app/public/index.html` | Add "Scan Library" button + `#scan-status` + disable-during-scan logic |

# EPUB Metadata Editing for Admins

**Date:** 2026-04-19
**Status:** Approved

## Overview

Admins can edit the metadata of any book in the library through a dedicated edit page. Changes are written directly into the EPUB file's OPF XML (no separate metadata store), after which the book is re-imported into the database. All metadata fields are editable, including cover image replacement.

## Architecture

### New Files

- `app/services/epub-writer.ts` — all EPUB mutation logic

### Modified Files

- `app/services/book-store.ts` — add `reimportBook(id)` method
- `app/routes/ui.ts` — add `PATCH /api/books/:id/metadata` endpoint + Express catch-all for SPA routing
- `app/public/index.html` — add History API routing + edit page UI

### Request Flow (Save)

1. Admin submits edit form → `PATCH /api/books/:id/metadata` (multipart/form-data)
2. Server calls `epubWriter.writeMetadata(filePath, changes)` — modifies OPF XML in-place, optionally adds new cover entry
3. Server calls `bookStore.reimportBook(id)` — re-parses file, updates DB row
4. Returns updated `Book` record (200)
5. Frontend navigates to `/books/:id` showing fresh data

## Frontend Routing (History API)

| URL | View |
|-----|------|
| `/` | Library |
| `/series/:name` | Series detail |
| `/books/:id` | Book detail |
| `/books/:id/edit` | Edit metadata (admin only) |

Express serves `index.html` for any non-`/api` GET that doesn't match a static file via a catch-all route registered after all API routes:

```typescript
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});
```

A small `router` object in `index.html` maps URL patterns to render functions, uses `history.pushState` for navigation, and listens to `window.popstate` for back/forward. On initial load, `router.init()` reads `location.pathname` to render the correct view.

**Back button behavior:**
- `/books/:id/edit` → back → `/books/:id`
- `/books/:id` → back → wherever the user came from (real browser history)
- `/series/:name` → back → `/`

## EPUB Writer Service (`epub-writer.ts`)

```typescript
function writeMetadata(filePath: string, changes: EpubChanges): void
```

```typescript
interface EpubChanges {
  title?: string;
  author?: string;
  fileAs?: string;
  description?: string;
  publisher?: string;
  series?: string;
  seriesIndex?: number;
  identifiers?: { scheme: string; value: string }[];
  subjects?: string[];
  coverData?: Buffer;
  coverMime?: string;
}
```

**Write process:**
1. Open EPUB ZIP with adm-zip
2. Read `META-INF/container.xml` → find OPF path
3. Parse OPF XML, apply field changes to `<dc:*>` elements and `<meta>` elements
4. Series written as Calibre-style `<meta name="calibre:series">` and `<meta name="calibre:series_index">` (consistent with parser)
5. Cover: add new image entry at `OEBPS/cover-edit.{ext}`, update `<manifest>` item and `<metadata>` `<meta name="cover">` to point to it
6. Re-serialize OPF XML, update that entry in the ZIP
7. Call `zip.writeZip(filePath)` — adm-zip builds full buffer in memory before writing (no partial-write risk)

Only OPF metadata is touched — `toc.ncx`, spine, and content files are not modified.

No backup is created before overwriting.

## API Endpoint

**`PATCH /api/books/:id/metadata`** — admin-only, multipart/form-data

**Request fields** (all optional, send only changed fields):

| Field | Type |
|-------|------|
| `title` | string |
| `author` | string |
| `fileAs` | string |
| `description` | string |
| `publisher` | string |
| `series` | string |
| `seriesIndex` | string (numeric) |
| `identifiers` | JSON string — `{ scheme: string; value: string }[]` |
| `subjects` | JSON string — `string[]` |
| `cover` | file (image) |

**Server logic:**
1. `adminAuth` check → 403 if not admin
2. Look up book by id → 404 if not found
3. Build `EpubChanges` from body fields + uploaded file
4. `epubWriter.writeMetadata(book.path, changes)`
5. `bookStore.reimportBook(id)` — re-parses file, updates DB row
6. Return updated `Book` (200)

**`bookStore.reimportBook(id)`:**
- Looks up existing row by id to get `path`
- Re-runs `parseEpub(path)` + `partialMD5(path)`
- If partial MD5 is unchanged: `UPDATE books SET title=?, author=?, ... WHERE id=?`
- If partial MD5 changed (ZIP structure shifted): `UPDATE books SET id=newId, title=?, ... WHERE id=oldId`, then `UPDATE progress SET document=newId WHERE document=oldId`
- Returns the updated `Book` record (with the new id if it changed)

## Edit Page UI

**Layout:** Same header/nav as book detail. Back link to `/books/:id`. Heading: "Edit Metadata — {title}".

**Form fields:**

| Field | Input |
|-------|-------|
| Title | `<input type="text">` |
| Author | `<input type="text">` |
| Author Sort | `<input type="text">` |
| Publisher | `<input type="text">` |
| Series | `<input type="text">` |
| Series Index | `<input type="number" step="0.1">` |
| Description | `<textarea>` |
| Subjects | Comma-separated text rendered as removable chips |
| Identifiers | Repeating rows of `scheme` + `value` inputs with add/remove buttons |
| Cover | Current cover preview + `<input type="file" accept="image/*">` with new image preview on select |

**Save behavior:**
1. Collect only changed fields (diff against original values loaded from API)
2. Build `FormData`, send `PATCH /api/books/:id/metadata`
3. On success → `router.navigate('/books/:id')`
4. On error → inline error message below the form

**Admin guard:** Non-admins reaching `/books/:id/edit` see "Not authorized" — no save button rendered.

## Error Handling

| Scenario | Behavior |
|----------|----------|
| EPUB file not found on disk | 404 before any write attempt |
| Invalid OPF XML in EPUB | `writeMetadata` throws → 500, file untouched (adm-zip hasn't written yet) |
| Uploaded cover not an image | Multer `fileFilter` rejects non-image MIME → 400 |
| Book id not found in DB | 404 before file write |
| Partial MD5 changes after write | `reimportBook` detects id change, updates row and cascades to `progress` table |

## Testing

- **`epub-writer.test.ts`** — unit tests using a real minimal EPUB fixture (ZIP with OPF). Cases: field updates round-trip through `writeMetadata` → `parseEpub`, cover replacement updates manifest, unknown fields left untouched.
- **`ui.routes.test.ts`** — new cases for `PATCH /api/books/:id/metadata`: valid admin session (200), non-admin session (403), unknown id (404).

# EPUB Metadata & OPDS Expansion Design Spec

**Date:** 2026-04-17  
**Status:** Approved

## Overview

Extend HASS-ODPS to:
1. Accept only `.epub` files (drop PDF, MOBI, CBZ, CBR support)
2. Parse EPUB content at upload time to extract title, author, description, series, series index, and cover image
3. Cache all metadata in SQLite — reads never touch the filesystem
4. Surface rich metadata in the web UI (cover thumbnail, author, series)
5. Expand the OPDS feed with author, description, and cover image links

---

## Data Model

### `Book` type (updated)

```typescript
export interface Book {
  id: string;           // partial MD5 of file content (KoReader binary algorithm) — 32 hex chars
  filename: string;
  path: string;
  title: string;        // from EPUB OPF, fallback to filename stem
  author: string;       // from EPUB OPF, default ''
  description: string;  // from EPUB OPF dc:description, default ''
  series: string;       // calibre:series or belongs-to-collection, default ''
  seriesIndex: number;  // calibre:series_index, default 0 (REAL for half-entries like 2.5)
  hasCover: boolean;    // true if cover_data is present in SQLite
  size: number;
  mtime: Date;
  addedAt: Date;
}
```

### Book ID algorithm

Book IDs use **KoReader's partial MD5 binary method** so that `books.id` matches the `document` field in the `progress` table, enabling direct join queries between library and reading progress.

```typescript
// Reads 1024-byte chunks at offsets: 1024 << (2*i) for i = -1..10
// (256, 1024, 4096, 16384, 65536, 262144, ...) stopping when offset >= fileSize
// Returns 32-char hex MD5 digest — identical to KoReader's getFileDigest()
export function partialMD5(filePath: string): string
```

This is computed at upload time from the saved file and stored as the primary key. `BookStore.bookId()` is replaced by `EpubParser.partialMD5()` (or a shared utility).

### SQLite `books` table (new)

```sql
CREATE TABLE IF NOT EXISTS books (
  id            TEXT    PRIMARY KEY,  -- 32-char partial MD5, matches KOSync progress.document
  filename      TEXT    NOT NULL UNIQUE,
  path          TEXT    NOT NULL,
  title         TEXT    NOT NULL,
  author        TEXT    NOT NULL DEFAULT '',
  description   TEXT    NOT NULL DEFAULT '',
  series        TEXT    NOT NULL DEFAULT '',
  series_index  REAL    NOT NULL DEFAULT 0,
  cover_data    BLOB,
  cover_mime    TEXT,
  size          INTEGER NOT NULL,
  mtime         INTEGER NOT NULL,
  added_at      INTEGER NOT NULL
);
```

- `series_index` is `REAL` to handle fractional entries (e.g. 2.5 for novellas)
- `cover_data` / `cover_mime` are NULL when the EPUB contains no cover image
- The `books` table lives in the existing `/data/db.sqlite` alongside `users` and `progress`

---

## New Module: `EpubParser`

A stateless module (`app/services/EpubParser.ts`) that exports two functions:

```typescript
export interface EpubMeta {
  title: string;
  author: string;
  description: string;
  series: string;
  seriesIndex: number;
  coverData: Buffer | null;
  coverMime: string | null;
}

export function parseEpub(filePath: string): EpubMeta
```

### Parsing strategy

EPUBs are ZIP archives. `parseEpub` uses `adm-zip` (synchronous) to:

1. Read `META-INF/container.xml` → locate the OPF rootfile path
2. Read the OPF file → parse with `fast-xml-parser`
3. Extract from OPF `<metadata>`:
   - `dc:title` → `title`
   - `dc:creator` → `author` (first creator if multiple)
   - `dc:description` → `description`
   - `<meta name="calibre:series">` or EPUB3 `<meta property="belongs-to-collection">` → `series`
   - `<meta name="calibre:series_index">` or `<meta property="group-position">` → `seriesIndex`
4. Find cover image:
   - Look for `<meta name="cover">` item id in OPF manifest → resolve to ZIP entry path
   - Fallback: look for a manifest item with `properties="cover-image"`
   - Fallback: look for a manifest item whose href contains "cover" and is an image type
   - Extract bytes and mime type

If any step fails, `parseEpub` throws with a descriptive message. Callers handle the error.

**Dependencies added:** `adm-zip`, `fast-xml-parser` (and their `@types/*`)

---

## Updated `BookStore`

`BookStore` gains a `Database` dependency (the shared SQLite instance from `UserStore` or a separate connection — see Wiring below).

### Schema migration

`BookStore` runs `CREATE TABLE IF NOT EXISTS books (...)` on construction (same pattern as `UserStore.migrate()`).

### Method changes

| Method | Old behaviour | New behaviour |
|--------|--------------|---------------|
| `listBooks()` | Scans filesystem | Reads `books` table, returns `Book[]` sorted by title |
| `getBookById(id)` | Scans filesystem | Queries `books` table by `id` |
| `deleteBook(id)` | `fs.unlinkSync` + return book | Deletes file + removes row, returns deleted `Book` or null |
| `addBook(filename, path, size, mtime, meta)` | *(new)* | Inserts row into `books` table |
| `getCover(id)` | *(new)* | Returns `{ data: Buffer, mime: string } \| null` from `cover_data`/`cover_mime` |
| `getBooksDir()` | Returns booksDir | Unchanged |

`listBooks()` never includes `cover_data` in the returned objects — only `hasCover: boolean`. This keeps API responses lean.

---

## Upload Flow (changed)

```
POST /api/books/upload
  → multer saves .epub to booksDir
  → EpubParser.parseEpub(savedPath)        — parse metadata + cover
      → on error: delete saved file, return 400
  → EpubParser.partialMD5(savedPath)       — compute KoReader-compatible ID
  → bookStore.addBook(id, filename, path, size, mtime, meta)
      → on UNIQUE conflict (same filename): overwrite row (upsert)
  → return 200 { uploaded: [filename] }
```

Only `.epub` is accepted. `ALLOWED_EXTENSIONS` is reduced to `new Set(['.epub'])`. Upload error message updated accordingly.

---

## New Endpoints

### `GET /api/books/:id/cover`
- Session auth required
- Returns cover image bytes with `Content-Type` from `cover_mime`
- Returns 404 if book not found or has no cover

### `GET /opds/books/:id/cover`
- HTTP Basic auth required  
- Same cover serving logic, for OPDS clients

---

## OPDS Feed Changes

Each `<entry>` in `/opds/books` gains:

```xml
<author><name>Author Name</name></author>
<summary>Description text from EPUB</summary>
<!-- only when hasCover is true: -->
<link rel="http://opds-spec.org/image"
      href="/opds/books/{id}/cover"
      type="image/jpeg"/>
```

Root feed and download endpoint are unchanged.

---

## Web UI Changes

### Book list item (updated)

```
┌──────────────────────────────────────────────────────┐
│ [cover]  Title                                    🗑  │
│          Author · Series Name #2                      │
│          EPUB · 2.4 MB                                │
└──────────────────────────────────────────────────────┘
```

- Cover thumbnail: 48×64px, shown left of title; a grey placeholder if `hasCover` is false
- Series line shown only when `series` is non-empty
- `/api/books` response includes `author`, `series`, `seriesIndex`, `hasCover`

### Upload zone (updated)

- `accept=".epub"` only
- Help text: "Supported format: epub"
- Error message on rejection: "No valid files uploaded. Supported: epub"

---

## Wiring

Both services share one SQLite connection — safe because `better-sqlite3` is synchronous and single-threaded.

**Constructor changes:**
- `UserStore(dbPath: string)` → `UserStore(db: Database)` — accepts an existing `Database` instance instead of creating one internally. `UserStore` no longer calls `new Database()` or `db.close()`.
- `BookStore(booksDir: string)` → `BookStore(booksDir: string, db: Database)` — gains the shared DB instance.

**`app/index.ts`** creates the single connection and passes it to both:
```typescript
const db = new Database(path.join(config.dataDir, 'db.sqlite'));
const userStore = new UserStore(db);
const bookStore = new BookStore(config.booksDir, db);
```

**Test impact:** `UserStore.test.ts` and `BookStore.test.ts` create their own `new Database(dbPath)` in `beforeEach` and call `db.close()` in `afterEach`.

---

## Removed Support

- File extensions `.pdf`, `.mobi`, `.cbz`, `.cbr` are removed from `SUPPORTED` and `ALLOWED_EXTENSIONS`
- `BookStore` no longer has a `SUPPORTED` map — mime type is always `application/epub+zip`
- `BookStore.bookId(relativePath)` static method removed — replaced by `EpubParser.partialMD5(filePath)`
- Tests that write non-epub files to the books dir are updated to use `.epub`

---

## Testing

- **`EpubParser.test.ts`** — unit tests using a minimal real EPUB fixture (generated in the test with `adm-zip`): parse title/author/description/series/cover; graceful failure on malformed ZIP
- **`BookStore.test.ts`** — updated: tests now use an in-memory SQLite DB; `listBooks()` tests insert via `addBook()`; cover round-trip test
- **`opds.test.ts`** — updated: book entries in feed include author and summary; cover link present when `hasCover` is true
- **`ui.test.ts`** — updated: upload rejects `.pdf`; upload accepts `.epub` and returns enriched book object

---

## Error Handling

- EPUB parse failure at upload: delete the saved file, return `400 { error: 'Failed to parse EPUB: <reason>' }`
- Cover endpoint with no cover: `404`
- EPUB with no title in OPF: fallback to filename stem (same as current behaviour)
- EPUB with no author/description/series: fields default to `''`, `seriesIndex` defaults to `0`

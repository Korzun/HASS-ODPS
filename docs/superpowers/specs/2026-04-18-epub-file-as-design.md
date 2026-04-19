# EPUB `file-as` Sort Order Design Spec

**Date:** 2026-04-18
**Status:** Approved

## Overview

Extend HASS-ODPS to read an EPUB's `file-as` metadata, store it alongside the existing book metadata, expose it through the `Book` API/type, and use it as the primary library sort key instead of the display title.

This keeps the display title unchanged while allowing author- or series-style filing values to control book order when the EPUB provides them.

---

## Data Model

### `EpubMeta` type

Add a new field:

```typescript
export interface EpubMeta {
  title: string;
  fileAs: string;
  author: string;
  description: string;
  series: string;
  seriesIndex: number;
  coverData: Buffer | null;
  coverMime: string | null;
}
```

- `fileAs` is the parsed EPUB filing string
- Default is `''` when the metadata is absent

### `Book` type

Add the same field to the stored and returned book shape:

```typescript
export interface Book {
  id: string;
  filename: string;
  path: string;
  title: string;
  fileAs: string;
  author: string;
  description: string;
  series: string;
  seriesIndex: number;
  hasCover: boolean;
  size: number;
  mtime: Date;
  addedAt: Date;
}
```

`fileAs` is exposed through the API so clients can see the actual sort metadata being applied.

---

## EPUB Parsing

`app/services/epub-parser.ts` gains support for extracting `file-as` from OPF metadata.

### Source of truth

The parser reads `file-as` from attributed metadata entries in the OPF package, using the same language-selection rules already applied to title and author text:

- prefer English entries when present
- otherwise prefer entries with no language
- otherwise fall back to the first available entry

### Parsing rules

- If the chosen title entry includes a `file-as` attribute, use that value
- If no title-level `file-as` attribute is present, return `''`
- Trim surrounding whitespace before storing
- Do not replace or normalize `title`; `title` remains the human-facing display value

The implementation stays narrowly scoped to title filing metadata. It does not infer `fileAs` from filenames, titles, authors, or series when the EPUB omits it.

---

## Storage

`app/services/book-store.ts` adds a `file_as` column to the `books` table:

```sql
file_as TEXT NOT NULL DEFAULT ''
```

### Migration strategy

Because this project currently uses `CREATE TABLE IF NOT EXISTS` without versioned migrations, `BookStore.migrate()` should also ensure existing databases gain the new column. The migration should:

1. inspect the current `books` schema
2. add `file_as` with `ALTER TABLE` when missing
3. leave existing rows with the default empty string

### Write path

`addBook()` persists `meta.fileAs` into `file_as`.

### Read path

`listBooks()` and `getBookById()` include `file_as` in their selects, and `rowToBook()` maps it back to `fileAs`.

---

## Sort Order

Library ordering changes from raw title sorting to filing-aware sorting.

### Rule

`listBooks()` sorts by:

1. `file_as` when it is non-empty
2. otherwise `title`
3. then `title` as a secondary tie-breaker

In SQL terms, the ordering is:

```sql
ORDER BY CASE WHEN file_as != '' THEN file_as ELSE title END, title
```

This keeps books without `file-as` behaving as they do now while allowing EPUB filing metadata to override alphabetical placement when available.

Because both the web UI and OPDS feed consume `listBooks()`, the new ordering applies consistently across both surfaces without separate route logic.

---

## API Surface

`GET /api/books` returns `fileAs` alongside the existing metadata fields that are already exposed from `Book`.

No new endpoint is required. The change is additive and backward-compatible for clients that ignore unknown fields.

---

## Testing

### `app/services/epub-parser.test.ts`

Add tests that prove:

- `parseEpub()` extracts `fileAs` from an attributed title entry
- `parseEpub()` returns `''` when `file-as` is absent
- title parsing still returns the visible title text, not the filing string

### `app/services/book-store.test.ts`

Add tests that prove:

- `addBook()` persists `fileAs`
- `getBookById()` and `listBooks()` expose `fileAs`
- `listBooks()` sorts by `fileAs` before `title`
- books without `fileAs` still sort by `title`

---

## Scope Notes

- No UI rendering changes are required beyond the existing `/api/books` payload now including `fileAs`
- No OPDS schema changes are required because OPDS consumers rely on feed order, not a new metadata element
- Existing book titles, authors, descriptions, series metadata, and cover handling are unchanged

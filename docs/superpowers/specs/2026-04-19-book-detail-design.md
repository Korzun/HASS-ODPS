# Book Detail Page Design

**Date:** 2026-04-19
**Status:** Approved

## Overview

Add a full-page book detail view that users can navigate to by clicking any book in the library. The page displays rich metadata: title, author, series, description, publisher, subjects, and identifiers. It is read-only — no actions.

## Data & Backend

### New Fields

Three new fields are added to the book model and database. `description` and `publisher` are single strings; `identifiers` and `subjects` are arrays stored as JSON strings in SQLite.

| Field | Type | Source | DB Column |
|---|---|---|---|
| `description` | `string` | `<dc:description>` | already exists |
| `publisher` | `string` | `<dc:publisher>` | `publisher TEXT NOT NULL DEFAULT ''` |
| `identifiers` | `{scheme: string, value: string}[]` | `<dc:identifier>` | `identifiers TEXT NOT NULL DEFAULT '[]'` |
| `subjects` | `string[]` | `<dc:subject>` | `subjects TEXT NOT NULL DEFAULT '[]'` |

### Database Migration

```sql
ALTER TABLE books ADD COLUMN publisher    TEXT NOT NULL DEFAULT '';
ALTER TABLE books ADD COLUMN identifiers  TEXT NOT NULL DEFAULT '[]';
ALTER TABLE books ADD COLUMN subjects     TEXT NOT NULL DEFAULT '[]';
```

Existing rows default to empty values. A library re-scan populates the new fields for existing books.

### EPUB Parser (`epub-parser.ts`)

Extend `parseEpub()` to extract:

- `<dc:publisher>` → `publisher: string` (first occurrence, trimmed)
- `<dc:identifier>` → `identifiers: {scheme, value}[]`
  - `scheme` from `opf:scheme` attribute, `id` attribute, or inferred (e.g. value starting with `978-` → `ISBN`)
  - Skip identifiers with empty values; include all others regardless of format
- `<dc:subject>` → `subjects: string[]` (all occurrences, trimmed, deduplicated)
- `description` is already extracted — no change

### BookStore (`book-store.ts`)

- Add `publisher`, `identifiers`, `subjects` to `INSERT` and `SELECT` queries
- Serialize `identifiers` and `subjects` as `JSON.stringify` on write, `JSON.parse` on read
- Add `getBook(id: string): Book | null` — fetches a single book by ID, returns `null` if not found

### API (`routes/ui.ts`)

New session-authenticated endpoint:

```
GET /api/books/:id
```

Returns the full `Book` object including `description`, `publisher`, `identifiers`, `subjects`. Returns 404 if the book is not found.

The existing `GET /api/books` list endpoint is unchanged — it continues to exclude `path`, `description`, `publisher`, `identifiers`, and `subjects` to stay lightweight.

### TypeScript Types (`types.ts`)

```typescript
export interface Book {
  id: string;
  filename: string;
  path: string;
  title: string;
  fileAs: string;
  author: string;
  description: string;
  publisher: string;
  series: string;
  seriesIndex: number;
  identifiers: { scheme: string; value: string }[];
  subjects: string[];
  hasCover: boolean;
  size: number;
  mtime: Date;
  addedAt: Date;
}
```

## Frontend

### Navigation State

The existing SPA uses `currentSeriesName` (string | null) to track in-page navigation. The book detail page adds:

- `currentBookId: string | null` — ID of the book currently being viewed (null = not on detail page)
- `bookDetailOrigin: { type: 'series', name: string } | { type: 'library' }` — where the user navigated from, used for the back link

### New Functions

- `showBookDetail(id, origin)` — fetches `GET /api/books/:id`, renders the detail page, sets `currentBookId` and `bookDetailOrigin`
- `renderBookDetail(book)` — builds the detail page HTML and injects it into the main content area

Existing navigation functions (`showLibrary()`, `showSeriesDetail()`) clear `currentBookId` when called.

### Click Targets

Two places gain click handlers:

1. **Series Detail page** — each book's cover image and title become clickable links to the detail page. Origin is `{ type: 'series', name: seriesName }`.
2. **Standalone books section** — each book row becomes clickable. Origin is `{ type: 'library' }`.

The delete button remains in place on the series detail page and is not affected.

### Page Layout

The detail page follows the visual style of the existing Series Detail page (dark theme, same font/color palette).

**Breadcrumb nav bar**
```
← [Series Name]  /  [Book Title]    (when origin is a series)
← Library        /  [Book Title]    (when origin is standalone)
```

**Hero section**
- Cover image (via `/api/books/:id/cover`, falls back to gray placeholder)
- Title (large, bold)
- Author
- Series badge: `📚 [Series Name] · Book [N]` (hidden if not in a series)
- Stats row: Publisher · Format (EPUB) · Size · Date Added

**Description section**
Full `<dc:description>` text. Hidden if empty.

**Subjects section**
Tags rendered as rounded pills. Hidden if empty.

**Identifiers section**
Each identifier displayed as a scheme label + monospace value row. Hidden if empty.

Sections with no data are hidden entirely (not shown as "—").

## Error Handling

- If `GET /api/books/:id` returns 404 (book deleted between page load and click), show an inline error message on the detail page: "Book not found."
- If the fetch fails due to a network error, show: "Failed to load book details."

## Testing

- Unit test `epub-parser.ts` — verify extraction of `publisher`, `identifiers`, `subjects` from sample OPF markup including edge cases (missing attributes, multiple `<dc:identifier>` tags, empty `<dc:subject>`)
- Unit test `book-store.ts` — verify `getBook()` returns correct data, and that `identifiers`/`subjects` round-trip through JSON serialization correctly
- Integration test `GET /api/books/:id` — verify 200 with full fields, 404 for unknown ID
- Manual: click a book in series detail, verify detail page renders; click a standalone book, verify; verify back navigation works from both origins

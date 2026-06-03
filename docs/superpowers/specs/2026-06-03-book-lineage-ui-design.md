# Book Lineage UI — Design Spec

**Date:** 2026-06-03  
**Audience:** Administrator only

## Overview

Show a git-log-style ID lineage card on the book detail page, visible only to administrators. Every time a book is reimported and its MD5 fingerprint changes, the old ID is recorded in `book_id_history`. This card makes that history visible — useful for diagnosing sync issues, understanding reimport history, and auditing ID changes.

---

## 1. Database

### Schema change

Add a `timestamp` column to `book_id_history` (milliseconds since epoch, stored as `REAL NOT NULL`).

**Prisma schema** (`app/server/prisma/schema.prisma`):
```prisma
model BookIdHistory {
  oldId     String @id @map("old_id")
  currentId String @map("current_id")
  timestamp Float  @default(dbgenerated("(strftime('%s', 'now') * 1000)"))

  @@map("book_id_history")
}
```

### Migration

A new Prisma migration recreates the table to add the `NOT NULL` column with a proper expression default (SQLite's `ADD COLUMN` only accepts constant literals for `NOT NULL`, so table recreation is required):

```sql
CREATE TABLE book_id_history_new (
  old_id     TEXT NOT NULL PRIMARY KEY,
  current_id TEXT NOT NULL,
  timestamp  REAL NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

INSERT INTO book_id_history_new (old_id, current_id, timestamp)
SELECT old_id, current_id, (strftime('%s', 'now') * 1000)
FROM book_id_history;

DROP TABLE book_id_history;
ALTER TABLE book_id_history_new RENAME TO book_id_history;
```

Existing rows are backfilled with the time the migration runs — the best available approximation since no prior timestamp was recorded.

### BookStore changes

`reimportBook` already writes to `book_id_history`. Update the two raw SQL statements that insert/update this table to include `timestamp = Date.now()`:

```ts
await tx.$executeRaw`
  INSERT OR REPLACE INTO book_id_history (old_id, current_id, timestamp)
  VALUES (${id}, ${newId}, ${Date.now()})
`;
await tx.$executeRaw`
  UPDATE book_id_history SET current_id = ${newId}
  WHERE current_id = ${id}
`;
```

The second statement flattens older chain entries (e.g. `A → B` becomes `A → C` when B is renamed to C). It must **not** update `timestamp` — those rows' timestamps record when the original rename happened, not the current one.

---

## 2. Server API

### New BookStore method

```ts
async getBookLineage(id: string): Promise<{
  currentId: string;
  entries: { oldId: string; newId: string; timestamp: number }[];
} | null>
```

- Returns `null` if the book does not exist.
- Queries all rows from `book_id_history` where `current_id = id`, ordered by `timestamp DESC`.
- Each entry represents one rename event: `oldId → newId`.
- `currentId` is always the book's current ID (same as the `id` parameter).
- Because the table stores a flattened chain (`old_id → final current_id`), `newId` per entry cannot be read directly from the column. It is reconstructed from the sorted entries: `entries[i].newId = (i === 0) ? currentId : entries[i-1].oldId`. This correctly recovers each entry's direct successor (e.g. for chain A→B→C: entry B gets `newId=C`, entry A gets `newId=B`).

### New route

```
GET /api/books/:id/lineage
```

- Gated by `sessionAuth` + `adminAuth`.
- Returns 404 if the book does not exist.
- Returns the `getBookLineage` result on success.

**Response shape:**
```json
{
  "currentId": "a3f8c2d14e7b90f1",
  "entries": [
    { "oldId": "9e1b4a7c2d056f38", "newId": "a3f8c2d14e7b90f1", "timestamp": 1748780400000 },
    { "oldId": "c72e3f81b4a90d56", "newId": "9e1b4a7c2d056f38", "timestamp": 1747728000000 }
  ]
}
```

---

## 3. Client

### New hook: `useBookLineage`

Location: `app/client/src/provider/book/hook/use-book-lineage.ts`

Fetches `GET /api/books/:id/lineage`. Returns `[data, loading, error]`. Only called when `isAdmin` is true. Not stored in global book context — fetched locally by the component on mount.

### New component: `BookLineageCard`

Location: `app/client/src/component/book-lineage-card/index.tsx` + `style.ts`

A `<Card title="ID Lineage">` containing a vertical git-log-style list. Each row has:
- A colored dot (connected by a vertical line to the next entry)
- The ID in monospace
- A badge: **CURRENT** (top entry) or **INITIAL** (bottom entry, only when there are history entries)
- The timestamp formatted as a locale date + time

**Visual structure (3-entry example):**
```
● a3f8c2d14e7b90f1  [CURRENT]
│  Jun 1, 2026 · 14:32
●  9e1b4a7c2d056f38
│  May 20, 2026 · 09:15
●  c72e3f81b4a90d56  [INITIAL]
   Apr 3, 2026 · 11:00
```

**Zero-history case** (book was never reimported):
```
● a3f8c2d14e7b90f1  [CURRENT]
   Jun 1, 2026 · 14:32
```
No INITIAL badge — a single entry with only CURRENT is self-explanatory.

**Styling** uses `createUseStyles` with `Theme` tokens throughout: `theme.color.brand.default` for the current dot, `theme.color.success` for the initial dot, `theme.color.text.faint` for timestamps, `theme.space.*` for spacing, `theme.fontSize.*` for font sizes. Monospace stack hardcoded for IDs (no font-family token exists in theme).

### BookPage integration

In `app/client/src/page/book/index.tsx`, add below the Subjects card, gated by `isAdmin`:

```tsx
{isAdmin && <BookLineageCard bookId={book.id} />}
```

---

## 4. Error handling

- If `/api/books/:id/lineage` returns an error, the card shows a brief inline error message rather than crashing the page.
- Loading state: card renders with a spinner or empty state while the fetch is in flight.

---

## 5. Out of scope

- Exposing lineage to non-admin users.
- Displaying lineage in the book list or series views.
- Adding a "renamed from" label per entry (deferred — may revisit).
- Timestamps for entries that existed before this migration (backfilled with migration run time).

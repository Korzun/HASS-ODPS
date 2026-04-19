# EPUB `file-as` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Parse an EPUB title's `file-as` metadata, persist it on books, expose it in the API/type surface, and sort the library by that filing value before title.

**Architecture:** Extend the existing EPUB parser so it returns both display text and the selected title's filing value, then thread that new `fileAs` field through the shared TypeScript types and the SQLite-backed `BookStore`. The HTTP layer should not need new production logic because `/api/books` already serializes all `Book` fields except `path` and `description`; a regression test will lock that behavior in.

**Tech Stack:** TypeScript, Jest, `fast-xml-parser`, `better-sqlite3`, Express

---

## File Structure

- Modify: `app/types.ts`
  Add `fileAs` to `EpubMeta` and `Book`.
- Modify: `app/services/epub-parser.ts`
  Parse title-level `file-as` metadata alongside the selected title text.
- Modify: `app/services/epub-parser.test.ts`
  Add parser regression tests for `fileAs` extraction and fallback behavior.
- Modify: `app/services/book-store.ts`
  Add `file_as` schema support, migration for existing DBs, persistence, reads, and sort order.
- Modify: `app/services/book-store.test.ts`
  Add tests for persistence, migration, and filing-aware ordering.
- Modify: `app/routes/ui.test.ts`
  Verify `/api/books` returns `fileAs` while still hiding `path` and `description`.

### Task 1: Parse EPUB `file-as` Metadata

**Files:**
- Modify: `app/types.ts`
- Modify: `app/services/epub-parser.test.ts`
- Modify: `app/services/epub-parser.ts`

- [ ] **Step 1: Write the failing parser and type tests**

```typescript
// app/services/epub-parser.test.ts
it('parses title-level file-as from an attributed dc:title', () => {
  const zip = new AdmZip();
  zip.addFile('META-INF/container.xml', Buffer.from(sharedContainerXml));
  zip.addFile('OEBPS/content.opf', Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title id="t1" file-as="Asimov, Isaac">I, Robot</dc:title>
  </metadata>
  <manifest/><spine/>
</package>`));
  const filePath = path.join(tmpDir, 'irobot.epub');
  fs.writeFileSync(filePath, zip.toBuffer());

  const meta = parseEpub(filePath);

  expect(meta.title).toBe('I, Robot');
  expect(meta.fileAs).toBe('Asimov, Isaac');
});

it('returns an empty fileAs when the chosen title has no file-as attribute', () => {
  const filePath = path.join(tmpDir, 'plain-title.epub');
  fs.writeFileSync(filePath, makeEpub({ title: 'Plain Title' }));

  const meta = parseEpub(filePath);

  expect(meta.title).toBe('Plain Title');
  expect(meta.fileAs).toBe('');
});
```

```typescript
// app/types.ts
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

- [ ] **Step 2: Run the targeted parser test to verify it fails**

Run: `npm test -- app/services/epub-parser.test.ts --runInBand`

Expected: FAIL with a TypeScript/Jest error showing `fileAs` is missing from `EpubMeta`, or an assertion failure where `meta.fileAs` is `undefined`.

- [ ] **Step 3: Write the minimal parser implementation**

```typescript
// app/services/epub-parser.ts
type MetaLike = string | { [key: string]: string | undefined };

interface LocalizedValue {
  text: string;
  lang: string;
  fileAs: string;
}

function toLocalizedValue(item: MetaLike): LocalizedValue {
  return typeof item === 'string'
    ? { text: item, lang: '', fileAs: '' }
    : {
        text: item['#text'] ?? '',
        lang: item['@_xml:lang'] ?? '',
        fileAs: (item['@_file-as'] ?? '').trim(),
      };
}

function pickLocalized(items: MetaLike[]): LocalizedValue {
  const candidates = items.map(toLocalizedValue);
  return (
    candidates.find(c => c.lang.toLowerCase().startsWith('en')) ??
    candidates.find(c => c.lang === '') ??
    candidates[0] ??
    { text: '', lang: '', fileAs: '' }
  );
}

function pickLang(items: MetaLike[]): string {
  return pickLocalized(items).text;
}

const titleCandidate = pickLocalized(metadata['dc:title'] ?? []);
const title = titleCandidate.text || path.basename(filePath, path.extname(filePath));
const fileAs = titleCandidate.fileAs;

return { title, fileAs, author, description, series, seriesIndex, coverData, coverMime };
```

- [ ] **Step 4: Run the targeted parser test to verify it passes**

Run: `npm test -- app/services/epub-parser.test.ts --runInBand`

Expected: PASS with the new `fileAs` assertions green and no regressions in the existing EPUB parser coverage.

- [ ] **Step 5: Commit**

```bash
git add app/types.ts app/services/epub-parser.ts app/services/epub-parser.test.ts
git commit -m "feat: parse epub file-as metadata"
```

### Task 2: Persist `fileAs` and Sort by Filing Value

**Files:**
- Modify: `app/services/book-store.test.ts`
- Modify: `app/services/book-store.ts`

- [ ] **Step 1: Write the failing storage, migration, and sort tests**

```typescript
// app/services/book-store.test.ts
const FAKE_META: EpubMeta = {
  title: 'Test Book',
  fileAs: '',
  author: 'Author Name',
  description: 'A test description',
  series: 'Test Series',
  seriesIndex: 1,
  coverData: Buffer.from('fake-cover'),
  coverMime: 'image/jpeg',
};

it('persists fileAs on stored books', () => {
  bookStore.addBook('abc123', 'test.epub', '/books/test.epub', 1000, new Date(1000), {
    ...FAKE_META,
    fileAs: 'Asimov, Isaac',
  });

  const book = bookStore.getBookById('abc123');

  expect(book!.fileAs).toBe('Asimov, Isaac');
});

it('sorts by fileAs before title', () => {
  bookStore.addBook('id1', 'zebra.epub', '/books/zebra.epub', 100, new Date(), {
    ...FAKE_META,
    title: 'Zebra Stories',
    fileAs: 'Apple, A.',
  });
  bookStore.addBook('id2', 'apple.epub', '/books/apple.epub', 100, new Date(), {
    ...FAKE_META,
    title: 'Apple Stories',
    fileAs: 'Zulu, Z.',
  });

  const books = bookStore.listBooks();

  expect(books[0].title).toBe('Zebra Stories');
  expect(books[1].title).toBe('Apple Stories');
});

it('falls back to title when fileAs is empty', () => {
  bookStore.addBook('id1', 'b.epub', '/books/b.epub', 100, new Date(), { ...FAKE_META, title: 'Bravo', fileAs: '' });
  bookStore.addBook('id2', 'a.epub', '/books/a.epub', 100, new Date(), { ...FAKE_META, title: 'Alpha', fileAs: '' });

  const books = bookStore.listBooks();

  expect(books[0].title).toBe('Alpha');
  expect(books[1].title).toBe('Bravo');
});

it('adds the file_as column when opening an existing books table', () => {
  db.exec(`
    CREATE TABLE books (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      path TEXT NOT NULL,
      title TEXT NOT NULL,
      author TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      series TEXT NOT NULL DEFAULT '',
      series_index REAL NOT NULL DEFAULT 0,
      cover_data BLOB,
      cover_mime TEXT,
      size INTEGER NOT NULL,
      mtime INTEGER NOT NULL,
      added_at INTEGER NOT NULL
    )
  `);

  const migratedStore = new BookStore(booksDir, db);
  const columns = db.prepare('PRAGMA table_info(books)').all() as Array<{ name: string }>;

  expect(columns.some(column => column.name === 'file_as')).toBe(true);
  expect(migratedStore.listBooks()).toEqual([]);
});
```

- [ ] **Step 2: Run the targeted BookStore test to verify it fails**

Run: `npm test -- app/services/book-store.test.ts --runInBand`

Expected: FAIL with SQL errors about the missing `file_as` column, plus type/assertion failures where returned books do not have `fileAs`.

- [ ] **Step 3: Write the minimal BookStore implementation**

```typescript
// app/services/book-store.ts
interface BookRow {
  id: string;
  filename: string;
  path: string;
  title: string;
  file_as: string;
  author: string;
  description: string;
  series: string;
  series_index: number;
  has_cover: number;
  size: number;
  mtime: number;
  added_at: number;
}

private migrate(): void {
  this.db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id            TEXT    PRIMARY KEY,
      filename      TEXT    NOT NULL UNIQUE,
      path          TEXT    NOT NULL,
      title         TEXT    NOT NULL,
      file_as       TEXT    NOT NULL DEFAULT '',
      author        TEXT    NOT NULL DEFAULT '',
      description   TEXT    NOT NULL DEFAULT '',
      series        TEXT    NOT NULL DEFAULT '',
      series_index  REAL    NOT NULL DEFAULT 0,
      cover_data    BLOB,
      cover_mime    TEXT,
      size          INTEGER NOT NULL,
      mtime         INTEGER NOT NULL,
      added_at      INTEGER NOT NULL
    )
  `);

  const columns = this.db.prepare('PRAGMA table_info(books)').all() as Array<{ name: string }>;
  if (!columns.some(column => column.name === 'file_as')) {
    this.db.exec(`ALTER TABLE books ADD COLUMN file_as TEXT NOT NULL DEFAULT ''`);
  }
}

const stmt = this.db.prepare(`
  INSERT INTO books (id, filename, path, title, file_as, author, description, series, series_index, cover_data, cover_mime, size, mtime, added_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(filename) DO UPDATE SET
    id = excluded.id,
    path = excluded.path,
    title = excluded.title,
    file_as = excluded.file_as,
    author = excluded.author,
    description = excluded.description,
    series = excluded.series,
    series_index = excluded.series_index,
    cover_data = excluded.cover_data,
    cover_mime = excluded.cover_mime,
    size = excluded.size,
    mtime = excluded.mtime
`);

const fileAs = meta.fileAs.trim();

stmt.run(
  id,
  filename,
  filePath,
  title,
  fileAs,
  meta.author,
  meta.description,
  meta.series,
  meta.seriesIndex,
  meta.coverData,
  meta.coverMime,
  size,
  mtime.getTime(),
  Date.now()
);

const rows = this.db.prepare(`
  SELECT id, filename, path, title, file_as, author, description, series, series_index,
         cover_data IS NOT NULL AS has_cover, size, mtime, added_at
  FROM books
  ORDER BY CASE WHEN file_as != '' THEN file_as ELSE title END, title
`).all() as BookRow[];

return {
  id: r.id,
  filename: r.filename,
  path: r.path,
  title: r.title,
  fileAs: r.file_as,
  author: r.author,
  description: r.description,
  series: r.series,
  seriesIndex: r.series_index,
  hasCover: Boolean(r.has_cover),
  size: r.size,
  mtime: new Date(r.mtime),
  addedAt: new Date(r.added_at),
};
```

- [ ] **Step 4: Run the targeted BookStore test to verify it passes**

Run: `npm test -- app/services/book-store.test.ts --runInBand`

Expected: PASS with the new migration, persistence, and ordering assertions green.

- [ ] **Step 5: Commit**

```bash
git add app/services/book-store.ts app/services/book-store.test.ts
git commit -m "feat: store file-as sort keys for books"
```

### Task 3: Lock in API Exposure and Final Verification

**Files:**
- Modify: `app/routes/ui.test.ts`

- [ ] **Step 1: Write the failing API response test**

```typescript
// app/routes/ui.test.ts
it('returns fileAs in the books API response', async () => {
  const meta: EpubMeta = {
    ...FAKE_META,
    title: 'Foundation',
    fileAs: 'Asimov, Isaac',
    author: 'Isaac Asimov',
  };

  bookStore.addBook('foundation1', 'foundation.epub', path.join(booksDir, 'foundation.epub'), 200, new Date(), meta);

  const agent = await authenticatedAgent();
  const res = await agent.get('/api/books');

  expect(res.status).toBe(200);
  expect(res.body[0].fileAs).toBe('Asimov, Isaac');
  expect(res.body[0].path).toBeUndefined();
  expect(res.body[0].description).toBeUndefined();
});
```

- [ ] **Step 2: Run the targeted UI route test to verify it fails or proves the route is already correct**

Run: `npm test -- app/routes/ui.test.ts --runInBand -t "returns fileAs in the books API response"`

Expected: If `fileAs` is not yet flowing through `BookStore`, FAIL with `Expected: "Asimov, Isaac" Received: undefined`. After Task 2, this same test should pass without adding new route logic.

- [ ] **Step 3: Keep the route mapper limited to hiding only `path` and `description`**

```typescript
// app/routes/ui.ts
router.get('/api/books', sessionAuth, (_req: Request, res: Response) => {
  res.json(
    bookStore.listBooks().map(b => {
      const { path: _path, description: _description, ...rest } = b;
      return rest;
    })
  );
});
```

- [ ] **Step 4: Run the focused and full verification commands**

Run: `npm test -- app/routes/ui.test.ts --runInBand`
Expected: PASS

Run: `npm test -- app/services/epub-parser.test.ts app/services/book-store.test.ts app/routes/ui.test.ts --runInBand`
Expected: PASS

Run: `npm test -- --runInBand`
Expected: PASS for the full Jest suite

Run: `npm run build`
Expected: PASS and `dist/` refreshed without TypeScript errors

- [ ] **Step 5: Commit**

```bash
git add app/routes/ui.test.ts app/routes/ui.ts
git commit -m "test: verify file-as book API exposure"
```

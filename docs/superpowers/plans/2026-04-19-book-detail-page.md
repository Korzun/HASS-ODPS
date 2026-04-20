# Book Detail Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a clickable book detail page showing title, author, series, description, publisher, subjects, and identifiers.

**Architecture:** Extend `EpubMeta` and `Book` types with three new fields (`publisher`, `identifiers`, `subjects`), update the EPUB parser to extract them, add a DB migration for the new columns, expose a `GET /api/books/:id` endpoint returning the full book object, and wire up a new in-page detail view in the SPA that's reachable by clicking any book in the series detail or standalone books sections.

**Tech Stack:** TypeScript, Express, better-sqlite3, AdmZip, fast-xml-parser, vanilla JS SPA

---

### Task 1: Extend EpubMeta + epub-parser to extract publisher, identifiers, subjects

**Files:**
- Modify: `app/types.ts`
- Modify: `app/services/epub-parser.ts`
- Modify: `app/services/epub-parser.test.ts`
- Modify: `app/services/book-store.test.ts` (update FAKE_META to satisfy EpubMeta)
- Modify: `app/routes/ui.test.ts` (update FAKE_META to satisfy EpubMeta)

---

- [ ] **Step 1: Add publisher, identifiers, subjects to EpubMeta in types.ts**

Replace the `EpubMeta` interface in `app/types.ts`:

```typescript
export interface EpubMeta {
  title: string;
  fileAs: string;
  author: string;
  description: string;
  publisher: string;
  series: string;
  seriesIndex: number;
  identifiers: { scheme: string; value: string }[];
  subjects: string[];
  coverData: Buffer | null;
  coverMime: string | null;
}
```

---

- [ ] **Step 2: Update FAKE_META in book-store.test.ts to match new EpubMeta shape**

In `app/services/book-store.test.ts`, update `FAKE_META`:

```typescript
const FAKE_META: EpubMeta = {
  title: 'Test Book',
  author: 'Author Name',
  description: 'A test description',
  publisher: 'Test Publisher',
  series: 'Test Series',
  seriesIndex: 1,
  fileAs: '',
  identifiers: [{ scheme: 'ISBN', value: '978-0000000000' }],
  subjects: ['Fiction'],
  coverData: Buffer.from('fake-cover'),
  coverMime: 'image/jpeg',
};
```

---

- [ ] **Step 3: Update FAKE_META in ui.test.ts to match new EpubMeta shape**

In `app/routes/ui.test.ts`, update `FAKE_META`:

```typescript
const FAKE_META: EpubMeta = {
  title: 'Test Book',
  author: 'Test Author',
  description: '',
  publisher: '',
  series: '',
  seriesIndex: 0,
  fileAs: '',
  identifiers: [],
  subjects: [],
  coverData: null,
  coverMime: null,
};
```

---

- [ ] **Step 4: Update makeEpub helper in epub-parser.test.ts to support new fields**

Replace the `makeEpub` function signature and OPF template in `app/services/epub-parser.test.ts`. The function builds a minimal valid EPUB zip. Add support for `publisher`, `identifiers` (array of `{scheme?: string; value: string}`), and `subjects` (string array):

```typescript
function makeEpub(
  opts: {
    title?: string;
    author?: string;
    description?: string;
    publisher?: string;
    identifiers?: Array<{ scheme?: string; value: string }>;
    subjects?: string[];
    series?: string;
    seriesIndex?: number;
    coverData?: Buffer;
    coverMime?: string;
  } = {}
): Buffer {
  const zip = new AdmZip();

  const containerXml = `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
  zip.addFile('META-INF/container.xml', Buffer.from(containerXml));

  const coverItem = opts.coverData
    ? `<item id="cover-img" href="cover.jpg" media-type="${opts.coverMime ?? 'image/jpeg'}"/>`
    : '';
  const coverMeta = opts.coverData ? `<meta name="cover" content="cover-img"/>` : '';
  const seriesMeta = opts.series
    ? `<meta name="calibre:series" content="${opts.series}"/><meta name="calibre:series_index" content="${opts.seriesIndex ?? 1}"/>`
    : '';
  const identifierElems = (opts.identifiers ?? [])
    .map((id) =>
      id.scheme
        ? `<dc:identifier opf:scheme="${id.scheme}">${id.value}</dc:identifier>`
        : `<dc:identifier>${id.value}</dc:identifier>`
    )
    .join('\n    ');
  const subjectElems = (opts.subjects ?? [])
    .map((s) => `<dc:subject>${s}</dc:subject>`)
    .join('\n    ');

  const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0" xmlns:opf="http://www.idpf.org/2007/opf">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    ${opts.title !== undefined ? `<dc:title>${opts.title}</dc:title>` : ''}
    ${opts.author !== undefined ? `<dc:creator>${opts.author}</dc:creator>` : ''}
    ${opts.description !== undefined ? `<dc:description>${opts.description}</dc:description>` : ''}
    ${opts.publisher !== undefined ? `<dc:publisher>${opts.publisher}</dc:publisher>` : ''}
    ${identifierElems}
    ${subjectElems}
    ${coverMeta}
    ${seriesMeta}
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    ${coverItem}
  </manifest>
  <spine toc="ncx"/>
</package>`;
  zip.addFile('OEBPS/content.opf', Buffer.from(opf));

  if (opts.coverData) {
    zip.addFile('OEBPS/cover.jpg', opts.coverData);
  }

  return zip.toBuffer();
}
```

---

- [ ] **Step 5: Write failing tests for publisher, identifiers, and subjects extraction**

Add these test cases inside the `describe('parseEpub', ...)` block in `app/services/epub-parser.test.ts`:

```typescript
it('parses publisher', () => {
  const filePath = path.join(tmpDir, 'publisher.epub');
  fs.writeFileSync(filePath, makeEpub({ title: 'T', publisher: 'Penguin Books' }));
  const meta = parseEpub(filePath);
  expect(meta.publisher).toBe('Penguin Books');
});

it('returns empty publisher when absent', () => {
  const filePath = path.join(tmpDir, 'no-publisher.epub');
  fs.writeFileSync(filePath, makeEpub({ title: 'T' }));
  const meta = parseEpub(filePath);
  expect(meta.publisher).toBe('');
});

it('parses identifier with opf:scheme attribute', () => {
  const filePath = path.join(tmpDir, 'isbn-scheme.epub');
  fs.writeFileSync(
    filePath,
    makeEpub({ title: 'T', identifiers: [{ scheme: 'ISBN', value: '978-0593135204' }] })
  );
  const meta = parseEpub(filePath);
  expect(meta.identifiers).toEqual([{ scheme: 'ISBN', value: '978-0593135204' }]);
});

it('infers ISBN scheme from value starting with 978', () => {
  const filePath = path.join(tmpDir, 'isbn-infer.epub');
  fs.writeFileSync(
    filePath,
    makeEpub({ title: 'T', identifiers: [{ value: '978-0593135204' }] })
  );
  const meta = parseEpub(filePath);
  expect(meta.identifiers[0].scheme).toBe('ISBN');
  expect(meta.identifiers[0].value).toBe('978-0593135204');
});

it('infers UUID scheme from urn:uuid: prefix', () => {
  const filePath = path.join(tmpDir, 'uuid-infer.epub');
  fs.writeFileSync(
    filePath,
    makeEpub({ title: 'T', identifiers: [{ value: 'urn:uuid:abc1-2345' }] })
  );
  const meta = parseEpub(filePath);
  expect(meta.identifiers[0].scheme).toBe('UUID');
  expect(meta.identifiers[0].value).toBe('urn:uuid:abc1-2345');
});

it('skips identifiers with empty values', () => {
  const filePath = path.join(tmpDir, 'empty-id.epub');
  fs.writeFileSync(
    filePath,
    makeEpub({ title: 'T', identifiers: [{ scheme: 'ISBN', value: '' }] })
  );
  const meta = parseEpub(filePath);
  expect(meta.identifiers).toEqual([]);
});

it('returns empty identifiers when absent', () => {
  const filePath = path.join(tmpDir, 'no-id.epub');
  fs.writeFileSync(filePath, makeEpub({ title: 'T' }));
  const meta = parseEpub(filePath);
  expect(meta.identifiers).toEqual([]);
});

it('parses multiple subjects', () => {
  const filePath = path.join(tmpDir, 'subjects.epub');
  fs.writeFileSync(
    filePath,
    makeEpub({ title: 'T', subjects: ['Science Fiction', 'Space Exploration'] })
  );
  const meta = parseEpub(filePath);
  expect(meta.subjects).toEqual(['Science Fiction', 'Space Exploration']);
});

it('returns empty subjects when absent', () => {
  const filePath = path.join(tmpDir, 'no-subjects.epub');
  fs.writeFileSync(filePath, makeEpub({ title: 'T' }));
  const meta = parseEpub(filePath);
  expect(meta.subjects).toEqual([]);
});
```

---

- [ ] **Step 6: Run tests to confirm they fail**

```bash
npx jest app/services/epub-parser.test.ts --no-coverage
```

Expected: new tests FAIL with TypeScript compile errors or "meta.publisher is undefined".

---

- [ ] **Step 7: Implement publisher, identifiers, subjects extraction in epub-parser.ts**

In `app/services/epub-parser.ts`, make the following changes:

**a) Update the `isArray` config** to include `dc:identifier` and `dc:subject`:

```typescript
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) =>
    ['item', 'meta', 'dc:title', 'dc:creator', 'dc:identifier', 'dc:subject'].includes(name),
});
```

**b) Add `inferScheme` helper** just before `parseEpub`:

```typescript
function inferScheme(value: string): string {
  if (value.startsWith('978') || value.startsWith('979')) return 'ISBN';
  if (value.toLowerCase().startsWith('urn:uuid:')) return 'UUID';
  return '';
}
```

**c) Add extraction of publisher, identifiers, subjects** in the "Step 3: extract metadata" section, after the existing `description` extraction and before the `metas` block:

```typescript
const rawPublisher = metadata['dc:publisher'];
const publisher = (
  typeof rawPublisher === 'string'
    ? rawPublisher
    : typeof rawPublisher === 'object' && rawPublisher !== null
      ? ((rawPublisher as { '#text'?: string })['#text'] ?? '')
      : ''
).trim();

const rawIdentifiers = (metadata['dc:identifier'] ?? []) as MetaLike[];
const identifiers = rawIdentifiers
  .map((item) => {
    const value = (typeof item === 'string' ? item : (item['#text'] ?? '')).trim();
    const schemeAttr = typeof item === 'object' ? ((item['@_opf:scheme'] as string) ?? '') : '';
    const scheme = schemeAttr || inferScheme(value);
    return { scheme, value };
  })
  .filter(({ value }) => value !== '');

const rawSubjects = (metadata['dc:subject'] ?? []) as MetaLike[];
const subjects = rawSubjects
  .map((item) => (typeof item === 'string' ? item : (item['#text'] ?? '')).trim())
  .filter(Boolean);
```

**d) Update the return value** to include the new fields:

```typescript
return { title, fileAs, author, description, publisher, identifiers, subjects, series, seriesIndex, coverData, coverMime };
```

---

- [ ] **Step 8: Run tests to confirm they pass**

```bash
npx jest app/services/epub-parser.test.ts --no-coverage
```

Expected: all tests PASS.

---

- [ ] **Step 9: Also verify existing tests in book-store and ui routes still compile**

```bash
npx jest app/services/book-store.test.ts app/routes/ui.test.ts --no-coverage
```

Expected: all tests PASS (FAKE_META updates from steps 2–3 satisfy the new EpubMeta shape).

---

- [ ] **Step 10: Commit**

```bash
git add app/types.ts app/services/epub-parser.ts app/services/epub-parser.test.ts app/services/book-store.test.ts app/routes/ui.test.ts
git commit -m "feat: extract publisher, identifiers, and subjects from EPUB metadata"
```

---

### Task 2: Extend Book type + BookStore DB migration

**Files:**
- Modify: `app/types.ts`
- Modify: `app/services/book-store.ts`
- Modify: `app/services/book-store.test.ts`

---

- [ ] **Step 1: Add publisher, identifiers, subjects to the Book interface in types.ts**

In `app/types.ts`, update `Book`:

```typescript
export interface Book {
  id: string; // 32-char partial MD5 (KoReader binary algorithm) — matches KOSync progress.document
  filename: string;
  path: string;
  title: string;
  fileAs: string;
  author: string;
  description: string;
  publisher: string;
  series: string;
  seriesIndex: number; // REAL — supports fractional entries like 2.5
  identifiers: { scheme: string; value: string }[];
  subjects: string[];
  hasCover: boolean; // true when cover blob is present in SQLite
  size: number;
  mtime: Date;
  addedAt: Date;
}
```

---

- [ ] **Step 2: Write failing tests for BookStore migration and new fields**

Add these tests to `app/services/book-store.test.ts`, inside a new `describe('publisher, identifiers, subjects', ...)` block:

```typescript
describe('publisher, identifiers, subjects', () => {
  it('DB migration adds publisher, identifiers, subjects columns', () => {
    const cols = db.prepare('PRAGMA table_info(books)').all() as Array<{ name: string }>;
    const names = cols.map((c) => c.name);
    expect(names).toContain('publisher');
    expect(names).toContain('identifiers');
    expect(names).toContain('subjects');
  });

  it('stores and retrieves publisher', () => {
    bookStore.addBook('id1', 'book.epub', '/books/book.epub', 100, new Date(), FAKE_META);
    const book = bookStore.getBookById('id1');
    expect(book?.publisher).toBe('Test Publisher');
  });

  it('stores and retrieves identifiers (JSON round-trip)', () => {
    bookStore.addBook('id1', 'book.epub', '/books/book.epub', 100, new Date(), FAKE_META);
    const book = bookStore.getBookById('id1');
    expect(book?.identifiers).toEqual([{ scheme: 'ISBN', value: '978-0000000000' }]);
  });

  it('stores and retrieves subjects (JSON round-trip)', () => {
    bookStore.addBook('id1', 'book.epub', '/books/book.epub', 100, new Date(), FAKE_META);
    const book = bookStore.getBookById('id1');
    expect(book?.subjects).toEqual(['Fiction']);
  });

  it('stores empty identifiers as empty array', () => {
    bookStore.addBook('id1', 'book.epub', '/books/book.epub', 100, new Date(), {
      ...FAKE_META,
      identifiers: [],
    });
    const book = bookStore.getBookById('id1');
    expect(book?.identifiers).toEqual([]);
  });

  it('stores empty subjects as empty array', () => {
    bookStore.addBook('id1', 'book.epub', '/books/book.epub', 100, new Date(), {
      ...FAKE_META,
      subjects: [],
    });
    const book = bookStore.getBookById('id1');
    expect(book?.subjects).toEqual([]);
  });
});
```

---

- [ ] **Step 3: Run tests to confirm they fail**

```bash
npx jest app/services/book-store.test.ts --no-coverage
```

Expected: new tests FAIL — TypeScript errors about missing Book fields or missing DB columns.

---

- [ ] **Step 4: Update BookStore — BookRow, migrate, addBook, listBooks, getBookById, rowToBook**

In `app/services/book-store.ts`, make the following changes:

**a) Update `BookRow` interface** to include new columns:

```typescript
interface BookRow {
  id: string;
  filename: string;
  path: string;
  title: string;
  file_as: string;
  author: string;
  description: string;
  publisher: string;
  series: string;
  series_index: number;
  identifiers: string; // JSON string
  subjects: string;    // JSON string
  has_cover: number;
  size: number;
  mtime: number;
  added_at: number;
}
```

**b) Add v3 migration** at the end of the `migrate()` method, after the `user_version < 2` block:

```typescript
if (user_version < 3) {
  const cols = this.db.prepare('PRAGMA table_info(books)').all() as Array<{ name: string }>;
  const colNames = new Set(cols.map((c) => c.name));
  if (!colNames.has('publisher')) {
    this.db.exec(`ALTER TABLE books ADD COLUMN publisher TEXT NOT NULL DEFAULT ''`);
  }
  if (!colNames.has('identifiers')) {
    this.db.exec(`ALTER TABLE books ADD COLUMN identifiers TEXT NOT NULL DEFAULT '[]'`);
  }
  if (!colNames.has('subjects')) {
    this.db.exec(`ALTER TABLE books ADD COLUMN subjects TEXT NOT NULL DEFAULT '[]'`);
  }
  this.db.exec('PRAGMA user_version = 3');
}
```

**c) Update `addBook` SQL** to include the three new columns. Replace the entire `stmt` prepare call:

```typescript
const stmt = this.db.prepare(`
  INSERT INTO books (id, filename, path, title, file_as, author, description, publisher, series, series_index, identifiers, subjects, cover_data, cover_mime, size, mtime, added_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(filename) DO UPDATE SET
    id = excluded.id,
    path = excluded.path,
    title = excluded.title,
    file_as = excluded.file_as,
    author = excluded.author,
    description = excluded.description,
    publisher = excluded.publisher,
    series = excluded.series,
    series_index = excluded.series_index,
    identifiers = excluded.identifiers,
    subjects = excluded.subjects,
    cover_data = excluded.cover_data,
    cover_mime = excluded.cover_mime,
    size = excluded.size,
    mtime = excluded.mtime
`);
```

And update the `stmt.run(...)` call to pass the new values (add `meta.publisher`, `JSON.stringify(meta.identifiers)`, `JSON.stringify(meta.subjects)` after `meta.description` and before `meta.series`):

```typescript
stmt.run(
  id,
  filename,
  filePath,
  title,
  fileAs,
  meta.author,
  meta.description,
  meta.publisher,
  meta.series,
  meta.seriesIndex,
  JSON.stringify(meta.identifiers),
  JSON.stringify(meta.subjects),
  meta.coverData,
  meta.coverMime,
  size,
  mtime.getTime(),
  Date.now()
);
```

**d) Update SELECT in `listBooks`** to include new columns:

```typescript
const rows = this.db
  .prepare(
    `
  SELECT id, filename, path, title, file_as, author, description, publisher, series, series_index,
         identifiers, subjects, cover_data IS NOT NULL AS has_cover, size, mtime, added_at
  FROM books
  ORDER BY CASE WHEN file_as != '' THEN file_as ELSE title END, title, filename
`
  )
  .all() as BookRow[];
```

**e) Update SELECT in `getBookById`** to include new columns:

```typescript
const row = this.db
  .prepare(
    `
  SELECT id, filename, path, title, file_as, author, description, publisher, series, series_index,
         identifiers, subjects, cover_data IS NOT NULL AS has_cover, size, mtime, added_at
  FROM books WHERE id = ?
`
  )
  .get(id) as BookRow | undefined;
```

**f) Update `rowToBook`** to map new fields:

```typescript
private rowToBook(r: BookRow): Book {
  const fileAs = r.file_as;
  return {
    id: r.id,
    filename: r.filename,
    path: r.path,
    title: r.title,
    fileAs,
    author: r.author,
    description: r.description,
    publisher: r.publisher,
    series: r.series,
    seriesIndex: r.series_index,
    identifiers: JSON.parse(r.identifiers) as { scheme: string; value: string }[],
    subjects: JSON.parse(r.subjects) as string[],
    hasCover: Boolean(r.has_cover),
    size: r.size,
    mtime: new Date(r.mtime),
    addedAt: new Date(r.added_at),
  };
}
```

---

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npx jest app/services/book-store.test.ts --no-coverage
```

Expected: all tests PASS.

---

- [ ] **Step 6: Commit**

```bash
git add app/types.ts app/services/book-store.ts app/services/book-store.test.ts
git commit -m "feat: add publisher, identifiers, subjects to Book model and DB migration"
```

> **Note on existing books:** `scan()` only processes files not already in the DB, so books imported before this migration will have empty `publisher`, `identifiers`, and `subjects`. To populate the new fields for an existing book, delete it from the library and re-upload the EPUB, then trigger a scan.

---

### Task 3: Add GET /api/books/:id endpoint

**Files:**
- Modify: `app/routes/ui.test.ts`
- Modify: `app/routes/ui.ts`

---

- [ ] **Step 1: Write failing tests for GET /api/books/:id**

In `app/routes/ui.test.ts`, add a new `describe` block for the new endpoint. Place it after the existing `describe('GET /api/books', ...)` block. Use the existing `adminAgent()` helper which returns a supertest agent with a valid admin session:

```typescript
describe('GET /api/books/:id', () => {
  it('returns full book data including description, publisher, identifiers, subjects', async () => {
    const agent = await adminAgent();
    const meta: EpubMeta = {
      ...FAKE_META,
      title: 'Detail Book',
      description: 'A detailed description.',
      publisher: 'Test Publisher',
      identifiers: [{ scheme: 'ISBN', value: '978-1234567890' }],
      subjects: ['Fiction', 'Mystery'],
    };
    bookStore.addBook('detailid1', 'detail.epub', '/books/detail.epub', 2000, new Date(), meta);

    const res = await agent.get('/api/books/detailid1');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('detailid1');
    expect(res.body.title).toBe('Detail Book');
    expect(res.body.description).toBe('A detailed description.');
    expect(res.body.publisher).toBe('Test Publisher');
    expect(res.body.identifiers).toEqual([{ scheme: 'ISBN', value: '978-1234567890' }]);
    expect(res.body.subjects).toEqual(['Fiction', 'Mystery']);
    // path must NOT be exposed
    expect(res.body.path).toBeUndefined();
  });

  it('returns 404 for unknown book ID', async () => {
    const agent = await adminAgent();
    const res = await agent.get('/api/books/doesnotexist');
    expect(res.status).toBe(404);
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/books/anyid');
    expect(res.status).toBe(401);
  });
});
```

---

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest app/routes/ui.test.ts --no-coverage -t "GET /api/books/:id"
```

Expected: tests FAIL with 404 (route does not exist yet).

---

- [ ] **Step 3: Add GET /api/books/:id route to ui.ts**

In `app/routes/ui.ts`, add this route **before** the `GET /api/books/:id/cover` route (after the `GET /api/books` list endpoint):

```typescript
router.get('/api/books/:id', sessionAuth, (req: Request, res: Response) => {
  const book = bookStore.getBookById(req.params.id);
  if (!book) {
    res.status(404).json({ error: 'Book not found' });
    return;
  }
  const { path: _path, ...rest } = book;
  res.json(rest);
});
```

---

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest app/routes/ui.test.ts --no-coverage
```

Expected: all tests PASS.

---

- [ ] **Step 5: Commit**

```bash
git add app/routes/ui.ts app/routes/ui.test.ts
git commit -m "feat: add GET /api/books/:id endpoint returning full book metadata"
```

---

### Task 4: Frontend — book detail page

**Files:**
- Modify: `app/public/index.html`

This task is frontend-only with no automated tests. Verify manually.

---

- [ ] **Step 1: Add CSS for the book detail page**

In `app/public/index.html`, add these styles inside the `<style>` block, after the existing `.series-back` / `.series-order-label` rules and before the `body.user-mode` rule:

```css
/* Book detail page */
.book-detail-nav{font-size:.8rem;margin-bottom:1rem}
.book-back-btn{background:none;border:none;color:#1e40af;font-size:.8rem;font-weight:500;cursor:pointer;padding:0;font-family:inherit}
.book-back-btn:hover{text-decoration:underline}
.book-detail-nav .sep{color:#9ca3af;margin:0 .4rem}
.book-detail-nav .crumb-current{color:#6b7280}
.book-detail-hero{background:#fff;border-radius:6px;padding:1.25rem;margin-bottom:.75rem;box-shadow:0 1px 3px rgba(0,0,0,.07);display:flex;gap:1.25rem;align-items:flex-start}
.book-detail-meta{flex:1;min-width:0}
.book-detail-title{font-size:1.25rem;font-weight:700;color:#111;line-height:1.2;margin-bottom:.3rem}
.book-detail-author{font-size:.9rem;color:#6b7280;margin-bottom:.5rem}
.book-detail-series-badge{display:inline-flex;align-items:center;gap:.35rem;background:#eff6ff;border:1px solid #bfdbfe;border-radius:20px;padding:.2rem .75rem;font-size:.75rem;color:#1e40af;margin-bottom:.75rem}
.book-detail-stats{display:flex;flex-wrap:wrap;gap:.5rem 1.5rem}
.book-detail-stat{font-size:.75rem;color:#9ca3af}
.book-detail-stat span{color:#374151}
.book-detail-section{background:#fff;border-radius:6px;padding:1rem 1.25rem;margin-bottom:.75rem;box-shadow:0 1px 3px rgba(0,0,0,.07)}
.book-detail-section-label{font-size:.7rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#9ca3af;margin-bottom:.6rem}
.book-detail-description{font-size:.875rem;line-height:1.7;color:#374151}
.book-detail-subjects{display:flex;flex-wrap:wrap;gap:.5rem}
.book-detail-subject{background:#f0f9ff;border:1px solid #bae6fd;border-radius:16px;padding:.2rem .75rem;font-size:.75rem;color:#0369a1}
.book-detail-identifiers{display:flex;flex-direction:column;gap:.5rem}
.book-detail-id-row{display:flex;align-items:center;gap:.75rem;font-size:.8rem}
.book-detail-id-scheme{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:4px;padding:.1rem .5rem;font-size:.7rem;color:#166534;font-weight:600;min-width:48px;text-align:center}
.book-detail-id-value{color:#374151;font-family:monospace;font-size:.8rem;word-break:break-all}
```

---

- [ ] **Step 2: Add the book-section div to the HTML**

In `app/public/index.html`, after `<div id="series-section" style="display:none"></div>`, add:

```html
    <div id="book-section" style="display:none"></div>
```

---

- [ ] **Step 3: Add navigation state variables and bookSection reference**

In the `<script>` block, after the line `let currentSeriesName = null;`, add:

```javascript
const bookSection = document.getElementById('book-section');
let currentBookId = null;
let bookDetailOrigin = null; // { type: 'series', name: string } | { type: 'library' }
```

---

- [ ] **Step 4: Update tab click handler to clear book state**

In the tab click handler (inside `document.querySelectorAll('.tab').forEach(...)`), add two lines after `currentSeriesName = null;`:

```javascript
currentBookId = null;
bookDetailOrigin = null;
bookSection.style.display = 'none';
```

The full handler block should read:

```javascript
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const name = tab.dataset.tab;
    seriesSection.style.display = 'none';
    currentSeriesName = null;
    currentBookId = null;
    bookDetailOrigin = null;
    bookSection.style.display = 'none';
    librarySection.style.display = name === 'library' ? '' : 'none';
    usersSection.style.display = name === 'users' ? '' : 'none';
    if (name === 'users' && !usersLoaded) loadUsers();
  });
});
```

---

- [ ] **Step 5: Update showLibraryView to clear book state**

Replace the `showLibraryView` function:

```javascript
function showLibraryView() {
  currentSeriesName = null;
  currentBookId = null;
  bookDetailOrigin = null;
  seriesSection.style.display = 'none';
  bookSection.style.display = 'none';
  librarySection.style.display = '';
}
```

---

- [ ] **Step 6: Update showSeriesPage to clear book state**

At the top of `showSeriesPage(seriesName, books)`, add these two lines after `currentSeriesName = seriesName;`:

```javascript
currentBookId = null;
bookDetailOrigin = null;
bookSection.style.display = 'none';
```

---

- [ ] **Step 7: Add renderBookDetail function**

Add this function to the `<script>` block, before `showLibraryView`:

```javascript
function renderBookDetail(book, origin) {
  const backLabel = origin.type === 'series' ? esc(origin.name) : 'Library';
  const coverHtml = book.hasCover
    ? '<img src="/api/books/' + esc(book.id) + '/cover" alt="' + esc(book.title) + '" style="width:80px;height:114px;object-fit:cover;border-radius:4px;display:block;box-shadow:0 2px 8px rgba(0,0,0,.15)">'
    : '<div style="width:80px;height:114px;background:#e5e7eb;border-radius:4px;"></div>';

  const seriesBadge = book.series
    ? '<div class="book-detail-series-badge">📚 ' + esc(book.series) + (book.seriesIndex ? ' · Book ' + book.seriesIndex : '') + '</div>'
    : '';

  const publisherStat = book.publisher
    ? '<div class="book-detail-stat">Publisher: <span>' + esc(book.publisher) + '</span></div>'
    : '';

  const addedDate = new Date(book.addedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const descSection = book.description
    ? '<div class="book-detail-section">' +
        '<div class="book-detail-section-label">Description</div>' +
        '<div class="book-detail-description">' + esc(book.description) + '</div>' +
      '</div>'
    : '';

  const subjectsSection = book.subjects && book.subjects.length > 0
    ? '<div class="book-detail-section">' +
        '<div class="book-detail-section-label">Subjects</div>' +
        '<div class="book-detail-subjects">' +
          book.subjects.map(function(s) { return '<span class="book-detail-subject">' + esc(s) + '</span>'; }).join('') +
        '</div>' +
      '</div>'
    : '';

  const identifiersSection = book.identifiers && book.identifiers.length > 0
    ? '<div class="book-detail-section">' +
        '<div class="book-detail-section-label">Identifiers</div>' +
        '<div class="book-detail-identifiers">' +
          book.identifiers.map(function(id) {
            return '<div class="book-detail-id-row">' +
              (id.scheme ? '<span class="book-detail-id-scheme">' + esc(id.scheme) + '</span>' : '') +
              '<span class="book-detail-id-value">' + esc(id.value) + '</span>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>'
    : '';

  return '<div class="book-detail-nav">' +
      '<button class="book-back-btn" type="button">← ' + backLabel + '</button>' +
      '<span class="sep">/</span>' +
      '<span class="crumb-current">' + esc(book.title) + '</span>' +
    '</div>' +
    '<div class="book-detail-hero">' +
      '<div style="flex-shrink:0">' + coverHtml + '</div>' +
      '<div class="book-detail-meta">' +
        '<div class="book-detail-title">' + esc(book.title) + '</div>' +
        (book.author ? '<div class="book-detail-author">' + esc(book.author) + '</div>' : '') +
        seriesBadge +
        '<div class="book-detail-stats">' +
          publisherStat +
          '<div class="book-detail-stat">Format: <span>EPUB</span></div>' +
          '<div class="book-detail-stat">Size: <span>' + formatSize(book.size) + '</span></div>' +
          '<div class="book-detail-stat">Added: <span>' + addedDate + '</span></div>' +
        '</div>' +
      '</div>' +
    '</div>' +
    descSection +
    subjectsSection +
    identifiersSection;
}
```

---

- [ ] **Step 8: Add showBookDetailPage function**

Add this function to the `<script>` block, after `renderBookDetail`:

```javascript
async function showBookDetailPage(id, origin) {
  currentBookId = id;
  bookDetailOrigin = origin;
  librarySection.style.display = 'none';
  seriesSection.style.display = 'none';
  bookSection.innerHTML = '<p style="color:#6b7280;padding:2rem;text-align:center">Loading…</p>';
  bookSection.style.display = '';

  try {
    const res = await fetch('/api/books/' + encodeURIComponent(id));
    if (!res.ok) {
      bookSection.innerHTML = '<p style="color:#dc2626;padding:2rem;text-align:center">Book not found.</p>';
      return;
    }
    const book = await res.json();
    bookSection.innerHTML = renderBookDetail(book, origin);
    bookSection.querySelector('.book-back-btn').addEventListener('click', function() {
      if (origin.type === 'series') {
        const grouped = groupBooks(cachedBooks);
        const entry = grouped.series.find(function(pair) { return pair[0] === origin.name; });
        if (entry) showSeriesPage(origin.name, entry[1]);
        else showLibraryView();
      } else {
        showLibraryView();
      }
    });
  } catch {
    bookSection.innerHTML = '<p style="color:#dc2626;padding:2rem;text-align:center">Failed to load book details.</p>';
  }
}
```

---

- [ ] **Step 9: Add click handlers to series detail page books**

In the `showSeriesPage` function, inside the `books.forEach(book => { ... })` loop, add a click handler on the `li` **after** the existing delete/clear event listeners:

```javascript
li.style.cursor = 'pointer';
li.addEventListener('click', function(e) {
  if (e.target.closest('.delete-btn') || e.target.closest('.clear-btn')) return;
  showBookDetailPage(book.id, { type: 'series', name: seriesName });
});
```

---

- [ ] **Step 10: Add click handlers to standalone books**

In `renderStandaloneSection`, inside the `books.forEach(book => { ... })` loop, add a click handler on the `li` **after** the existing delete/clear event listeners:

```javascript
li.style.cursor = 'pointer';
li.addEventListener('click', function(e) {
  if (e.target.closest('.delete-btn') || e.target.closest('.clear-btn')) return;
  showBookDetailPage(book.id, { type: 'library' });
});
```

---

- [ ] **Step 11: Run the full test suite**

```bash
npx jest --no-coverage
```

Expected: all tests PASS.

---

- [ ] **Step 12: Manual verification**

Start the server and verify:

1. Navigate to the library. Click a book in a series detail page → book detail page renders with breadcrumb `← [Series Name] / [Title]`.
2. Click `← [Series Name]` → returns to series detail page.
3. Expand "Standalone Books", click a book → book detail page renders with breadcrumb `← Library / [Title]`.
4. Click `← Library` → returns to library view.
5. Navigate to a book detail page, then click a tab → library/users section shows correctly, book section hidden.
6. Verify description, publisher, subjects, and identifiers only appear when non-empty.
7. Upload a new EPUB and scan — verify its detail page populates correctly after a re-scan.

---

- [ ] **Step 13: Commit**

```bash
git add app/public/index.html
git commit -m "feat: add book detail page with title, author, series, description, publisher, subjects, and identifiers"
```

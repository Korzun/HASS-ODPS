# Library Scan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a library scan that imports untracked EPUBs from disk into the database and removes stale DB entries, triggered manually from the UI and automatically on server startup.

**Architecture:** A `scan()` method on `BookStore` diffs the filesystem against the DB — calling `addBook()` for new EPUBs and `deleteBook()` for stale entries — and returns `{ imported, removed }`. An optional `ScanImporter` argument enables test injection of a mock parser. A new `POST /api/books/scan` route exposes it. `index.ts` calls it synchronously before `app.listen()`. The UI adds a "Scan Library" button that disables the upload zone while running.

**Tech Stack:** TypeScript 5, Express 4, better-sqlite3, Jest + supertest

---

## File Map

| File | Change |
|------|--------|
| `app/services/BookStore.ts` | Export `ScanImporter` interface; add `scan()` method; import `parseEpub`, `partialMD5` |
| `app/routes/ui.ts` | Add `POST /api/books/scan` route |
| `app/index.ts` | Call `bookStore.scan()` on startup with `log` |
| `app/public/index.html` | Add "Scan Library" button, `#scan-status`, disable-during-scan logic |
| `tests/BookStore.test.ts` | Add `describe('BookStore.scan()')` block |
| `tests/ui.test.ts` | Add `describe('POST /api/books/scan')` block |

---

## Task 1: BookStore.scan() — implementation + tests

**Files:**
- Modify: `app/services/BookStore.ts`
- Modify: `tests/BookStore.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to the bottom of `tests/BookStore.test.ts` (after the last `describe` block). The file already imports `EpubMeta` from `../app/types` — add `import * as crypto from 'crypto'` to the existing imports at the top, and add the `ScanImporter` import alongside the `BookStore` import:

```typescript
// Add to existing import line:
import { BookStore, ScanImporter } from '../app/services/BookStore';
// Add near top with other node imports:
import * as crypto from 'crypto';
```

Then add this entire block at the end of the file:

```typescript
// ── scan() ───────────────────────────────────────────────────────────────────

function makeMockImporter(): ScanImporter {
  return {
    parseEpub: (_filePath: string): EpubMeta => ({
      title: 'Mock Title',
      author: 'Mock Author',
      description: '',
      series: '',
      seriesIndex: 0,
      coverData: null,
      coverMime: null,
    }),
    partialMD5: (filePath: string): string =>
      crypto.createHash('md5').update(filePath).digest('hex'),
  };
}

describe('BookStore.scan()', () => {
  it('returns empty lists when booksDir is empty and DB is empty', () => {
    const result = bookStore.scan(makeMockImporter());
    expect(result).toEqual({ imported: [], removed: [] });
  });

  it('imports an epub found on disk but not in DB', () => {
    const filePath = path.join(booksDir, 'new-book.epub');
    fs.writeFileSync(filePath, 'fake-epub-content');
    const result = bookStore.scan(makeMockImporter());
    expect(result.imported).toEqual(['new-book.epub']);
    expect(result.removed).toEqual([]);
    const books = bookStore.listBooks();
    expect(books).toHaveLength(1);
    expect(books[0].filename).toBe('new-book.epub');
    expect(books[0].title).toBe('Mock Title');
  });

  it('does not re-import a book already in the DB', () => {
    const filePath = path.join(booksDir, 'existing.epub');
    fs.writeFileSync(filePath, 'fake-epub-content');
    bookStore.scan(makeMockImporter()); // first scan imports it
    const result = bookStore.scan(makeMockImporter()); // second scan is a no-op
    expect(result.imported).toEqual([]);
    expect(result.removed).toEqual([]);
    expect(bookStore.listBooks()).toHaveLength(1);
  });

  it('removes a stale DB entry whose file no longer exists on disk', () => {
    const fakePath = path.join(booksDir, 'ghost.epub');
    // Add directly to DB without creating the file
    bookStore.addBook('ghostid001', 'ghost.epub', fakePath, 100, new Date(), {
      title: 'Ghost Book', author: '', description: '', series: '',
      seriesIndex: 0, coverData: null, coverMime: null,
    });
    expect(bookStore.listBooks()).toHaveLength(1);
    const result = bookStore.scan(makeMockImporter());
    expect(result.removed).toEqual(['ghost.epub']);
    expect(result.imported).toEqual([]);
    expect(bookStore.listBooks()).toHaveLength(0);
  });

  it('skips a file that fails to parse and continues scanning others', () => {
    fs.writeFileSync(path.join(booksDir, 'bad.epub'), 'bad');
    fs.writeFileSync(path.join(booksDir, 'good.epub'), 'good');
    const errorImporter: ScanImporter = {
      parseEpub: (filePath: string): EpubMeta => {
        if (filePath.includes('bad')) throw new Error('parse failed');
        return { title: 'Good', author: '', description: '', series: '',
          seriesIndex: 0, coverData: null, coverMime: null };
      },
      partialMD5: (filePath: string): string =>
        crypto.createHash('md5').update(filePath).digest('hex'),
    };
    const result = bookStore.scan(errorImporter);
    expect(result.imported).toEqual(['good.epub']);
    expect(result.removed).toEqual([]);
  });

  it('ignores non-epub files in booksDir', () => {
    fs.writeFileSync(path.join(booksDir, 'readme.txt'), 'text');
    fs.writeFileSync(path.join(booksDir, 'book.epub'), 'epub');
    const result = bookStore.scan(makeMockImporter());
    expect(result.imported).toEqual(['book.epub']);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --testPathPattern=BookStore
```

Expected: FAIL — `ScanImporter` is not exported from `../app/services/BookStore`.

- [ ] **Step 3: Add ScanImporter interface and scan() to BookStore.ts**

In `app/services/BookStore.ts`, add this import at the top (after existing imports):

```typescript
import { parseEpub, partialMD5 } from './EpubParser';
```

After the `BookRow` interface and before the `BookStore` class definition, add:

```typescript
export interface ScanImporter {
  parseEpub: (filePath: string) => EpubMeta;
  partialMD5: (filePath: string) => string;
}

const defaultImporter: ScanImporter = { parseEpub, partialMD5 };
```

Inside the `BookStore` class, add the `scan()` method after `getCover()`:

```typescript
scan(importer: ScanImporter = defaultImporter): { imported: string[]; removed: string[] } {
  const imported: string[] = [];
  const removed: string[] = [];

  const dbBooks = this.listBooks();
  const dbFilenames = new Set(dbBooks.map(b => b.filename));

  const diskFilenames: string[] = fs.existsSync(this.booksDir)
    ? fs.readdirSync(this.booksDir).filter(f => path.extname(f).toLowerCase() === '.epub')
    : [];
  const diskFilenameSet = new Set(diskFilenames);

  // Import new files: on disk but not in DB
  for (const filename of diskFilenames) {
    if (dbFilenames.has(filename)) continue;
    const filePath = path.join(this.booksDir, filename);
    try {
      const stat = fs.statSync(filePath);
      const meta = importer.parseEpub(filePath);
      const id = importer.partialMD5(filePath);
      this.addBook(id, filename, filePath, stat.size, stat.mtime, meta);
      imported.push(filename);
    } catch {
      // skip files that fail to parse — caller logs if desired
    }
  }

  // Remove stale entries: in DB but file no longer on disk
  for (const book of dbBooks) {
    if (!diskFilenameSet.has(book.filename)) {
      this.deleteBook(book.id);
      removed.push(book.filename);
    }
  }

  return { imported, removed };
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- --testPathPattern=BookStore
```

Expected: all BookStore tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/services/BookStore.ts tests/BookStore.test.ts
git commit -m "feat: BookStore.scan() — import untracked EPUBs and remove stale DB entries"
```

---

## Task 2: POST /api/books/scan route — implementation + tests

**Files:**
- Modify: `app/routes/ui.ts`
- Modify: `tests/ui.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to the bottom of `tests/ui.test.ts`, after the `DELETE /api/books/:id` describe block. The `makeEpub` helper is already defined in this file — use it to write a real EPUB to disk and verify the scan imports it:

```typescript
describe('POST /api/books/scan', () => {
  it('returns 302 without session', async () => {
    const res = await request(app).post('/api/books/scan');
    expect(res.status).toBe(302);
  });

  it('returns { imported: [], removed: [] } when nothing to scan', async () => {
    const agent = await authenticatedAgent();
    const res = await agent.post('/api/books/scan');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ imported: [], removed: [] });
  });

  it('imports an epub file found on disk but not in DB', async () => {
    // Write a real EPUB to booksDir without going through the upload route
    const epubBuf = makeEpub({ title: 'Found Book', author: 'Found Author' });
    fs.writeFileSync(path.join(booksDir, 'found.epub'), epubBuf);

    const agent = await authenticatedAgent();
    const res = await agent.post('/api/books/scan');
    expect(res.status).toBe(200);
    expect(res.body.imported).toContain('found.epub');
    expect(res.body.removed).toEqual([]);

    // Verify it's now in the library
    const listRes = await agent.get('/api/books');
    expect(listRes.body).toHaveLength(1);
    expect(listRes.body[0].title).toBe('Found Book');
  });

  it('reports removed for a DB entry whose file is gone', async () => {
    // Add a book to the DB pointing at a file that does not exist
    const fakePath = path.join(booksDir, 'deleted.epub');
    bookStore.addBook('stale001', 'deleted.epub', fakePath, 100, new Date(), {
      ...FAKE_META, title: 'Stale Book',
    });

    const agent = await authenticatedAgent();
    const res = await agent.post('/api/books/scan');
    expect(res.status).toBe(200);
    expect(res.body.removed).toContain('deleted.epub');
    expect(res.body.imported).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --testPathPattern=ui
```

Expected: FAIL — `POST /api/books/scan` returns 404.

- [ ] **Step 3: Add the route to ui.ts**

In `app/routes/ui.ts`, add the following route after the `DELETE /api/books/:id` handler and before `return router`:

```typescript
router.post('/api/books/scan', sessionAuth, (_req: Request, res: Response) => {
  const result = bookStore.scan();
  log.info(`Scan: ${result.imported.length} imported, ${result.removed.length} removed`);
  res.json(result);
});
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- --testPathPattern=ui
```

Expected: all ui tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/routes/ui.ts tests/ui.test.ts
git commit -m "feat: POST /api/books/scan — library scan endpoint"
```

---

## Task 3: Startup scan in index.ts

**Files:**
- Modify: `app/index.ts`

No new tests — startup behaviour is integration-level; the existing build smoke test is sufficient.

- [ ] **Step 1: Add startup scan to index.ts**

In `app/index.ts`, locate this block:

```typescript
const app = createApp(config, userStore, bookStore);

const shutdown = (): void => {
```

Replace the `const app = ...` line with:

```typescript
const app = createApp(config, userStore, bookStore);

// Startup scan: import untracked EPUBs, clean up stale DB entries
try {
  const scanResult = bookStore.scan();
  log.info(`Startup scan: ${scanResult.imported.length} imported, ${scanResult.removed.length} removed`);
} catch (err: any) {
  log.warn(`Startup scan failed: ${String(err.message)}`);
}

const shutdown = (): void => {
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/index.ts
git commit -m "feat: run library scan on server startup"
```

---

## Task 4: UI — Scan button + status + disable-during-scan

**Files:**
- Modify: `app/public/index.html`

- [ ] **Step 1: Add the scan button and status element above the drop zone**

In `app/public/index.html`, locate the opening of `#library-section`:

```html
    <div id="library-section">
      <div id="drop-zone">
```

Replace with:

```html
    <div id="library-section">
      <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:1rem">
        <button id="scan-btn" type="button" style="background:#1e40af;color:#fff;border:none;border-radius:4px;padding:.5rem 1rem;font-size:.875rem;cursor:pointer;font-family:inherit">Scan Library</button>
        <span id="scan-status" style="font-size:.875rem"></span>
      </div>
      <div id="drop-zone">
```

- [ ] **Step 2: Add scan JS — insert before the closing `</script>` tag**

In `app/public/index.html`, locate the line `loadBooks();` at the bottom of the `<script>` block. After `loadBooks();` and before `</script>`, add:

```javascript
    // ── Scan ─────────────────────────────────────────────
    const scanBtn = document.getElementById('scan-btn');
    const scanStatus = document.getElementById('scan-status');

    function setUploadEnabled(enabled) {
      dropZone.style.opacity = enabled ? '' : '0.5';
      dropZone.style.pointerEvents = enabled ? '' : 'none';
      fileInput.disabled = !enabled;
    }

    scanBtn.addEventListener('click', async () => {
      scanBtn.disabled = true;
      scanBtn.textContent = 'Scanning…';
      scanStatus.textContent = '';
      scanStatus.className = '';
      setUploadEnabled(false);
      try {
        const res = await fetch('/api/books/scan', { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
          const total = data.imported.length + data.removed.length;
          scanStatus.textContent = total === 0
            ? '✓ Library already up to date'
            : `✓ Scan complete: ${data.imported.length} imported, ${data.removed.length} removed`;
          scanStatus.className = 'status-ok';
          await loadBooks();
        } else {
          scanStatus.textContent = '✗ Scan failed';
          scanStatus.className = 'status-err';
        }
      } catch {
        scanStatus.textContent = '✗ Scan failed';
        scanStatus.className = 'status-err';
      } finally {
        scanBtn.disabled = false;
        scanBtn.textContent = 'Scan Library';
        setUploadEnabled(true);
      }
    });
```

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 4: Run all tests**

```bash
npm test
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/public/index.html
git commit -m "feat: Scan Library button with disable-during-scan and status feedback"
```

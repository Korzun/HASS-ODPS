# EPUB Metadata Editing for Admins — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable admins to edit all EPUB metadata fields (title, author, description, publisher, series, series index, subjects, identifiers, cover) through a dedicated `/books/:id/edit` page; changes are written into the EPUB file's OPF XML and the database is updated via re-import.

**Architecture:** A new `epub-writer.ts` service uses adm-zip + `XMLBuilder` from fast-xml-parser to mutate OPF XML in-place. A `PATCH /api/books/:id/metadata` route (admin-only, multipart) orchestrates write → re-import. The frontend gains a History API router so all views have real URLs, and a new edit page section.

**Tech Stack:** TypeScript, Express 4, adm-zip 0.5.x, fast-xml-parser 5.7.x (XMLParser + XMLBuilder), better-sqlite3, multer (memoryStorage for cover upload), vanilla JS

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `app/services/epub-writer.ts` | `writeMetadata(filePath, changes)` — all EPUB mutation |
| Create | `app/services/epub-writer.test.ts` | Round-trip tests using real EPUB fixtures |
| Modify | `app/services/book-store.ts` | Add `reimportBook(id): Book \| null` |
| Modify | `app/services/book-store.test.ts` | Add `reimportBook` test cases |
| Modify | `app/routes/ui.ts` | Add PATCH endpoint, SPA route stubs, `coverUpload` multer |
| Modify | `app/routes/ui.test.ts` | Add PATCH and SPA route test cases |
| Modify | `app/public/index.html` | History API router, navigation updates, edit section |

---

## Task 1: epub-writer.ts — full service with tests

**Files:**
- Create: `app/services/epub-writer.ts`
- Create: `app/services/epub-writer.test.ts`

- [ ] **Step 1: Create the test file with all cases**

Create `app/services/epub-writer.test.ts`:

```typescript
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import AdmZip from 'adm-zip';
import { writeMetadata, EpubChanges } from './epub-writer';
import { parseEpub } from './epub-parser';

function makeEpub(
  opts: {
    title?: string;
    author?: string;
    fileAs?: string;
    description?: string;
    publisher?: string;
    series?: string;
    seriesIndex?: number;
    identifiers?: { scheme?: string; value: string }[];
    subjects?: string[];
    coverData?: Buffer;
    coverMime?: string;
  } = {}
): Buffer {
  const zip = new AdmZip();
  zip.addFile(
    'META-INF/container.xml',
    Buffer.from(`<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`)
  );

  const fileAsAttr = opts.fileAs ? ` file-as="${opts.fileAs}"` : '';
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

  zip.addFile(
    'OEBPS/content.opf',
    Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0" xmlns:opf="http://www.idpf.org/2007/opf">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    ${opts.title !== undefined ? `<dc:title>${opts.title}</dc:title>` : ''}
    ${opts.author !== undefined ? `<dc:creator${fileAsAttr}>${opts.author}</dc:creator>` : ''}
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
</package>`)
  );
  if (opts.coverData) zip.addFile('OEBPS/cover.jpg', opts.coverData);
  return zip.toBuffer();
}

let tmpDir: string;
beforeEach(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'epub-writer-')); });
afterEach(() => { fs.rmSync(tmpDir, { recursive: true }); });

function toFile(buf: Buffer, name = 'test.epub'): string {
  const p = path.join(tmpDir, name);
  fs.writeFileSync(p, buf);
  return p;
}

describe('writeMetadata', () => {
  it('updates title', () => {
    const f = toFile(makeEpub({ title: 'Old Title' }));
    writeMetadata(f, { title: 'New Title' });
    expect(parseEpub(f).title).toBe('New Title');
  });

  it('updates author', () => {
    const f = toFile(makeEpub({ author: 'Old Author' }));
    writeMetadata(f, { author: 'New Author' });
    expect(parseEpub(f).author).toBe('New Author');
  });

  it('updates fileAs', () => {
    const f = toFile(makeEpub({ author: 'John Doe', fileAs: 'Doe, John' }));
    writeMetadata(f, { fileAs: 'Doe, J.' });
    expect(parseEpub(f).fileAs).toBe('Doe, J.');
  });

  it('updates description', () => {
    const f = toFile(makeEpub({ description: 'Old' }));
    writeMetadata(f, { description: 'New desc' });
    expect(parseEpub(f).description).toBe('New desc');
  });

  it('updates publisher', () => {
    const f = toFile(makeEpub({ publisher: 'Old Pub' }));
    writeMetadata(f, { publisher: 'New Pub' });
    expect(parseEpub(f).publisher).toBe('New Pub');
  });

  it('updates series name and index', () => {
    const f = toFile(makeEpub({ series: 'Old Series', seriesIndex: 1 }));
    writeMetadata(f, { series: 'New Series', seriesIndex: 3 });
    const meta = parseEpub(f);
    expect(meta.series).toBe('New Series');
    expect(meta.seriesIndex).toBe(3);
  });

  it('clears series when empty string is given', () => {
    const f = toFile(makeEpub({ series: 'Some Series', seriesIndex: 1 }));
    writeMetadata(f, { series: '' });
    expect(parseEpub(f).series).toBe('');
  });

  it('updates subjects', () => {
    const f = toFile(makeEpub({ subjects: ['Fiction'] }));
    writeMetadata(f, { subjects: ['Science', 'History'] });
    expect(parseEpub(f).subjects).toEqual(['Science', 'History']);
  });

  it('clears subjects when empty array given', () => {
    const f = toFile(makeEpub({ subjects: ['Fiction'] }));
    writeMetadata(f, { subjects: [] });
    expect(parseEpub(f).subjects).toEqual([]);
  });

  it('updates identifiers', () => {
    const f = toFile(makeEpub({ identifiers: [{ scheme: 'ISBN', value: '978-old' }] }));
    writeMetadata(f, { identifiers: [{ scheme: 'ISBN', value: '978-new' }] });
    expect(parseEpub(f).identifiers).toEqual([{ scheme: 'ISBN', value: '978-new' }]);
  });

  it('adds cover to an epub with no cover', () => {
    const f = toFile(makeEpub({ title: 'No Cover' }));
    const coverBytes = Buffer.from('fake-png');
    writeMetadata(f, { coverData: coverBytes, coverMime: 'image/png' });
    const meta = parseEpub(f);
    expect(meta.coverData).toEqual(coverBytes);
    expect(meta.coverMime).toBe('image/png');
  });

  it('replaces an existing cover', () => {
    const f = toFile(makeEpub({ coverData: Buffer.from('old-cover'), coverMime: 'image/jpeg' }));
    const newCover = Buffer.from('new-cover');
    writeMetadata(f, { coverData: newCover, coverMime: 'image/jpeg' });
    expect(parseEpub(f).coverData).toEqual(newCover);
  });

  it('does not modify unspecified fields', () => {
    const f = toFile(makeEpub({ title: 'Keep', author: 'Keep Author', publisher: 'Keep Pub' }));
    writeMetadata(f, { description: 'Only this changed' });
    const meta = parseEpub(f);
    expect(meta.title).toBe('Keep');
    expect(meta.author).toBe('Keep Author');
    expect(meta.publisher).toBe('Keep Pub');
  });

  it('throws for a non-existent file', () => {
    expect(() => writeMetadata('/nonexistent/path.epub', { title: 'x' })).toThrow();
  });

  it('throws for a non-EPUB file (no container.xml)', () => {
    const f = toFile(Buffer.from('not a zip'), 'bad.epub');
    expect(() => writeMetadata(f, { title: 'x' })).toThrow();
  });
});
```

- [ ] **Step 2: Run tests to see them fail**

```bash
npx jest app/services/epub-writer.test.ts --no-coverage
```

Expected: `Cannot find module './epub-writer'`

- [ ] **Step 3: Create app/services/epub-writer.ts**

```typescript
import AdmZip from 'adm-zip';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import * as path from 'path';

export interface EpubChanges {
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

export function writeMetadata(filePath: string, changes: EpubChanges): void {
  const zip = new AdmZip(filePath);

  // Step 1: resolve OPF path from container.xml
  const containerEntry = zip.getEntry('META-INF/container.xml');
  if (!containerEntry) throw new Error('Missing META-INF/container.xml');

  const containerParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseTagValue: false,
  });
  const containerXml = containerParser.parse(containerEntry.getData().toString('utf8'));
  const rootfiles = containerXml?.container?.rootfiles?.rootfile;
  const rootfileArr = Array.isArray(rootfiles) ? rootfiles : [rootfiles];
  const opfRelPath: string = rootfileArr[0]?.['@_full-path'];
  if (!opfRelPath) throw new Error('Cannot find OPF rootfile path in container.xml');

  // Step 2: parse OPF
  const opfEntry = zip.getEntry(opfRelPath);
  if (!opfEntry) throw new Error(`Cannot find OPF file: ${opfRelPath}`);

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseTagValue: false,
    isArray: (name) =>
      ['item', 'meta', 'dc:title', 'dc:creator', 'dc:identifier', 'dc:subject'].includes(name),
  });
  const opf = parser.parse(opfEntry.getData().toString('utf8')) as Record<string, unknown>;
  const pkg = (opf?.package ?? opf) as Record<string, unknown>;
  if (!pkg.metadata) pkg.metadata = {};
  const metadata = pkg.metadata as Record<string, unknown>;
  if (!pkg.manifest) pkg.manifest = { item: [] };
  const mfst = pkg.manifest as Record<string, unknown>;
  if (!mfst.item) mfst.item = [];
  const manifestItems = mfst.item as Record<string, string>[];
  const opfDir = path.dirname(opfRelPath);

  // Step 3: apply text field changes
  if (changes.title !== undefined) {
    metadata['dc:title'] = [changes.title];
  }

  if (changes.author !== undefined || changes.fileAs !== undefined) {
    const existing = ((metadata['dc:creator'] as unknown[]) ?? [])[0];
    const currentAuthor =
      changes.author ??
      (typeof existing === 'string'
        ? existing
        : ((existing as Record<string, string>)?.['#text'] ?? ''));
    const currentFileAs =
      changes.fileAs ??
      (typeof existing === 'object' && existing !== null
        ? ((existing as Record<string, string>)['@_file-as'] ??
          (existing as Record<string, string>)['@_opf:file-as'] ??
          '')
        : '');
    metadata['dc:creator'] = currentFileAs
      ? [{ '#text': currentAuthor, '@_file-as': currentFileAs }]
      : [currentAuthor];
  }

  if (changes.description !== undefined) {
    metadata['dc:description'] = changes.description;
  }

  if (changes.publisher !== undefined) {
    metadata['dc:publisher'] = changes.publisher;
  }

  if (changes.identifiers !== undefined) {
    if (changes.identifiers.some((id) => id.scheme) && !(pkg as Record<string, string>)['@_xmlns:opf']) {
      (pkg as Record<string, string>)['@_xmlns:opf'] = 'http://www.idpf.org/2007/opf';
    }
    metadata['dc:identifier'] = changes.identifiers.map((id) =>
      id.scheme ? { '#text': id.value, '@_opf:scheme': id.scheme } : id.value
    );
  }

  if (changes.subjects !== undefined) {
    metadata['dc:subject'] = changes.subjects;
  }

  // Step 4: series changes
  if (changes.series !== undefined || changes.seriesIndex !== undefined) {
    const existingMetas = (metadata['meta'] as Record<string, string>[]) ?? [];
    const currentSeries =
      changes.series ??
      existingMetas.find((m) => m['@_name'] === 'calibre:series')?.['@_content'] ??
      '';
    const currentIndex =
      changes.seriesIndex ??
      parseFloat(
        existingMetas.find((m) => m['@_name'] === 'calibre:series_index')?.['@_content'] ?? '0'
      ) ??
      0;
    const filtered = existingMetas.filter(
      (m) => m['@_name'] !== 'calibre:series' && m['@_name'] !== 'calibre:series_index'
    );
    if (currentSeries) {
      filtered.push({ '@_name': 'calibre:series', '@_content': currentSeries });
      filtered.push({ '@_name': 'calibre:series_index', '@_content': String(currentIndex) });
    }
    metadata['meta'] = filtered;
  }

  // Step 5: cover replacement
  if (changes.coverData !== undefined && changes.coverMime !== undefined) {
    const ext = changes.coverMime.includes('/') ? changes.coverMime.split('/')[1] : 'jpg';
    const coverFilename = `cover-edit.${ext}`;
    const coverEntryPath = opfDir === '.' ? coverFilename : `${opfDir}/${coverFilename}`;

    if (zip.getEntry(coverEntryPath)) {
      zip.updateFile(coverEntryPath, changes.coverData);
    } else {
      zip.addFile(coverEntryPath, changes.coverData);
    }

    const existingItem = manifestItems.find((i) => i['@_id'] === 'cover-edit');
    if (existingItem) {
      existingItem['@_href'] = coverFilename;
      existingItem['@_media-type'] = changes.coverMime;
    } else {
      manifestItems.push({
        '@_id': 'cover-edit',
        '@_href': coverFilename,
        '@_media-type': changes.coverMime,
      });
    }

    const metas = (metadata['meta'] as Record<string, string>[]) ?? [];
    const coverMetaIdx = metas.findIndex((m) => m['@_name'] === 'cover');
    if (coverMetaIdx >= 0) {
      metas[coverMetaIdx] = { '@_name': 'cover', '@_content': 'cover-edit' };
    } else {
      metas.push({ '@_name': 'cover', '@_content': 'cover-edit' });
    }
    metadata['meta'] = metas;
  }

  // Step 6: serialize OPF and write ZIP
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    suppressEmptyNode: false,
    format: false,
  });
  const newOpfXml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' + (builder.build(opf) as string);
  zip.updateFile(opfRelPath, Buffer.from(newOpfXml, 'utf8'));
  zip.writeZip(filePath);
}
```

- [ ] **Step 4: Run tests to see them pass**

```bash
npx jest app/services/epub-writer.test.ts --no-coverage
```

Expected: all 13 tests pass.

- [ ] **Step 5: Run full test suite and lint**

```bash
npm test && npm run lint
```

Expected: all tests pass, no lint errors.

- [ ] **Step 6: Commit**

```bash
git add app/services/epub-writer.ts app/services/epub-writer.test.ts
git commit -m "feat: add epub-writer service for in-place OPF metadata editing"
```

---

## Task 2: BookStore.reimportBook()

**Files:**
- Modify: `app/services/book-store.ts` (add public method after `deleteBook`)
- Modify: `app/services/book-store.test.ts` (add describe block at end)

- [ ] **Step 1: Write the failing test**

Add this describe block at the end of `app/services/book-store.test.ts`:

```typescript
import AdmZip from 'adm-zip'; // add to existing imports at top

// Add this helper at the top of the test file, after FAKE_META:
function makeMinimalEpub(title: string): Buffer {
  const zip = new AdmZip();
  zip.addFile(
    'META-INF/container.xml',
    Buffer.from(`<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`)
  );
  zip.addFile(
    'OEBPS/content.opf',
    Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${title}</dc:title></metadata>
  <manifest><item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/></manifest>
  <spine toc="ncx"/>
</package>`)
  );
  return zip.toBuffer();
}

// NEW describe block:
describe('reimportBook', () => {
  it('returns null for unknown book id', () => {
    expect(bookStore.reimportBook('doesnotexist')).toBeNull();
  });

  it('re-reads metadata from disk and updates the DB row', () => {
    const epubBuf = makeMinimalEpub('Original');
    const epubPath = path.join(booksDir, 'test.epub');
    fs.writeFileSync(epubPath, epubBuf);
    const id = partialMD5(epubPath);
    const stat = fs.statSync(epubPath);
    bookStore.addBook(id, 'test.epub', epubPath, stat.size, stat.mtime, {
      ...FAKE_META,
      title: 'Original',
    });

    // Manually overwrite the EPUB on disk with new title
    const updatedBuf = makeMinimalEpub('Updated');
    fs.writeFileSync(epubPath, updatedBuf);

    const updated = bookStore.reimportBook(id);
    // ID may have changed due to ZIP rewrite — updated reflects new state
    expect(updated).not.toBeNull();
    expect(updated!.title).toBe('Updated');
  });

  it('cascades id change to progress table when partial MD5 shifts', () => {
    const epubBuf = makeMinimalEpub('Before');
    const epubPath = path.join(booksDir, 'cascade.epub');
    fs.writeFileSync(epubPath, epubBuf);
    const oldId = partialMD5(epubPath);
    const stat = fs.statSync(epubPath);
    bookStore.addBook(oldId, 'cascade.epub', epubPath, stat.size, stat.mtime, FAKE_META);

    // Insert a progress record for the old ID directly
    const db2 = (bookStore as unknown as { db: import('better-sqlite3').Database }).db;
    db2.exec(`CREATE TABLE IF NOT EXISTS progress (
      username TEXT NOT NULL, document TEXT NOT NULL, progress TEXT NOT NULL,
      percentage REAL NOT NULL, device TEXT NOT NULL, device_id TEXT NOT NULL,
      timestamp INTEGER NOT NULL, PRIMARY KEY (username, document)
    )`);
    db2.prepare('INSERT INTO progress VALUES (?,?,?,?,?,?,?)').run(
      'alice', oldId, '/p[1]', 0.5, 'Kobo', 'd1', 1000
    );

    // Overwrite the file to force a different partial MD5
    const newBuf = makeMinimalEpub('After');
    fs.writeFileSync(epubPath, newBuf);

    const updated = bookStore.reimportBook(oldId);
    expect(updated).not.toBeNull();
    const newId = updated!.id;

    if (newId !== oldId) {
      // ID changed: old progress row should be gone, new one should exist
      const oldRow = db2.prepare('SELECT * FROM progress WHERE document=?').get(oldId);
      expect(oldRow).toBeUndefined();
      const newRow = db2.prepare('SELECT * FROM progress WHERE document=?').get(newId);
      expect(newRow).toBeDefined();
    }
    // If ID didn't change (unlikely but possible): still verify DB is consistent
    expect(bookStore.getBookById(newId)).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to see them fail**

```bash
npx jest app/services/book-store.test.ts --no-coverage
```

Expected: `TypeError: bookStore.reimportBook is not a function`

- [ ] **Step 3: Add reimportBook to BookStore**

In `app/services/book-store.ts`, add this public method after `deleteBook` (around line 220):

```typescript
reimportBook(
  id: string,
  importer: ScanImporter = defaultImporter
): Book | null {
  const row = this.db
    .prepare('SELECT path, filename, added_at FROM books WHERE id = ?')
    .get(id) as { path: string; filename: string; added_at: number } | undefined;
  if (!row) return null;

  let stat: fs.Stats;
  try {
    stat = fs.statSync(row.path);
  } catch {
    return null;
  }
  const meta = importer.parseEpub(row.path);
  const newId = importer.partialMD5(row.path);

  this.db.transaction(() => {
    if (newId !== id) {
      this.db
        .prepare(
          `UPDATE books SET id=?, title=?, file_as=?, author=?, description=?, publisher=?,
           series=?, series_index=?, identifiers=?, subjects=?, cover_data=?, cover_mime=?,
           size=?, mtime=? WHERE id=?`
        )
        .run(
          newId,
          meta.title.trim() || path.basename(row.filename, path.extname(row.filename)),
          (meta.fileAs || '').trim(),
          meta.author,
          meta.description,
          meta.publisher,
          meta.series,
          meta.seriesIndex,
          JSON.stringify(meta.identifiers),
          JSON.stringify(meta.subjects),
          meta.coverData,
          meta.coverMime,
          stat.size,
          stat.mtime.getTime(),
          id
        );
      const progressExists = this.db
        .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='progress'")
        .get();
      if (progressExists) {
        this.db.prepare('UPDATE progress SET document=? WHERE document=?').run(newId, id);
      }
    } else {
      this.db
        .prepare(
          `UPDATE books SET title=?, file_as=?, author=?, description=?, publisher=?,
           series=?, series_index=?, identifiers=?, subjects=?, cover_data=?, cover_mime=?,
           size=?, mtime=? WHERE id=?`
        )
        .run(
          meta.title.trim() || path.basename(row.filename, path.extname(row.filename)),
          (meta.fileAs || '').trim(),
          meta.author,
          meta.description,
          meta.publisher,
          meta.series,
          meta.seriesIndex,
          JSON.stringify(meta.identifiers),
          JSON.stringify(meta.subjects),
          meta.coverData,
          meta.coverMime,
          stat.size,
          stat.mtime.getTime(),
          id
        );
    }
  })();

  return this.getBookById(newId);
}
```

- [ ] **Step 4: Run tests to see them pass**

```bash
npx jest app/services/book-store.test.ts --no-coverage
```

Expected: all tests pass.

- [ ] **Step 5: Run full test suite and lint**

```bash
npm test && npm run lint
```

Expected: all tests pass, no lint errors.

- [ ] **Step 6: Commit**

```bash
git add app/services/book-store.ts app/services/book-store.test.ts
git commit -m "feat: add BookStore.reimportBook for targeted post-edit DB refresh"
```

---

## Task 3: PATCH /api/books/:id/metadata route

**Files:**
- Modify: `app/routes/ui.ts` (add imports, coverUpload multer, PATCH handler)
- Modify: `app/routes/ui.test.ts` (add describe block)

- [ ] **Step 1: Write the failing tests**

Add this describe block at the end of `app/routes/ui.test.ts`:

```typescript
describe('PATCH /api/books/:id/metadata', () => {
  let bookId: string;

  beforeEach(() => {
    // Write a real EPUB to booksDir so writeMetadata can read it
    const zip = new AdmZip();
    zip.addFile(
      'META-INF/container.xml',
      Buffer.from(`<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`)
    );
    zip.addFile(
      'OEBPS/content.opf',
      Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Original Title</dc:title></metadata>
  <manifest><item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/></manifest>
  <spine toc="ncx"/>
</package>`)
    );
    const epubPath = path.join(booksDir, 'edit-test.epub');
    fs.writeFileSync(epubPath, zip.toBuffer());
    bookStore.scan(); // import the file into the DB
    bookId = bookStore.listBooks()[0].id;
  });

  it('returns 403 for regular user', async () => {
    const agent = await userAgent();
    const res = await agent.patch(`/api/books/${bookId}/metadata`).field('title', 'New');
    expect(res.status).toBe(403);
  });

  it('returns 404 for unknown book id', async () => {
    const agent = await adminAgent();
    const res = await agent.patch('/api/books/doesnotexist/metadata').field('title', 'New');
    expect(res.status).toBe(404);
  });

  it('returns 302 without session', async () => {
    const res = await request(app)
      .patch(`/api/books/${bookId}/metadata`)
      .field('title', 'New');
    expect(res.status).toBe(302);
  });

  it('updates title and returns the updated book', async () => {
    const agent = await adminAgent();
    const res = await agent
      .patch(`/api/books/${bookId}/metadata`)
      .field('title', 'Updated Title');
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated Title');
    expect(res.body.path).toBeUndefined(); // path must not be exposed
    // Verify the returned book ID is now in the DB (ID may have shifted)
    const newId: string = res.body.id;
    expect(bookStore.getBookById(newId)).not.toBeNull();
    expect(bookStore.getBookById(newId)!.title).toBe('Updated Title');
  });

  it('updates cover when image file is attached', async () => {
    const agent = await adminAgent();
    const coverBytes = Buffer.from('fake-png-cover');
    const res = await agent
      .patch(`/api/books/${bookId}/metadata`)
      .attach('cover', coverBytes, { filename: 'cover.png', contentType: 'image/png' });
    expect(res.status).toBe(200);
    const newId: string = res.body.id;
    expect(res.body.hasCover).toBe(true);
    // Verify cover is stored in DB
    const cover = bookStore.getCover(newId);
    expect(cover).not.toBeNull();
    expect(cover!.data).toEqual(coverBytes);
  });
});
```

- [ ] **Step 2: Run tests to see them fail**

```bash
npx jest app/routes/ui.test.ts --no-coverage
```

Expected: `PATCH /api/books/:id/metadata` describe block fails — routes return 404 or 405.

- [ ] **Step 3: Add coverUpload multer and PATCH handler to ui.ts**

At the top of `app/routes/ui.ts`, add to existing imports:

```typescript
import { writeMetadata, EpubChanges } from '../services/epub-writer';
```

Inside `createUiRouter`, after the existing `upload` multer constant (around line 67), add:

```typescript
const coverUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    cb(null, file.mimetype.startsWith('image/'));
  },
});
```

Add the PATCH route inside `createUiRouter` after `router.post('/api/books/scan', ...)` and before `return router`:

```typescript
router.patch(
  '/api/books/:id/metadata',
  sessionAuth,
  adminAuth,
  coverUpload.single('cover'),
  async (req: Request, res: Response) => {
    const book = bookStore.getBookById(req.params.id);
    if (!book) {
      res.status(404).json({ error: 'Book not found' });
      return;
    }

    const body = req.body as Record<string, string>;
    const changes: EpubChanges = {};
    if (body.title !== undefined) changes.title = body.title;
    if (body.author !== undefined) changes.author = body.author;
    if (body.fileAs !== undefined) changes.fileAs = body.fileAs;
    if (body.description !== undefined) changes.description = body.description;
    if (body.publisher !== undefined) changes.publisher = body.publisher;
    if (body.series !== undefined) changes.series = body.series;
    if (body.seriesIndex !== undefined) changes.seriesIndex = parseFloat(body.seriesIndex) || 0;
    if (body.identifiers !== undefined) {
      try {
        changes.identifiers = JSON.parse(body.identifiers) as { scheme: string; value: string }[];
      } catch {
        res.status(400).json({ error: 'Invalid identifiers JSON' });
        return;
      }
    }
    if (body.subjects !== undefined) {
      try {
        changes.subjects = JSON.parse(body.subjects) as string[];
      } catch {
        res.status(400).json({ error: 'Invalid subjects JSON' });
        return;
      }
    }
    if (req.file) {
      changes.coverData = req.file.buffer;
      changes.coverMime = req.file.mimetype;
    }

    try {
      writeMetadata(book.path, changes);
    } catch (err: unknown) {
      res.status(500).json({
        error: `Failed to update EPUB: ${err instanceof Error ? err.message : String(err)}`,
      });
      return;
    }

    const updated = bookStore.reimportBook(req.params.id);
    if (!updated) {
      res.status(500).json({ error: 'Failed to re-import book after update' });
      return;
    }

    log.info(`Book metadata updated: "${updated.filename}"`);
    const { path: _path, ...rest } = updated;
    res.json(rest);
  }
);
```

- [ ] **Step 4: Run tests to see them pass**

```bash
npx jest app/routes/ui.test.ts --no-coverage
```

Expected: all tests in the new describe block pass.

- [ ] **Step 5: Run full test suite and lint**

```bash
npm test && npm run lint
```

Expected: all tests pass, no lint errors.

- [ ] **Step 6: Commit**

```bash
git add app/routes/ui.ts app/routes/ui.test.ts
git commit -m "feat: add PATCH /api/books/:id/metadata endpoint for admin metadata editing"
```

---

## Task 4: Express SPA route stubs

**Files:**
- Modify: `app/routes/ui.ts` (add 3 SPA GET routes + update existing `/` handler)
- Modify: `app/routes/ui.test.ts` (add SPA route tests)

- [ ] **Step 1: Write the failing tests**

Add at the end of `app/routes/ui.test.ts`:

```typescript
describe('SPA routes serve index.html', () => {
  it('GET /books/:id returns 200 with HTML', async () => {
    const agent = await adminAgent();
    const res = await agent.get('/books/someid');
    expect(res.status).toBe(200);
    expect(res.text).toContain('<!DOCTYPE html>');
  });

  it('GET /books/:id/edit returns 200 with HTML', async () => {
    const agent = await adminAgent();
    const res = await agent.get('/books/someid/edit');
    expect(res.status).toBe(200);
    expect(res.text).toContain('<!DOCTYPE html>');
  });

  it('GET /series/:name returns 200 with HTML', async () => {
    const agent = await adminAgent();
    const res = await agent.get('/series/My%20Series');
    expect(res.status).toBe(200);
    expect(res.text).toContain('<!DOCTYPE html>');
  });

  it('SPA routes redirect to /login without session', async () => {
    const res = await request(app).get('/books/someid');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });
});
```

- [ ] **Step 2: Run tests to see them fail**

```bash
npx jest app/routes/ui.test.ts --no-coverage
```

Expected: SPA routes return 404.

- [ ] **Step 3: Add SPA routes to ui.ts**

In `app/routes/ui.ts`, replace the existing `router.get('/', ...)` handler:

```typescript
// Old (single line):
router.get('/', sessionAuth, (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});
```

With this block that covers all SPA paths:

```typescript
const serveSpa = (_req: Request, res: Response): void => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
};

router.get('/', sessionAuth, serveSpa);
router.get('/books/:id', sessionAuth, serveSpa);
router.get('/books/:id/edit', sessionAuth, serveSpa);
router.get('/series/:name', sessionAuth, serveSpa);
```

- [ ] **Step 4: Run tests to see them pass**

```bash
npx jest app/routes/ui.test.ts --no-coverage
```

Expected: all SPA route tests pass.

- [ ] **Step 5: Run full test suite and lint**

```bash
npm test && npm run lint
```

Expected: all tests pass, no lint errors.

- [ ] **Step 6: Commit**

```bash
git add app/routes/ui.ts app/routes/ui.test.ts
git commit -m "feat: add SPA route stubs for /books/:id, /books/:id/edit, /series/:name"
```

---

## Task 5: Frontend History API router

**Files:**
- Modify: `app/public/index.html` (replace internal JS navigation with pushState + popstate handling)

Note: no server-side tests for this task — it's purely client-side. Manual verification by loading the app is the test.

- [ ] **Step 1: Add edit section placeholder to HTML body**

In `app/public/index.html`, find the existing `<div id="book-section" ...>` element (near line 146) and add an edit section immediately after it:

```html
    <div id="book-section" style="display:none"></div>
    <div id="edit-section" style="display:none"></div>
```

- [ ] **Step 2: Replace internal navigation with router.navigate calls**

In the `<script>` section, replace the block starting at `// ── Tabs ──` through the `let bookDetailOrigin = null;` line with:

```javascript
    // ── State ─────────────────────────────────────────────
    const librarySection = document.getElementById('library-section');
    const usersSection = document.getElementById('users-section');
    const seriesSection = document.getElementById('series-section');
    const bookSection = document.getElementById('book-section');
    const editSection = document.getElementById('edit-section');
    let usersLoaded = false;
```

- [ ] **Step 3: Add the router object at the top of the script section (before the Tabs comment)**

Insert this block before `// ── Tabs ──`:

```javascript
    // ── Router ───────────────────────────────────────────
    const router = {
      navigate(pathname, state) {
        history.pushState(state ?? null, '', pathname);
        this._render(pathname, state ?? null);
      },
      init() {
        window.addEventListener('popstate', (e) => {
          this._render(location.pathname, e.state);
        });
        this._render(location.pathname, history.state);
      },
      _render(pathname, state) {
        let m;
        if (pathname === '/' || pathname === '') {
          _showLibraryView();
        } else if ((m = pathname.match(/^\/series\/(.+)$/))) {
          const name = decodeURIComponent(m[1]);
          const { series } = groupBooks(cachedBooks);
          const entry = series.find(([n]) => n === name);
          if (entry) _showSeriesPage(name, entry[1]);
          else loadBooks().then(() => {
            const { series: s2 } = groupBooks(cachedBooks);
            const e2 = s2.find(([n]) => n === name);
            if (e2) _showSeriesPage(name, e2[1]); else _showLibraryView();
          });
        } else if ((m = pathname.match(/^\/books\/([^/]+)\/edit$/))) {
          _showEditPage(m[1]).catch(() => _showLibraryView());
        } else if ((m = pathname.match(/^\/books\/([^/]+)$/))) {
          const origin = state?.origin ?? { type: 'library' };
          _showBookDetailPage(m[1], origin).catch(() => _showLibraryView());
        } else {
          _showLibraryView();
        }
      }
    };
```

- [ ] **Step 4: Update tab click handlers to use router.navigate**

Replace the `document.querySelectorAll('.tab').forEach(...)` block with:

```javascript
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const name = tab.dataset.tab;
        if (name === 'library') {
          router.navigate('/');
        } else if (name === 'users') {
          _hideAllSections();
          usersSection.style.display = '';
          if (!usersLoaded) loadUsers();
        }
      });
    });

    function _hideAllSections() {
      librarySection.style.display = 'none';
      usersSection.style.display = 'none';
      seriesSection.style.display = 'none';
      bookSection.style.display = 'none';
      editSection.style.display = 'none';
    }
```

- [ ] **Step 5: Rename internal navigation functions with underscore prefix and update pushState calls**

Rename `showLibraryView` → `_showLibraryView`, `showSeriesPage` → `_showSeriesPage`, `showBookDetailPage` → `_showBookDetailPage`. Add `router.navigate` calls inside each so that navigating programmatically also updates the URL.

Replace `function showLibraryView()` with:

```javascript
    function _showLibraryView() {
      _hideAllSections();
      librarySection.style.display = '';
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelector('.tab[data-tab="library"]').classList.add('active');
    }

    function showLibraryView() {
      router.navigate('/');
    }
```

Replace `function showSeriesPage(seriesName, books)` — rename it to `_showSeriesPage` (the internal render), and add a public wrapper:

```javascript
    function showSeriesPage(seriesName, books) {
      router.navigate('/series/' + encodeURIComponent(seriesName), null);
    }

    function _showSeriesPage(seriesName, books) {
      // ... (existing showSeriesPage body, unchanged, but using _hideAllSections())
      _hideAllSections();
      // ... rest of existing body unchanged ...
      seriesSection.style.display = '';
    }
```

Inside `_showSeriesPage`, the back button handler changes from:
```javascript
seriesSection.querySelector('.book-back-btn').addEventListener('click', showLibraryView);
```
to:
```javascript
seriesSection.querySelector('.book-back-btn').addEventListener('click', () => history.back());
```

Replace `async function showBookDetailPage(id, origin)` — rename to `_showBookDetailPage`, add wrapper:

```javascript
    function showBookDetailPage(id, origin) {
      router.navigate('/books/' + encodeURIComponent(id), { origin });
    }

    async function _showBookDetailPage(id, origin) {
      _hideAllSections();
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
        bookSection.querySelector('.book-back-btn').addEventListener('click', () => history.back());
        if (currentUser.isAdmin) {
          const editBtn = bookSection.querySelector('.edit-metadata-btn');
          if (editBtn) editBtn.addEventListener('click', () => router.navigate('/books/' + encodeURIComponent(id) + '/edit'));
        }
      } catch {
        bookSection.innerHTML = '<p style="color:#dc2626;padding:2rem;text-align:center">Failed to load book details.</p>';
      }
    }
```

- [ ] **Step 6: Add "Edit Metadata" button to renderBookDetail**

In `renderBookDetail`, add an admin-only edit button inside the hero section. Find the line that closes the hero div (after `'</div>'` for `book-detail-stats`) and add:

```javascript
      // After the stats div, inside book-detail-meta:
      + (currentUser && currentUser.isAdmin
          ? '<button class="edit-metadata-btn admin-only" type="button" style="margin-top:.75rem;background:#1e40af;color:#fff;border:none;border-radius:4px;padding:.4rem .9rem;font-size:.8rem;cursor:pointer;font-family:inherit">Edit Metadata</button>'
          : '')
```

- [ ] **Step 7: Update init() to call router.init() instead of loadBooks()**

Replace `init();` call at the bottom of the script with:

```javascript
    async function init() {
      try {
        const res = await fetch('/api/me');
        if (res.ok) currentUser = await res.json();
      } catch { /* keep defaults */ }

      document.getElementById('current-username').textContent = currentUser.username;
      if (!currentUser.isAdmin) document.body.classList.add('user-mode');

      await loadBooks();
      router.init(); // reads location.pathname and renders correct view
    }

    init();
```

- [ ] **Step 8: Manually verify routing works**

Build and run locally. Navigate to `/`, click a series, click a book, verify URL changes. Press Back button, verify correct view is shown.

- [ ] **Step 9: Run full test suite and lint**

```bash
npm test && npm run lint
```

Expected: all existing tests pass (no server-side changes broke anything).

- [ ] **Step 10: Commit**

```bash
git add app/public/index.html
git commit -m "feat: add History API router to frontend — all views have real URLs"
```

---

## Task 6: Edit page UI

**Files:**
- Modify: `app/public/index.html` (add CSS, add `_showEditPage` function and `renderEditPage` HTML builder, add `#edit-section` show/hide logic)

- [ ] **Step 1: Add CSS for the edit page**

In the `<style>` block, add these rules before `</style>`:

```css
    /* Edit metadata page */
    .edit-form-section{background:#fff;border-radius:6px;padding:1rem 1.25rem;margin-bottom:.75rem;box-shadow:0 1px 3px rgba(0,0,0,.07)}
    .edit-form-section label{display:block;font-size:.75rem;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.35rem}
    .edit-form-section input[type=text],.edit-form-section input[type=number],.edit-form-section textarea{width:100%;padding:.45rem .65rem;border:1px solid #d1d5db;border-radius:4px;font-size:.875rem;font-family:inherit;box-sizing:border-box}
    .edit-form-section textarea{min-height:80px;resize:vertical;line-height:1.5}
    .edit-form-section input:focus,.edit-form-section textarea:focus{outline:2px solid #3b82f6;border-color:transparent}
    .edit-chips{display:flex;flex-wrap:wrap;gap:.35rem;margin-bottom:.4rem}
    .edit-chip{display:inline-flex;align-items:center;gap:.3rem;background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:.15rem .6rem;font-size:.75rem;color:#1e40af}
    .edit-chip-remove{background:none;border:none;cursor:pointer;color:#93c5fd;font-size:.8rem;padding:0;line-height:1}
    .edit-chip-remove:hover{color:#1e40af}
    .edit-id-row{display:flex;gap:.5rem;margin-bottom:.4rem;align-items:center}
    .edit-id-row input{flex:1}
    .edit-id-scheme{flex:0 0 90px}
    .edit-remove-btn{background:transparent;border:1px solid #fca5a5;color:#dc2626;border-radius:4px;padding:.2rem .5rem;font-size:.75rem;cursor:pointer;white-space:nowrap}
    .edit-remove-btn:hover{background:#fee2e2}
    .edit-add-btn{background:transparent;border:1px solid #d1d5db;color:#374151;border-radius:4px;padding:.3rem .7rem;font-size:.8rem;cursor:pointer;margin-top:.25rem}
    .edit-add-btn:hover{background:#f9fafb}
    .edit-save-btn{background:#1e40af;color:#fff;border:none;border-radius:4px;padding:.6rem 1.5rem;font-size:.875rem;cursor:pointer;font-family:inherit;font-weight:500}
    .edit-save-btn:hover{background:#1d4ed8}
    .edit-save-btn:disabled{opacity:.6;cursor:not-allowed}
    .edit-error{color:#dc2626;font-size:.875rem;margin-top:.75rem;min-height:1.25rem}
    .edit-cover-preview{width:60px;height:86px;object-fit:cover;border-radius:3px;display:block;margin-bottom:.5rem;box-shadow:0 1px 4px rgba(0,0,0,.15)}
    .edit-cover-placeholder{width:60px;height:86px;background:#e5e7eb;border-radius:3px;margin-bottom:.5rem}
```

- [ ] **Step 2: Add renderEditPage and _showEditPage functions**

In the `<script>` section, after the `_showBookDetailPage` function, add:

```javascript
    function renderEditPage(book) {
      const coverHtml = book.hasCover
        ? `<img class="edit-cover-preview" id="cover-preview" src="/api/books/${esc(book.id)}/cover" alt="Current cover">`
        : `<div class="edit-cover-placeholder" id="cover-preview-placeholder"></div>`;

      const subjectVal = (book.subjects ?? []).join(', ');

      const identifierRows = (book.identifiers ?? []).map((id, i) =>
        `<div class="edit-id-row" data-idx="${i}">
          <input class="edit-id-scheme" type="text" placeholder="Scheme (ISBN, UUID…)" value="${esc(id.scheme)}">
          <input type="text" placeholder="Value" value="${esc(id.value)}">
          <button type="button" class="edit-remove-btn" data-remove-id="${i}">Remove</button>
        </div>`
      ).join('');

      return `
        <div class="book-detail-nav">
          <button class="book-back-btn" type="button">← Back</button>
          <span class="sep">/</span>
          <span class="crumb-current">Edit Metadata</span>
        </div>
        <div class="edit-form-section">
          <div style="font-size:1rem;font-weight:700;color:#111;margin-bottom:1rem">Edit Metadata — ${esc(book.title)}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
            <div>
              <label for="ef-title">Title</label>
              <input id="ef-title" type="text" value="${esc(book.title)}">
            </div>
            <div>
              <label for="ef-author">Author</label>
              <input id="ef-author" type="text" value="${esc(book.author ?? '')}">
            </div>
            <div>
              <label for="ef-fileAs">Author Sort</label>
              <input id="ef-fileAs" type="text" value="${esc(book.fileAs ?? '')}">
            </div>
            <div>
              <label for="ef-publisher">Publisher</label>
              <input id="ef-publisher" type="text" value="${esc(book.publisher ?? '')}">
            </div>
            <div>
              <label for="ef-series">Series</label>
              <input id="ef-series" type="text" value="${esc(book.series ?? '')}">
            </div>
            <div>
              <label for="ef-seriesIndex">Series Index</label>
              <input id="ef-seriesIndex" type="number" step="0.1" min="0" value="${esc(String(book.seriesIndex ?? 0))}">
            </div>
          </div>
        </div>
        <div class="edit-form-section">
          <label for="ef-description">Description</label>
          <textarea id="ef-description">${esc(book.description ?? '')}</textarea>
        </div>
        <div class="edit-form-section">
          <label>Subjects (comma-separated)</label>
          <input id="ef-subjects" type="text" placeholder="e.g. Fiction, Mystery" value="${esc(subjectVal)}">
        </div>
        <div class="edit-form-section">
          <label>Identifiers</label>
          <div id="ef-identifiers">${identifierRows}</div>
          <button type="button" class="edit-add-btn" id="ef-add-identifier">+ Add Identifier</button>
        </div>
        <div class="edit-form-section">
          <label>Cover Image</label>
          ${coverHtml}
          <input type="file" id="ef-cover" accept="image/*" style="font-size:.8rem">
          <div id="ef-cover-preview-new" style="margin-top:.5rem"></div>
        </div>
        <div class="edit-form-section" style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap">
          <button type="button" class="edit-save-btn" id="ef-save">Save Changes</button>
          <span class="edit-error" id="ef-error"></span>
        </div>`;
    }

    async function _showEditPage(id) {
      if (!currentUser.isAdmin) {
        _hideAllSections();
        editSection.innerHTML = '<p style="color:#dc2626;padding:2rem;text-align:center">Not authorized.</p>';
        editSection.style.display = '';
        return;
      }

      _hideAllSections();
      editSection.innerHTML = '<p style="color:#6b7280;padding:2rem;text-align:center">Loading…</p>';
      editSection.style.display = '';

      let book;
      try {
        const res = await fetch('/api/books/' + encodeURIComponent(id));
        if (!res.ok) { editSection.innerHTML = '<p style="color:#dc2626;padding:2rem">Book not found.</p>'; return; }
        book = await res.json();
      } catch {
        editSection.innerHTML = '<p style="color:#dc2626;padding:2rem">Failed to load.</p>';
        return;
      }

      editSection.innerHTML = renderEditPage(book);

      // Back button
      editSection.querySelector('.book-back-btn').addEventListener('click', () => history.back());

      // Add identifier row
      editSection.querySelector('#ef-add-identifier').addEventListener('click', () => {
        const container = editSection.querySelector('#ef-identifiers');
        const idx = container.children.length;
        const div = document.createElement('div');
        div.className = 'edit-id-row';
        div.dataset.idx = idx;
        div.innerHTML = `<input class="edit-id-scheme" type="text" placeholder="Scheme"><input type="text" placeholder="Value"><button type="button" class="edit-remove-btn">Remove</button>`;
        div.querySelector('.edit-remove-btn').addEventListener('click', () => div.remove());
        container.appendChild(div);
      });

      // Wire existing remove buttons
      editSection.querySelectorAll('.edit-remove-btn[data-remove-id]').forEach(btn => {
        btn.addEventListener('click', () => btn.closest('.edit-id-row').remove());
      });

      // Cover preview on file select
      editSection.querySelector('#ef-cover').addEventListener('change', function() {
        const file = this.files[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        editSection.querySelector('#ef-cover-preview-new').innerHTML =
          `<img src="${url}" style="width:60px;height:86px;object-fit:cover;border-radius:3px;display:block;box-shadow:0 1px 4px rgba(0,0,0,.15)" alt="New cover">`;
      });

      // Save
      editSection.querySelector('#ef-save').addEventListener('click', async () => {
        const saveBtn = editSection.querySelector('#ef-save');
        const errorEl = editSection.querySelector('#ef-error');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving…';
        errorEl.textContent = '';

        const fd = new FormData();
        const changed = {};

        const title = editSection.querySelector('#ef-title').value;
        if (title !== book.title) fd.append('title', title);

        const author = editSection.querySelector('#ef-author').value;
        if (author !== (book.author ?? '')) fd.append('author', author);

        const fileAs = editSection.querySelector('#ef-fileAs').value;
        if (fileAs !== (book.fileAs ?? '')) fd.append('fileAs', fileAs);

        const publisher = editSection.querySelector('#ef-publisher').value;
        if (publisher !== (book.publisher ?? '')) fd.append('publisher', publisher);

        const series = editSection.querySelector('#ef-series').value;
        if (series !== (book.series ?? '')) fd.append('series', series);

        const seriesIndex = editSection.querySelector('#ef-seriesIndex').value;
        if (parseFloat(seriesIndex) !== (book.seriesIndex ?? 0)) fd.append('seriesIndex', seriesIndex);

        const description = editSection.querySelector('#ef-description').value;
        if (description !== (book.description ?? '')) fd.append('description', description);

        const subjectsRaw = editSection.querySelector('#ef-subjects').value;
        const newSubjects = subjectsRaw.split(',').map(s => s.trim()).filter(Boolean);
        const oldSubjects = book.subjects ?? [];
        if (JSON.stringify(newSubjects) !== JSON.stringify(oldSubjects)) {
          fd.append('subjects', JSON.stringify(newSubjects));
        }

        const idRows = editSection.querySelectorAll('#ef-identifiers .edit-id-row');
        const newIdentifiers = Array.from(idRows).map(row => ({
          scheme: row.querySelector('.edit-id-scheme').value.trim(),
          value: row.querySelectorAll('input')[1].value.trim(),
        })).filter(id => id.value);
        const oldIdentifiers = book.identifiers ?? [];
        if (JSON.stringify(newIdentifiers) !== JSON.stringify(oldIdentifiers)) {
          fd.append('identifiers', JSON.stringify(newIdentifiers));
        }

        const coverFile = editSection.querySelector('#ef-cover').files[0];
        if (coverFile) fd.append('cover', coverFile);

        // Only submit if something changed
        if ([...fd.keys()].length === 0) {
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save Changes';
          router.navigate('/books/' + encodeURIComponent(id));
          return;
        }

        try {
          const res = await fetch('/api/books/' + encodeURIComponent(id) + '/metadata', {
            method: 'PATCH',
            body: fd,
          });
          if (res.ok) {
            const updated = await res.json();
            await loadBooks();
            router.navigate('/books/' + encodeURIComponent(updated.id));
          } else {
            const data = await res.json().catch(() => ({}));
            errorEl.textContent = data.error || 'Save failed.';
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Changes';
          }
        } catch {
          errorEl.textContent = 'Network error. Please try again.';
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save Changes';
        }
      });
    }
```

- [ ] **Step 3: Run full test suite and lint**

```bash
npm test && npm run lint
```

Expected: all tests pass, no lint errors.

- [ ] **Step 4: Manual smoke test**

1. Start the app
2. Log in as admin
3. Navigate to a book detail page — verify URL is `/books/:id`
4. Click "Edit Metadata" — verify URL is `/books/:id/edit`
5. Edit the title, click Save — verify redirect to `/books/:id` with new title
6. Upload a new cover image — verify cover updates in book detail
7. Press browser Back from book detail — verify correct previous view is shown
8. Directly navigate to `/series/:name` in browser — verify series page loads

- [ ] **Step 5: Commit**

```bash
git add app/public/index.html
git commit -m "feat: add edit metadata page with full field editing, cover upload, and History API routing"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] All fields editable (title, author, fileAs, description, publisher, series, seriesIndex, subjects, identifiers, cover) — Task 1 + 6
- [x] Changes written to actual EPUB (OPF XML in ZIP) — Task 1
- [x] Re-scan/re-import after edit — Task 2 + 3
- [x] Admin-only PATCH endpoint — Task 3
- [x] Dedicated edit page at `/books/:id/edit` — Task 4 + 5 + 6
- [x] History API routing for all views — Task 5
- [x] Back button works — Task 5 (uses `history.back()`)
- [x] Error handling: 404 book, 403 non-admin, 500 EPUB write failure — Task 3
- [x] Partial MD5 id cascade on write — Task 2

**Types consistency:**
- `EpubChanges` defined in `epub-writer.ts`, imported in `ui.ts` ✓
- `reimportBook(id: string): Book | null` — return type matches `getBookById` ✓
- `coverUpload.single('cover')` field name matches `req.file` access in handler ✓
- `router.navigate(path, state?)` called consistently across all navigation points ✓

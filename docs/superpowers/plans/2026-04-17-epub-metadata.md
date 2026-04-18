# EPUB Metadata & OPDS Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restrict the library to EPUB-only files, parse EPUB metadata (title, author, description, series, cover) at upload time, cache it in SQLite, and surface it in the web UI and OPDS feed.

**Architecture:** `EpubParser` (new stateless module) handles ZIP/OPF parsing and KoReader-compatible partial-MD5 ID generation. `BookStore` gains a `Database` dependency and becomes SQLite-backed — reads never touch the filesystem. `UserStore` constructor changes from `(dbPath)` to `(db: Database)` so both services share one connection. Upload endpoint orchestrates parse → hash → store. OPDS and UI routes gain cover endpoints.

**Tech Stack:** TypeScript 5, Express 4, better-sqlite3, adm-zip (new), fast-xml-parser (new), multer, Jest + supertest

---

## File Map

| File | Change |
|------|--------|
| `app/types.ts` | Update `Book`; add `EpubMeta` |
| `app/services/EpubParser.ts` | **New** — `partialMD5()`, `parseEpub()` |
| `app/services/UserStore.ts` | Constructor `(dbPath)` → `(db: Database)`; remove `close()` |
| `app/services/BookStore.ts` | Rewrite — SQLite-backed, new constructor `(booksDir, db)` |
| `app/index.ts` | Create shared `Database`; pass to both services |
| `app/routes/opds.ts` | Add author/summary/cover link per entry; add cover endpoint |
| `app/routes/ui.ts` | EPUB-only; parse+hash on upload; cover endpoint; richer `/api/books` |
| `app/public/index.html` | Cover thumbnail, author, series in book list; epub-only upload |
| `tests/EpubParser.test.ts` | **New** |
| `tests/UserStore.test.ts` | Update constructor |
| `tests/users.test.ts` | Update constructor |
| `tests/BookStore.test.ts` | Rewrite — SQLite-backed |
| `tests/opds.test.ts` | Update constructor + add cover tests |
| `tests/ui.test.ts` | Update constructor + upload/cover tests |

---

## Task 1: Install Dependencies

**Files:** `package.json` (modified by npm)

- [ ] **Step 1: Install runtime deps**

```bash
npm install adm-zip fast-xml-parser
```

Expected: `adm-zip` and `fast-xml-parser` appear in `dependencies` in `package.json`.

- [ ] **Step 2: Install type definitions**

```bash
npm install -D @types/adm-zip
```

Expected: `@types/adm-zip` appears in `devDependencies`. (`fast-xml-parser` ships its own types.)

- [ ] **Step 3: Verify build still passes**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add adm-zip and fast-xml-parser dependencies"
```

---

## Task 2: Update `app/types.ts`

**Files:**
- Modify: `app/types.ts`

- [ ] **Step 1: Rewrite `app/types.ts`**

```typescript
export interface Book {
  id: string;           // 32-char partial MD5 (KoReader binary algorithm) — matches KOSync progress.document
  filename: string;
  path: string;
  title: string;
  author: string;
  description: string;
  series: string;
  seriesIndex: number;  // REAL — supports fractional entries like 2.5
  hasCover: boolean;    // true when cover blob is present in SQLite
  size: number;
  mtime: Date;
  addedAt: Date;
}

export interface EpubMeta {
  title: string;
  author: string;
  description: string;
  series: string;
  seriesIndex: number;
  coverData: Buffer | null;
  coverMime: string | null;
}

export interface Progress {
  document: string;
  progress: string;
  percentage: number;
  device: string;
  device_id: string;
  timestamp: number;
}

export interface AppConfig {
  username: string;
  password: string;
  booksDir: string;
  dataDir: string;
  port: number;
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: TypeScript errors on `BookStore.ts` and `routes/ui.ts` referencing removed fields (`ext`, `mimeType`, `relativePath`) — this is expected; they'll be fixed in later tasks.

- [ ] **Step 3: Commit**

```bash
git add app/types.ts
git commit -m "feat: update Book type and add EpubMeta interface"
```

---

## Task 3: Create `EpubParser` (TDD)

**Files:**
- Create: `app/services/EpubParser.ts`
- Create: `tests/EpubParser.test.ts`

- [ ] **Step 1: Write the failing tests in `tests/EpubParser.test.ts`**

```typescript
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import AdmZip from 'adm-zip';
import { partialMD5, parseEpub } from '../app/services/EpubParser';

// ── Helpers ───────────────────────────────────────────────────────────────────

interface EpubOptions {
  title?: string;
  author?: string;
  description?: string;
  series?: string;
  seriesIndex?: number;
  coverData?: Buffer;
}

function makeEpub(opts: EpubOptions = {}): Buffer {
  const zip = new AdmZip();
  zip.addFile('mimetype', Buffer.from('application/epub+zip'));
  zip.addFile('META-INF/container.xml', Buffer.from(
    `<?xml version="1.0"?><container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`
  ));

  const seriesMeta = opts.series
    ? `<meta name="calibre:series" content="${opts.series}"/><meta name="calibre:series_index" content="${opts.seriesIndex ?? 1}"/>`
    : '';
  const coverMeta = opts.coverData ? `<meta name="cover" content="cover-img"/>` : '';
  const coverManifest = opts.coverData
    ? `<item id="cover-img" href="cover.jpg" media-type="image/jpeg"/>`
    : '';

  zip.addFile('OEBPS/content.opf', Buffer.from(
    `<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="2.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${opts.title ?? ''}</dc:title><dc:creator>${opts.author ?? ''}</dc:creator><dc:description>${opts.description ?? ''}</dc:description>${seriesMeta}${coverMeta}</metadata><manifest>${coverManifest}</manifest></package>`
  ));

  if (opts.coverData) {
    zip.addFile('OEBPS/cover.jpg', opts.coverData);
  }
  return zip.toBuffer();
}

// ── partialMD5 ────────────────────────────────────────────────────────────────

describe('partialMD5', () => {
  let tmpFile: string;

  beforeEach(() => {
    tmpFile = path.join(os.tmpdir(), `epub-hash-test-${Date.now()}.bin`);
  });

  afterEach(() => {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  });

  it('returns a 32-char lowercase hex string', () => {
    fs.writeFileSync(tmpFile, Buffer.alloc(2000, 0x42));
    const result = partialMD5(tmpFile);
    expect(result).toHaveLength(32);
    expect(result).toMatch(/^[0-9a-f]+$/);
  });

  it('is deterministic — same file produces same hash', () => {
    fs.writeFileSync(tmpFile, Buffer.alloc(2000, 0x42));
    expect(partialMD5(tmpFile)).toBe(partialMD5(tmpFile));
  });

  it('produces different hashes for different content', () => {
    const file2 = tmpFile + '.2';
    fs.writeFileSync(tmpFile, Buffer.alloc(2000, 0x11));
    fs.writeFileSync(file2, Buffer.alloc(2000, 0x22));
    try {
      expect(partialMD5(tmpFile)).not.toBe(partialMD5(file2));
    } finally {
      fs.unlinkSync(file2);
    }
  });

  it('handles files smaller than first offset (< 256 bytes)', () => {
    fs.writeFileSync(tmpFile, Buffer.alloc(100, 0x01));
    const result = partialMD5(tmpFile);
    expect(result).toHaveLength(32);
  });
});

// ── parseEpub ─────────────────────────────────────────────────────────────────

describe('parseEpub', () => {
  let tmpFile: string;

  beforeEach(() => {
    tmpFile = path.join(os.tmpdir(), `epub-parse-test-${Date.now()}.epub`);
  });

  afterEach(() => {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  });

  it('extracts title and author', () => {
    fs.writeFileSync(tmpFile, makeEpub({ title: 'Dune', author: 'Frank Herbert' }));
    const meta = parseEpub(tmpFile);
    expect(meta.title).toBe('Dune');
    expect(meta.author).toBe('Frank Herbert');
  });

  it('extracts description', () => {
    fs.writeFileSync(tmpFile, makeEpub({ description: 'A sci-fi epic.' }));
    const meta = parseEpub(tmpFile);
    expect(meta.description).toBe('A sci-fi epic.');
  });

  it('extracts Calibre series metadata', () => {
    fs.writeFileSync(tmpFile, makeEpub({ series: 'Dune Chronicles', seriesIndex: 1 }));
    const meta = parseEpub(tmpFile);
    expect(meta.series).toBe('Dune Chronicles');
    expect(meta.seriesIndex).toBe(1);
  });

  it('supports fractional series index', () => {
    fs.writeFileSync(tmpFile, makeEpub({ series: 'Stormlight', seriesIndex: 2.5 }));
    const meta = parseEpub(tmpFile);
    expect(meta.seriesIndex).toBeCloseTo(2.5);
  });

  it('defaults missing fields to empty strings and zero', () => {
    fs.writeFileSync(tmpFile, makeEpub({}));
    const meta = parseEpub(tmpFile);
    expect(meta.author).toBe('');
    expect(meta.description).toBe('');
    expect(meta.series).toBe('');
    expect(meta.seriesIndex).toBe(0);
  });

  it('extracts cover image bytes and mime type', () => {
    const fakeJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    fs.writeFileSync(tmpFile, makeEpub({ coverData: fakeJpeg }));
    const meta = parseEpub(tmpFile);
    expect(meta.coverData).not.toBeNull();
    expect(meta.coverMime).toBe('image/jpeg');
    expect(meta.coverData!.slice(0, 4)).toEqual(fakeJpeg.slice(0, 4));
  });

  it('returns null cover when EPUB has no cover', () => {
    fs.writeFileSync(tmpFile, makeEpub({ title: 'No Cover' }));
    const meta = parseEpub(tmpFile);
    expect(meta.coverData).toBeNull();
    expect(meta.coverMime).toBeNull();
  });

  it('throws on a file that is not a valid ZIP', () => {
    fs.writeFileSync(tmpFile, Buffer.from('not a zip'));
    expect(() => parseEpub(tmpFile)).toThrow();
  });

  it('throws when container.xml is missing', () => {
    const zip = new AdmZip();
    zip.addFile('mimetype', Buffer.from('application/epub+zip'));
    fs.writeFileSync(tmpFile, zip.toBuffer());
    expect(() => parseEpub(tmpFile)).toThrow(/container\.xml/);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --testPathPattern=EpubParser
```

Expected: FAIL — `Cannot find module '../app/services/EpubParser'`

- [ ] **Step 3: Write `app/services/EpubParser.ts`**

```typescript
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as path from 'path';
import AdmZip from 'adm-zip';
import { XMLParser } from 'fast-xml-parser';
import { EpubMeta } from '../types';

// KoReader partial-MD5 binary algorithm (kosync.koplugin/main.lua: getFileDigest)
// Reads 1024-byte chunks at offsets: 256, 1024, 4096, 16384, ... (1024 << 2*i for i=-1..10)
const PARTIAL_MD5_OFFSETS = [
  256, 1024, 4096, 16384, 65536, 262144,
  1048576, 4194304, 16777216, 67108864, 268435456, 1073741824,
];

export function partialMD5(filePath: string): string {
  const size = fs.statSync(filePath).size;
  const fd = fs.openSync(filePath, 'r');
  const md5 = crypto.createHash('md5');
  const chunk = Buffer.alloc(1024);

  try {
    for (const offset of PARTIAL_MD5_OFFSETS) {
      if (offset >= size) break;
      const bytesRead = fs.readSync(fd, chunk, 0, 1024, offset);
      if (bytesRead > 0) md5.update(chunk.subarray(0, bytesRead));
    }
  } finally {
    fs.closeSync(fd);
  }

  return md5.digest('hex');
}

export function parseEpub(filePath: string): EpubMeta {
  const zip = new AdmZip(filePath);

  // 1. Locate OPF via container.xml
  const containerEntry = zip.getEntry('META-INF/container.xml');
  if (!containerEntry) throw new Error('Missing META-INF/container.xml');

  const xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
  });

  const container = xmlParser.parse(containerEntry.getData().toString('utf-8'));
  const opfPath: string | undefined =
    container?.container?.rootfiles?.rootfile?.['@_full-path'];
  if (!opfPath) throw new Error('Cannot find OPF rootfile path in container.xml');

  // 2. Parse OPF
  const opfEntry = zip.getEntry(opfPath);
  if (!opfEntry) throw new Error(`OPF file not found at path: ${opfPath}`);

  const opf = xmlParser.parse(opfEntry.getData().toString('utf-8'));
  const metadata = opf?.package?.metadata ?? {};

  // 3. dc:title — may be string or { '#text': ..., '@_id': ... }
  const rawTitle = metadata['dc:title'] ?? '';
  const title = (typeof rawTitle === 'object' ? String(rawTitle['#text'] ?? '') : String(rawTitle)).trim();

  // 4. dc:creator — may be string, object, or array
  const rawCreator = metadata['dc:creator'];
  const firstCreator = Array.isArray(rawCreator) ? rawCreator[0] : rawCreator;
  const author = firstCreator
    ? (typeof firstCreator === 'object'
        ? String(firstCreator['#text'] ?? '')
        : String(firstCreator)
      ).trim()
    : '';

  // 5. dc:description
  const rawDesc = metadata['dc:description'] ?? '';
  const description = (typeof rawDesc === 'object' ? String(rawDesc['#text'] ?? '') : String(rawDesc)).trim();

  // 6. Series — Calibre EPUB2 meta tags + EPUB3 belongs-to-collection
  let series = '';
  let seriesIndex = 0;
  const metaItems: unknown[] = Array.isArray(metadata.meta)
    ? metadata.meta
    : metadata.meta
    ? [metadata.meta]
    : [];

  for (const m of metaItems) {
    if (typeof m !== 'object' || m === null) continue;
    const meta = m as Record<string, unknown>;
    if (meta['@_name'] === 'calibre:series') series = String(meta['@_content'] ?? '').trim();
    if (meta['@_name'] === 'calibre:series_index') seriesIndex = parseFloat(String(meta['@_content'] ?? '0')) || 0;
    if (meta['@_property'] === 'belongs-to-collection') series = String(meta['#text'] ?? '').trim();
    if (meta['@_property'] === 'group-position') seriesIndex = parseFloat(String(meta['#text'] ?? '0')) || 0;
  }

  // 7. Cover image
  let coverData: Buffer | null = null;
  let coverMime: string | null = null;

  const manifestRaw = opf?.package?.manifest?.item;
  const manifestItems: Array<Record<string, unknown>> = Array.isArray(manifestRaw)
    ? manifestRaw
    : manifestRaw
    ? [manifestRaw]
    : [];

  // Find cover id from <meta name="cover" content="id"/>
  const coverMetaItem = metaItems.find(
    m => typeof m === 'object' && m !== null && (m as Record<string, unknown>)['@_name'] === 'cover'
  ) as Record<string, unknown> | undefined;
  const coverId = coverMetaItem ? String(coverMetaItem['@_content'] ?? '') : '';

  let coverItem = coverId
    ? manifestItems.find(item => String(item['@_id'] ?? '') === coverId)
    : undefined;

  // Fallback: properties="cover-image" (EPUB3)
  if (!coverItem) {
    coverItem = manifestItems.find(item => String(item['@_properties'] ?? '') === 'cover-image');
  }

  // Fallback: any image href containing "cover"
  if (!coverItem) {
    coverItem = manifestItems.find(
      item =>
        String(item['@_media-type'] ?? '').startsWith('image/') &&
        String(item['@_href'] ?? '').toLowerCase().includes('cover')
    );
  }

  if (coverItem) {
    const opfDir = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : '';
    const coverEntryPath = opfDir + String(coverItem['@_href'] ?? '');
    const coverEntry = zip.getEntry(coverEntryPath);
    if (coverEntry) {
      coverData = coverEntry.getData();
      coverMime = String(coverItem['@_media-type'] ?? 'image/jpeg');
    }
  }

  return { title, author, description, series, seriesIndex, coverData, coverMime };
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- --testPathPattern=EpubParser
```

Expected: all 12 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/services/EpubParser.ts tests/EpubParser.test.ts
git commit -m "feat: EpubParser — partial MD5 (KoReader-compatible) and EPUB metadata extraction"
```

---

## Task 4: Refactor `UserStore` Constructor

`UserStore` currently creates its own `Database`. Change it to accept an existing instance so `index.ts` can share one connection with `BookStore`.

**Files:**
- Modify: `app/services/UserStore.ts`
- Modify: `tests/UserStore.test.ts`
- Modify: `tests/users.test.ts`
- Modify: `tests/opds.test.ts` (constructor fix only — test logic unchanged)

- [ ] **Step 1: Update `app/services/UserStore.ts`**

Replace the constructor and remove `close()`:

```typescript
import Database, { Database as DB } from 'better-sqlite3';
import * as crypto from 'crypto';
import { Progress } from '../types';

export class UserStore {
  private db: DB;

  constructor(db: DB) {
    this.db = db;
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        key TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS progress (
        username  TEXT    NOT NULL,
        document  TEXT    NOT NULL,
        progress  TEXT    NOT NULL,
        percentage REAL   NOT NULL,
        device    TEXT    NOT NULL,
        device_id TEXT    NOT NULL,
        timestamp INTEGER NOT NULL,
        PRIMARY KEY (username, document)
      );
    `);
  }

  static hashPassword(password: string): string {
    return crypto.createHash('md5').update(password).digest('hex');
  }

  createUser(username: string, key: string): boolean {
    try {
      this.db.prepare('INSERT INTO users (username, key) VALUES (?, ?)').run(username, key);
      return true;
    } catch {
      return false;
    }
  }

  authenticate(username: string, key: string): boolean {
    const row = this.db
      .prepare('SELECT key FROM users WHERE username = ?')
      .get(username) as { key: string } | undefined;
    return row?.key === key;
  }

  getProgress(username: string, document: string): Progress | null {
    const row = this.db
      .prepare(
        'SELECT document, progress, percentage, device, device_id, timestamp FROM progress WHERE username = ? AND document = ?'
      )
      .get(username, document) as Progress | undefined;
    return row ?? null;
  }

  saveProgress(
    username: string,
    p: Omit<Progress, 'timestamp'> & { timestamp?: number }
  ): Progress {
    const timestamp = p.timestamp ?? Math.floor(Date.now() / 1000);
    this.db
      .prepare(`
        INSERT INTO progress (username, document, progress, percentage, device, device_id, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (username, document) DO UPDATE SET
          progress   = excluded.progress,
          percentage = excluded.percentage,
          device     = excluded.device,
          device_id  = excluded.device_id,
          timestamp  = excluded.timestamp
      `)
      .run(username, p.document, p.progress, p.percentage, p.device, p.device_id, timestamp);
    return { ...p, timestamp };
  }

  userExists(username: string): boolean {
    const row = this.db.prepare('SELECT 1 FROM users WHERE username = ?').get(username);
    return row !== undefined;
  }

  listUsers(): { username: string; progressCount: number }[] {
    return this.db.prepare(`
      SELECT u.username, COUNT(p.document) AS progressCount
      FROM users u
      LEFT JOIN progress p ON p.username = u.username
      GROUP BY u.username
      ORDER BY u.username ASC
    `).all() as { username: string; progressCount: number }[];
  }

  getUserProgress(username: string): Progress[] {
    return this.db.prepare(`
      SELECT document, progress, percentage, device, device_id, timestamp
      FROM progress
      WHERE username = ?
      ORDER BY timestamp DESC
    `).all(username) as Progress[];
  }

  deleteUser(username: string): boolean {
    const result = (this.db.transaction(() => {
      this.db.prepare('DELETE FROM progress WHERE username = ?').run(username);
      return this.db.prepare('DELETE FROM users WHERE username = ?').run(username);
    }))();
    return result.changes > 0;
  }
}
```

- [ ] **Step 2: Update `tests/UserStore.test.ts`**

```typescript
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import Database from 'better-sqlite3';
import { UserStore } from '../app/services/UserStore';

let db: Database.Database;
let dbPath: string;
let store: UserStore;

beforeEach(() => {
  dbPath = path.join(os.tmpdir(), `hass-odps-test-${Date.now()}.sqlite`);
  db = new Database(dbPath);
  store = new UserStore(db);
});

afterEach(() => {
  db.close();
  fs.unlinkSync(dbPath);
});

describe('UserStore.createUser', () => {
  it('returns true on first registration', () => {
    expect(store.createUser('alice', 'secret')).toBe(true);
  });

  it('returns false on duplicate username', () => {
    store.createUser('alice', 'secret');
    expect(store.createUser('alice', 'other')).toBe(false);
  });
});

describe('UserStore.authenticate', () => {
  beforeEach(() => store.createUser('alice', UserStore.hashPassword('secret')));

  it('returns true with correct MD5 key', () => {
    const key = UserStore.hashPassword('secret');
    expect(store.authenticate('alice', key)).toBe(true);
  });

  it('returns false with wrong key', () => {
    expect(store.authenticate('alice', 'wronghash')).toBe(false);
  });

  it('returns false for unknown user', () => {
    const key = UserStore.hashPassword('secret');
    expect(store.authenticate('nobody', key)).toBe(false);
  });
});

describe('UserStore.saveProgress + getProgress', () => {
  beforeEach(() => store.createUser('alice', 'secret'));

  it('retrieves saved progress', () => {
    store.saveProgress('alice', {
      document: 'abc123',
      progress: '/body/DocFragment[5]',
      percentage: 0.42,
      device: 'Kobo',
      device_id: 'dev-1',
    });
    const p = store.getProgress('alice', 'abc123');
    expect(p).not.toBeNull();
    expect(p!.progress).toBe('/body/DocFragment[5]');
    expect(p!.percentage).toBeCloseTo(0.42);
  });

  it('updates existing progress on conflict', () => {
    store.saveProgress('alice', {
      document: 'abc123',
      progress: '/body/DocFragment[5]',
      percentage: 0.42,
      device: 'Kobo',
      device_id: 'dev-1',
    });
    store.saveProgress('alice', {
      document: 'abc123',
      progress: '/body/DocFragment[10]',
      percentage: 0.8,
      device: 'Kobo',
      device_id: 'dev-1',
    });
    const p = store.getProgress('alice', 'abc123');
    expect(p!.percentage).toBeCloseTo(0.8);
  });

  it('returns null when no progress exists', () => {
    expect(store.getProgress('alice', 'unknown')).toBeNull();
  });
});

describe('UserStore.userExists', () => {
  it('returns false for unknown user', () => {
    expect(store.userExists('nobody')).toBe(false);
  });

  it('returns true for a registered user', () => {
    store.createUser('alice', 'secret');
    expect(store.userExists('alice')).toBe(true);
  });
});

describe('UserStore.listUsers', () => {
  it('returns empty array when no users', () => {
    expect(store.listUsers()).toEqual([]);
  });

  it('returns users sorted by username with progress count', () => {
    store.createUser('zara', 'pass');
    store.createUser('alice', 'pass');
    store.saveProgress('alice', {
      document: 'doc1', progress: '/p[1]', percentage: 0.5, device: 'Kobo', device_id: 'd1',
    });
    store.saveProgress('alice', {
      document: 'doc2', progress: '/p[1]', percentage: 0.2, device: 'Kobo', device_id: 'd1',
    });
    const users = store.listUsers();
    expect(users).toHaveLength(2);
    expect(users[0].username).toBe('alice');
    expect(users[0].progressCount).toBe(2);
    expect(users[1].username).toBe('zara');
    expect(users[1].progressCount).toBe(0);
  });
});

describe('UserStore.getUserProgress', () => {
  beforeEach(() => store.createUser('alice', 'pass'));

  it('returns empty array when user has no progress', () => {
    expect(store.getUserProgress('alice')).toEqual([]);
  });

  it('returns all progress records ordered by timestamp descending', () => {
    store.saveProgress('alice', {
      document: 'doc1', progress: '/p[1]', percentage: 0.3, device: 'Kobo', device_id: 'd1', timestamp: 100,
    });
    store.saveProgress('alice', {
      document: 'doc2', progress: '/p[2]', percentage: 0.8, device: 'Kobo', device_id: 'd1', timestamp: 200,
    });
    const records = store.getUserProgress('alice');
    expect(records).toHaveLength(2);
    expect(records[0].document).toBe('doc2');
    expect(records[1].document).toBe('doc1');
  });

  it('only returns records for the specified user', () => {
    store.createUser('bob', 'pass');
    store.saveProgress('alice', {
      document: 'doc1', progress: '/p[1]', percentage: 0.5, device: 'Kobo', device_id: 'd1',
    });
    store.saveProgress('bob', {
      document: 'doc2', progress: '/p[1]', percentage: 0.3, device: 'Kobo', device_id: 'd2',
    });
    expect(store.getUserProgress('alice')).toHaveLength(1);
    expect(store.getUserProgress('alice')[0].document).toBe('doc1');
  });
});

describe('UserStore.deleteUser', () => {
  beforeEach(() => {
    store.createUser('alice', 'pass');
    store.saveProgress('alice', {
      document: 'doc1', progress: '/p[1]', percentage: 0.5, device: 'Kobo', device_id: 'd1',
    });
  });

  it('returns false for unknown user', () => {
    expect(store.deleteUser('nobody')).toBe(false);
  });

  it('returns true and removes the user', () => {
    expect(store.deleteUser('alice')).toBe(true);
    expect(store.userExists('alice')).toBe(false);
  });

  it('cascades to delete all progress records', () => {
    store.deleteUser('alice');
    expect(store.getUserProgress('alice')).toEqual([]);
  });

  it('does not affect other users', () => {
    store.createUser('bob', 'pass');
    store.deleteUser('alice');
    expect(store.userExists('bob')).toBe(true);
  });
});
```

- [ ] **Step 3: Update `tests/users.test.ts`**

Change only the `beforeEach` / `afterEach` to use an external `Database`:

```typescript
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import request from 'supertest';
import express from 'express';
import session from 'express-session';
import Database from 'better-sqlite3';
import { UserStore } from '../app/services/UserStore';
import { createUsersRouter } from '../app/routes/users';

let dbPath: string;
let db: Database.Database;
let userStore: UserStore;
let app: express.Express;

beforeEach(() => {
  dbPath = path.join(os.tmpdir(), `hass-odps-users-test-${Date.now()}.sqlite`);
  db = new Database(dbPath);
  userStore = new UserStore(db);

  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(session({ secret: 'test-secret', resave: false, saveUninitialized: false }));
  app.post('/login', (req, res) => {
    (req.session as { authenticated?: boolean }).authenticated = true;
    res.status(200).send('ok');
  });
  app.use('/api/users', createUsersRouter(userStore));
});

afterEach(() => {
  db.close();
  fs.unlinkSync(dbPath);
});

async function authenticatedAgent() {
  const agent = request.agent(app);
  await agent.post('/login');
  return agent;
}

describe('GET /api/users', () => {
  it('redirects to /login without session', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(302);
  });

  it('returns empty array when no users', async () => {
    const agent = await authenticatedAgent();
    const res = await agent.get('/api/users');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns users with progress counts', async () => {
    userStore.createUser('alice', 'pass');
    userStore.saveProgress('alice', {
      document: 'doc1', progress: '/p[1]', percentage: 0.5, device: 'Kobo', device_id: 'd1',
    });
    const agent = await authenticatedAgent();
    const res = await agent.get('/api/users');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].username).toBe('alice');
    expect(res.body[0].progressCount).toBe(1);
  });
});

describe('GET /api/users/:username/progress', () => {
  it('redirects to /login without session', async () => {
    const res = await request(app).get('/api/users/alice/progress');
    expect(res.status).toBe(302);
  });

  it('returns 404 for unknown user', async () => {
    const agent = await authenticatedAgent();
    const res = await agent.get('/api/users/nobody/progress');
    expect(res.status).toBe(404);
  });

  it('returns empty array for user with no progress', async () => {
    userStore.createUser('alice', 'pass');
    const agent = await authenticatedAgent();
    const res = await agent.get('/api/users/alice/progress');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns progress records for a user', async () => {
    userStore.createUser('alice', 'pass');
    userStore.saveProgress('alice', {
      document: 'dune.epub', progress: '/p[5]', percentage: 0.42, device: 'Kobo', device_id: 'd1',
    });
    const agent = await authenticatedAgent();
    const res = await agent.get('/api/users/alice/progress');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].document).toBe('dune.epub');
    expect(res.body[0].percentage).toBeCloseTo(0.42);
  });
});

describe('DELETE /api/users/:username', () => {
  it('redirects to /login without session', async () => {
    const res = await request(app).delete('/api/users/alice');
    expect(res.status).toBe(302);
  });

  it('returns 404 for unknown user', async () => {
    const agent = await authenticatedAgent();
    const res = await agent.delete('/api/users/nobody');
    expect(res.status).toBe(404);
  });

  it('deletes the user and returns 204', async () => {
    userStore.createUser('alice', 'pass');
    const agent = await authenticatedAgent();
    const res = await agent.delete('/api/users/alice');
    expect(res.status).toBe(204);
    expect(userStore.userExists('alice')).toBe(false);
  });

  it('cascades to delete progress records', async () => {
    userStore.createUser('alice', 'pass');
    userStore.saveProgress('alice', {
      document: 'doc1', progress: '/p[1]', percentage: 0.5, device: 'Kobo', device_id: 'd1',
    });
    const agent = await authenticatedAgent();
    await agent.delete('/api/users/alice');
    expect(userStore.getUserProgress('alice')).toEqual([]);
  });
});
```

- [ ] **Step 4: Fix `tests/opds.test.ts` constructor call** (minimal — test logic unchanged)

In `tests/opds.test.ts`, replace `beforeEach` / `afterEach` only:

```typescript
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import request from 'supertest';
import express from 'express';
import Database from 'better-sqlite3';
import { BookStore } from '../app/services/BookStore';
import { UserStore } from '../app/services/UserStore';
import { createOpdsRouter } from '../app/routes/opds';

let booksDir: string;
let db: Database.Database;
let bookStore: BookStore;
let userStore: UserStore;
let app: express.Express;

function basicAuth(username: string, password: string) {
  const encoded = Buffer.from(`${username}:${password}`).toString('base64');
  return { Authorization: `Basic ${encoded}` };
}

beforeEach(() => {
  booksDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hass-odps-opds-'));
  db = new Database(':memory:');
  userStore = new UserStore(db);
  bookStore = new BookStore(booksDir, db);
  userStore.createUser('alice', UserStore.hashPassword('secret'));
  app = express();
  app.use('/opds', createOpdsRouter(bookStore, userStore));
});

afterEach(() => {
  db.close();
  fs.rmSync(booksDir, { recursive: true });
});
```

Keep all existing `describe` blocks unchanged — they will be expanded in Task 7.

- [ ] **Step 5: Run all tests**

```bash
npm test
```

Expected: all tests PASS. (BookStore tests may still reference old `ext`/`mimeType` fields — those will be fixed in Task 5.)

- [ ] **Step 6: Commit**

```bash
git add app/services/UserStore.ts tests/UserStore.test.ts tests/users.test.ts tests/opds.test.ts
git commit -m "refactor: UserStore accepts Database instance instead of dbPath"
```

---

## Task 5: Rewrite `BookStore` (TDD)

**Files:**
- Modify: `app/services/BookStore.ts`
- Modify: `tests/BookStore.test.ts`
- Modify: `tests/opds.test.ts` (fix book insertion for existing tests)
- Modify: `tests/ui.test.ts` (fix book insertion for existing tests)

- [ ] **Step 1: Write the failing tests in `tests/BookStore.test.ts`**

```typescript
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import Database from 'better-sqlite3';
import { BookStore } from '../app/services/BookStore';
import { EpubMeta } from '../app/types';

let booksDir: string;
let db: Database.Database;
let store: BookStore;

const noMeta: EpubMeta = {
  title: 'Test Book',
  author: 'Test Author',
  description: '',
  series: '',
  seriesIndex: 0,
  coverData: null,
  coverMime: null,
};

beforeEach(() => {
  booksDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hass-odps-books-'));
  db = new Database(':memory:');
  store = new BookStore(booksDir, db);
});

afterEach(() => {
  db.close();
  fs.rmSync(booksDir, { recursive: true });
});

describe('BookStore.listBooks', () => {
  it('returns empty array when no books added', () => {
    expect(store.listBooks()).toEqual([]);
  });

  it('returns books sorted by title', () => {
    const pathA = path.join(booksDir, 'z.epub');
    const pathB = path.join(booksDir, 'a.epub');
    fs.writeFileSync(pathA, 'x');
    fs.writeFileSync(pathB, 'x');
    const statA = fs.statSync(pathA);
    const statB = fs.statSync(pathB);
    store.addBook('a'.repeat(32), 'z.epub', pathA, statA.size, statA.mtime, { ...noMeta, title: 'Zebra' });
    store.addBook('b'.repeat(32), 'a.epub', pathB, statB.size, statB.mtime, { ...noMeta, title: 'Apple' });
    const books = store.listBooks();
    expect(books[0].title).toBe('Apple');
    expect(books[1].title).toBe('Zebra');
  });

  it('returns all Book fields correctly', () => {
    const bookPath = path.join(booksDir, 'dune.epub');
    fs.writeFileSync(bookPath, 'x');
    const stat = fs.statSync(bookPath);
    store.addBook('c'.repeat(32), 'dune.epub', bookPath, stat.size, stat.mtime, {
      title: 'Dune',
      author: 'Frank Herbert',
      description: 'Sci-fi epic',
      series: 'Dune Chronicles',
      seriesIndex: 1,
      coverData: null,
      coverMime: null,
    });
    const [book] = store.listBooks();
    expect(book.id).toBe('c'.repeat(32));
    expect(book.filename).toBe('dune.epub');
    expect(book.title).toBe('Dune');
    expect(book.author).toBe('Frank Herbert');
    expect(book.description).toBe('Sci-fi epic');
    expect(book.series).toBe('Dune Chronicles');
    expect(book.seriesIndex).toBe(1);
    expect(book.hasCover).toBe(false);
    expect(book.size).toBe(stat.size);
    expect(book.mtime).toBeInstanceOf(Date);
    expect(book.addedAt).toBeInstanceOf(Date);
  });
});

describe('BookStore.addBook', () => {
  it('uses filename stem as title fallback when title is empty', () => {
    const bookPath = path.join(booksDir, 'my-great-book.epub');
    fs.writeFileSync(bookPath, 'x');
    const stat = fs.statSync(bookPath);
    store.addBook('d'.repeat(32), 'my-great-book.epub', bookPath, stat.size, stat.mtime, {
      ...noMeta,
      title: '',
    });
    const [book] = store.listBooks();
    expect(book.title).toBe('my-great-book');
  });

  it('upserts on duplicate filename — updates metadata', () => {
    const bookPath = path.join(booksDir, 'book.epub');
    fs.writeFileSync(bookPath, 'x');
    const stat = fs.statSync(bookPath);
    store.addBook('e'.repeat(32), 'book.epub', bookPath, stat.size, stat.mtime, { ...noMeta, title: 'Old Title' });
    store.addBook('f'.repeat(32), 'book.epub', bookPath, stat.size, stat.mtime, { ...noMeta, title: 'New Title' });
    const books = store.listBooks();
    expect(books).toHaveLength(1);
    expect(books[0].title).toBe('New Title');
  });

  it('stores and reports hasCover correctly', () => {
    const bookPath = path.join(booksDir, 'book.epub');
    fs.writeFileSync(bookPath, 'x');
    const stat = fs.statSync(bookPath);
    store.addBook('g'.repeat(32), 'book.epub', bookPath, stat.size, stat.mtime, {
      ...noMeta,
      coverData: Buffer.from([0xff, 0xd8]),
      coverMime: 'image/jpeg',
    });
    const [book] = store.listBooks();
    expect(book.hasCover).toBe(true);
  });
});

describe('BookStore.getBookById', () => {
  it('returns the matching book', () => {
    const bookPath = path.join(booksDir, 'book.epub');
    fs.writeFileSync(bookPath, 'x');
    const stat = fs.statSync(bookPath);
    store.addBook('h'.repeat(32), 'book.epub', bookPath, stat.size, stat.mtime, noMeta);
    const book = store.getBookById('h'.repeat(32));
    expect(book).not.toBeNull();
    expect(book!.filename).toBe('book.epub');
  });

  it('returns null for unknown id', () => {
    expect(store.getBookById('0'.repeat(32))).toBeNull();
  });
});

describe('BookStore.getCover', () => {
  it('returns cover data and mime type', () => {
    const bookPath = path.join(booksDir, 'book.epub');
    fs.writeFileSync(bookPath, 'x');
    const stat = fs.statSync(bookPath);
    const fakeJpeg = Buffer.from([0xff, 0xd8, 0xff]);
    store.addBook('i'.repeat(32), 'book.epub', bookPath, stat.size, stat.mtime, {
      ...noMeta,
      coverData: fakeJpeg,
      coverMime: 'image/jpeg',
    });
    const cover = store.getCover('i'.repeat(32));
    expect(cover).not.toBeNull();
    expect(cover!.mime).toBe('image/jpeg');
    expect(cover!.data.slice(0, 3)).toEqual(fakeJpeg);
  });

  it('returns null when book has no cover', () => {
    const bookPath = path.join(booksDir, 'book.epub');
    fs.writeFileSync(bookPath, 'x');
    const stat = fs.statSync(bookPath);
    store.addBook('j'.repeat(32), 'book.epub', bookPath, stat.size, stat.mtime, noMeta);
    expect(store.getCover('j'.repeat(32))).toBeNull();
  });

  it('returns null for unknown id', () => {
    expect(store.getCover('0'.repeat(32))).toBeNull();
  });
});

describe('BookStore.deleteBook', () => {
  it('deletes the file and row, returns the deleted book', () => {
    const bookPath = path.join(booksDir, 'book.epub');
    fs.writeFileSync(bookPath, 'x');
    const stat = fs.statSync(bookPath);
    store.addBook('k'.repeat(32), 'book.epub', bookPath, stat.size, stat.mtime, noMeta);
    const deleted = store.deleteBook('k'.repeat(32));
    expect(deleted).not.toBeNull();
    expect(deleted!.filename).toBe('book.epub');
    expect(fs.existsSync(bookPath)).toBe(false);
    expect(store.getBookById('k'.repeat(32))).toBeNull();
  });

  it('returns null for unknown id', () => {
    expect(store.deleteBook('0'.repeat(32))).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --testPathPattern=BookStore
```

Expected: FAIL — existing BookStore tests reference old API.

- [ ] **Step 3: Rewrite `app/services/BookStore.ts`**

```typescript
import * as fs from 'fs';
import * as path from 'path';
import Database, { Database as DB } from 'better-sqlite3';
import { Book, EpubMeta } from '../types';

export class BookStore {
  constructor(private readonly booksDir: string, private readonly db: DB) {
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS books (
        id            TEXT    PRIMARY KEY,
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
    `);
  }

  getBooksDir(): string {
    return this.booksDir;
  }

  addBook(
    id: string,
    filename: string,
    filePath: string,
    size: number,
    mtime: Date,
    meta: EpubMeta
  ): Book {
    const title = meta.title.trim() || path.basename(filename, '.epub');
    const addedAt = Date.now();

    this.db.prepare(`
      INSERT INTO books (id, filename, path, title, author, description, series, series_index, cover_data, cover_mime, size, mtime, added_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (filename) DO UPDATE SET
        id           = excluded.id,
        path         = excluded.path,
        title        = excluded.title,
        author       = excluded.author,
        description  = excluded.description,
        series       = excluded.series,
        series_index = excluded.series_index,
        cover_data   = excluded.cover_data,
        cover_mime   = excluded.cover_mime,
        size         = excluded.size,
        mtime        = excluded.mtime,
        added_at     = excluded.added_at
    `).run(id, filename, filePath, title, meta.author, meta.description, meta.series, meta.seriesIndex, meta.coverData, meta.coverMime, size, mtime.getTime(), addedAt);

    return {
      id, filename, path: filePath, title,
      author: meta.author, description: meta.description,
      series: meta.series, seriesIndex: meta.seriesIndex,
      hasCover: meta.coverData !== null,
      size, mtime, addedAt: new Date(addedAt),
    };
  }

  listBooks(): Book[] {
    type Row = {
      id: string; filename: string; path: string; title: string;
      author: string; description: string; series: string; series_index: number;
      has_cover: number; size: number; mtime: number; added_at: number;
    };
    const rows = this.db.prepare(`
      SELECT id, filename, path, title, author, description, series, series_index,
             (cover_data IS NOT NULL) AS has_cover, size, mtime, added_at
      FROM books ORDER BY title ASC
    `).all() as Row[];

    return rows.map(r => ({
      id: r.id, filename: r.filename, path: r.path, title: r.title,
      author: r.author, description: r.description,
      series: r.series, seriesIndex: r.series_index,
      hasCover: r.has_cover === 1,
      size: r.size, mtime: new Date(r.mtime), addedAt: new Date(r.added_at),
    }));
  }

  getBookById(id: string): Book | null {
    type Row = {
      id: string; filename: string; path: string; title: string;
      author: string; description: string; series: string; series_index: number;
      has_cover: number; size: number; mtime: number; added_at: number;
    };
    const r = this.db.prepare(`
      SELECT id, filename, path, title, author, description, series, series_index,
             (cover_data IS NOT NULL) AS has_cover, size, mtime, added_at
      FROM books WHERE id = ?
    `).get(id) as Row | undefined;

    if (!r) return null;
    return {
      id: r.id, filename: r.filename, path: r.path, title: r.title,
      author: r.author, description: r.description,
      series: r.series, seriesIndex: r.series_index,
      hasCover: r.has_cover === 1,
      size: r.size, mtime: new Date(r.mtime), addedAt: new Date(r.added_at),
    };
  }

  getCover(id: string): { data: Buffer; mime: string } | null {
    const r = this.db.prepare('SELECT cover_data, cover_mime FROM books WHERE id = ?')
      .get(id) as { cover_data: Buffer | null; cover_mime: string | null } | undefined;
    if (!r?.cover_data || !r.cover_mime) return null;
    return { data: r.cover_data, mime: r.cover_mime };
  }

  deleteBook(id: string): Book | null {
    const book = this.getBookById(id);
    if (!book) return null;
    fs.unlinkSync(book.path);
    this.db.prepare('DELETE FROM books WHERE id = ?').run(id);
    return book;
  }
}
```

- [ ] **Step 4: Run BookStore tests to confirm they pass**

```bash
npm test -- --testPathPattern=BookStore
```

Expected: all 13 tests PASS.

- [ ] **Step 5: Fix `tests/opds.test.ts` — replace filesystem-based book setup with `addBook`**

The existing OPDS test cases that write files to booksDir must use `addBook`. Replace the two `describe` blocks that write files (`GET /opds/books` and `GET /opds/books/:id/download`):

```typescript
describe('GET /opds/books', () => {
  it('returns an empty feed when no books exist', async () => {
    const res = await request(app).get('/opds/books').set(basicAuth('alice', 'secret'));
    expect(res.status).toBe(200);
    expect(res.text).toContain('<feed');
  });

  it('includes an entry for each book', async () => {
    const bookPath = path.join(booksDir, 'My Book.epub');
    fs.writeFileSync(bookPath, 'x');
    const stat = fs.statSync(bookPath);
    bookStore.addBook('a'.repeat(32), 'My Book.epub', bookPath, stat.size, stat.mtime, {
      title: 'My Book', author: '', description: '', series: '', seriesIndex: 0, coverData: null, coverMime: null,
    });
    const res = await request(app).get('/opds/books').set(basicAuth('alice', 'secret'));
    expect(res.text).toContain('My Book');
    expect(res.text).toContain('opds-spec.org/acquisition');
  });

  it('escapes special characters in titles', async () => {
    const bookPath = path.join(booksDir, 'A & B Test.epub');
    fs.writeFileSync(bookPath, 'x');
    const stat = fs.statSync(bookPath);
    bookStore.addBook('b'.repeat(32), 'A & B Test.epub', bookPath, stat.size, stat.mtime, {
      title: 'A & B <Test>', author: '', description: '', series: '', seriesIndex: 0, coverData: null, coverMime: null,
    });
    const res = await request(app).get('/opds/books').set(basicAuth('alice', 'secret'));
    expect(res.text).toContain('A &amp; B &lt;Test&gt;');
    expect(res.text).not.toContain('<Test>');
  });
});

describe('GET /opds/books/:id/download', () => {
  it('returns 404 for unknown book id', async () => {
    const res = await request(app)
      .get('/opds/books/' + '0'.repeat(32) + '/download')
      .set(basicAuth('alice', 'secret'));
    expect(res.status).toBe(404);
  });

  it('returns the file with correct content type', async () => {
    const bookPath = path.join(booksDir, 'book.epub');
    fs.writeFileSync(bookPath, 'epub-content');
    const stat = fs.statSync(bookPath);
    bookStore.addBook('c'.repeat(32), 'book.epub', bookPath, stat.size, stat.mtime, {
      title: 'Book', author: '', description: '', series: '', seriesIndex: 0, coverData: null, coverMime: null,
    });
    const res = await request(app)
      .get('/opds/books/' + 'c'.repeat(32) + '/download')
      .set(basicAuth('alice', 'secret'));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/epub/);
  });
});
```

- [ ] **Step 6: Fix `tests/ui.test.ts` — update constructor and book setup**

Replace `beforeEach`/`afterEach` and the `GET /api/books` + `DELETE` tests to use the new API:

```typescript
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import request from 'supertest';
import express from 'express';
import session from 'express-session';
import Database from 'better-sqlite3';
import { BookStore } from '../app/services/BookStore';
import { createUiRouter } from '../app/routes/ui';
import { AppConfig, EpubMeta } from '../app/types';

let booksDir: string;
let db: Database.Database;
let bookStore: BookStore;
let app: express.Express;

const config: AppConfig = {
  username: 'admin',
  password: 'pass',
  booksDir: '',
  dataDir: '/tmp',
  port: 3000,
};

const noMeta: EpubMeta = {
  title: 'Test Book',
  author: '',
  description: '',
  series: '',
  seriesIndex: 0,
  coverData: null,
  coverMime: null,
};

async function authenticatedAgent() {
  const agent = request.agent(app);
  await agent
    .post('/login')
    .send('username=admin&password=pass')
    .set('Content-Type', 'application/x-www-form-urlencoded');
  return agent;
}

beforeEach(() => {
  booksDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hass-odps-ui-'));
  db = new Database(':memory:');
  bookStore = new BookStore(booksDir, db);

  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(session({ secret: 'test-secret', resave: false, saveUninitialized: false }));
  app.use('/', createUiRouter(bookStore, { ...config, booksDir }));
});

afterEach(() => {
  db.close();
  fs.rmSync(booksDir, { recursive: true });
});

describe('GET /', () => {
  it('redirects to /login without a session', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });

  it('returns 200 with a valid session', async () => {
    const agent = await authenticatedAgent();
    const res = await agent.get('/');
    expect(res.status).toBe(200);
  });
});

describe('POST /login', () => {
  it('redirects to / on correct credentials', async () => {
    const res = await request(app)
      .post('/login')
      .send('username=admin&password=pass')
      .set('Content-Type', 'application/x-www-form-urlencoded');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/');
  });

  it('returns 401 on wrong password', async () => {
    const res = await request(app)
      .post('/login')
      .send('username=admin&password=wrong')
      .set('Content-Type', 'application/x-www-form-urlencoded');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/books', () => {
  it('returns 302 without session', async () => {
    const res = await request(app).get('/api/books');
    expect(res.status).toBe(302);
  });

  it('returns JSON array of books with enriched fields', async () => {
    const bookPath = path.join(booksDir, 'book.epub');
    fs.writeFileSync(bookPath, 'x');
    const stat = fs.statSync(bookPath);
    bookStore.addBook('a'.repeat(32), 'book.epub', bookPath, stat.size, stat.mtime, {
      ...noMeta, title: 'Test Book', author: 'Test Author',
    });
    const agent = await authenticatedAgent();
    const res = await agent.get('/api/books');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].filename).toBe('book.epub');
    expect(res.body[0].author).toBe('Test Author');
    expect(res.body[0].hasCover).toBe(false);
  });
});

describe('POST /api/books/upload', () => {
  it('rejects non-epub file types', async () => {
    const agent = await authenticatedAgent();
    const res = await agent
      .post('/api/books/upload')
      .attach('files', Buffer.from('not an epub'), 'notes.txt');
    expect(res.status).toBe(400);
  });

  it('rejects pdf files', async () => {
    const agent = await authenticatedAgent();
    const res = await agent
      .post('/api/books/upload')
      .attach('files', Buffer.from('%PDF-1.4'), 'manual.pdf');
    expect(res.status).toBe(400);
  });

  it('returns 400 when uploaded epub is not a valid ZIP', async () => {
    const agent = await authenticatedAgent();
    const res = await agent
      .post('/api/books/upload')
      .attach('files', Buffer.from('not a real epub'), 'bad.epub');
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});

describe('DELETE /api/books/:id', () => {
  it('deletes a book and returns 204', async () => {
    const bookPath = path.join(booksDir, 'book.epub');
    fs.writeFileSync(bookPath, 'x');
    const stat = fs.statSync(bookPath);
    bookStore.addBook('b'.repeat(32), 'book.epub', bookPath, stat.size, stat.mtime, noMeta);

    const agent = await authenticatedAgent();
    const res = await agent.delete('/api/books/' + 'b'.repeat(32));
    expect(res.status).toBe(204);
    expect(fs.existsSync(bookPath)).toBe(false);
  });

  it('returns 404 for unknown book id', async () => {
    const agent = await authenticatedAgent();
    const res = await agent.delete('/api/books/' + '0'.repeat(32));
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 7: Run all tests**

```bash
npm test
```

Expected: all tests PASS.

- [ ] **Step 8: Commit**

```bash
git add app/services/BookStore.ts tests/BookStore.test.ts tests/opds.test.ts tests/ui.test.ts
git commit -m "feat: BookStore — SQLite-backed with addBook, getCover, KoReader-compatible IDs"
```

---

## Task 6: Wire Shared Database in `app/index.ts`

**Files:**
- Modify: `app/index.ts`

- [ ] **Step 1: Update `app/index.ts`**

```typescript
import * as fs from 'fs';
import * as path from 'path';
import Database from 'better-sqlite3';
import { loadConfig } from './config';
import { UserStore } from './services/UserStore';
import { BookStore } from './services/BookStore';
import { createApp } from './app';
import { logger } from './logger';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version } = require('../package.json') as { version: string };

const log = logger('Server');
const config = loadConfig();

fs.mkdirSync(config.booksDir, { recursive: true });
fs.mkdirSync(config.dataDir, { recursive: true });

const db = new Database(path.join(config.dataDir, 'db.sqlite'));
const userStore = new UserStore(db);
const bookStore = new BookStore(config.booksDir, db);

const app = createApp(config, userStore, bookStore);

const shutdown = (): void => {
  log.info('Server shutting down');
  db.close();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

app.listen(config.port, () => {
  log.info(`HASS-ODPS v${version} starting — port: ${config.port}, booksDir: ${config.booksDir}, dataDir: ${config.dataDir}`);
  log.info(`Web UI:  http://localhost:${config.port}/`);
  log.info(`OPDS:    http://localhost:${config.port}/opds/`);
  log.info(`KOSync:  http://localhost:${config.port}/kosync/`);
});
```

- [ ] **Step 2: Build and verify**

```bash
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add app/index.ts
git commit -m "feat: wire shared SQLite Database instance through index.ts"
```

---

## Task 7: Update OPDS Routes + Tests (TDD)

**Files:**
- Modify: `app/routes/opds.ts`
- Modify: `tests/opds.test.ts`

- [ ] **Step 1: Add new failing tests to `tests/opds.test.ts`**

Append these `describe` blocks after the existing ones:

```typescript
describe('GET /opds/books — enriched entries', () => {
  it('includes author element when author is set', async () => {
    const bookPath = path.join(booksDir, 'dune.epub');
    fs.writeFileSync(bookPath, 'x');
    const stat = fs.statSync(bookPath);
    bookStore.addBook('d'.repeat(32), 'dune.epub', bookPath, stat.size, stat.mtime, {
      title: 'Dune', author: 'Frank Herbert', description: 'Sci-fi epic',
      series: '', seriesIndex: 0, coverData: null, coverMime: null,
    });
    const res = await request(app).get('/opds/books').set(basicAuth('alice', 'secret'));
    expect(res.text).toContain('<name>Frank Herbert</name>');
    expect(res.text).toContain('Sci-fi epic');
  });

  it('includes cover image link when hasCover is true', async () => {
    const bookPath = path.join(booksDir, 'covered.epub');
    fs.writeFileSync(bookPath, 'x');
    const stat = fs.statSync(bookPath);
    bookStore.addBook('e'.repeat(32), 'covered.epub', bookPath, stat.size, stat.mtime, {
      title: 'Covered', author: '', description: '',
      series: '', seriesIndex: 0,
      coverData: Buffer.from([0xff, 0xd8]),
      coverMime: 'image/jpeg',
    });
    const res = await request(app).get('/opds/books').set(basicAuth('alice', 'secret'));
    expect(res.text).toContain('opds-spec.org/image');
    expect(res.text).toContain('/opds/books/' + 'e'.repeat(32) + '/cover');
  });

  it('omits cover link when hasCover is false', async () => {
    const bookPath = path.join(booksDir, 'nocover.epub');
    fs.writeFileSync(bookPath, 'x');
    const stat = fs.statSync(bookPath);
    bookStore.addBook('f'.repeat(32), 'nocover.epub', bookPath, stat.size, stat.mtime, {
      title: 'No Cover', author: '', description: '',
      series: '', seriesIndex: 0, coverData: null, coverMime: null,
    });
    const res = await request(app).get('/opds/books').set(basicAuth('alice', 'secret'));
    expect(res.text).not.toContain('opds-spec.org/image');
  });
});

describe('GET /opds/books/:id/cover', () => {
  it('returns 404 for unknown id', async () => {
    const res = await request(app)
      .get('/opds/books/' + '0'.repeat(32) + '/cover')
      .set(basicAuth('alice', 'secret'));
    expect(res.status).toBe(404);
  });

  it('returns 404 when book has no cover', async () => {
    const bookPath = path.join(booksDir, 'nocover.epub');
    fs.writeFileSync(bookPath, 'x');
    const stat = fs.statSync(bookPath);
    bookStore.addBook('g'.repeat(32), 'nocover.epub', bookPath, stat.size, stat.mtime, {
      title: 'No Cover', author: '', description: '',
      series: '', seriesIndex: 0, coverData: null, coverMime: null,
    });
    const res = await request(app)
      .get('/opds/books/' + 'g'.repeat(32) + '/cover')
      .set(basicAuth('alice', 'secret'));
    expect(res.status).toBe(404);
  });

  it('returns cover bytes with correct content type', async () => {
    const bookPath = path.join(booksDir, 'covered.epub');
    fs.writeFileSync(bookPath, 'x');
    const stat = fs.statSync(bookPath);
    const fakeJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    bookStore.addBook('h'.repeat(32), 'covered.epub', bookPath, stat.size, stat.mtime, {
      title: 'Covered', author: '', description: '',
      series: '', seriesIndex: 0,
      coverData: fakeJpeg,
      coverMime: 'image/jpeg',
    });
    const res = await request(app)
      .get('/opds/books/' + 'h'.repeat(32) + '/cover')
      .set(basicAuth('alice', 'secret'));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/image\/jpeg/);
  });

  it('returns 401 without credentials', async () => {
    const res = await request(app).get('/opds/books/' + '0'.repeat(32) + '/cover');
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run to confirm new tests fail**

```bash
npm test -- --testPathPattern=opds
```

Expected: existing tests PASS, new `enriched entries` and `cover` tests FAIL.

- [ ] **Step 3: Rewrite `app/routes/opds.ts`**

```typescript
import { Router, Request, Response } from 'express';
import { BookStore } from '../services/BookStore';
import { UserStore } from '../services/UserStore';
import { Book } from '../types';
import { opdsAuth } from '../middleware/auth';
import { logger } from '../logger';

const log = logger('OPDS');

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function decodeBasicUser(authHeader: string): string {
  const decoded = Buffer.from(authHeader.slice(6), 'base64').toString();
  return decoded.slice(0, decoded.indexOf(':'));
}

function rootFeed(baseUrl: string): string {
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:opds="http://opds-spec.org/2010/catalog">
  <id>urn:hass-odps:root</id>
  <title>HASS-ODPS Library</title>
  <updated>${now}</updated>
  <link rel="self" href="${baseUrl}/opds/" type="application/atom+xml;profile=opds-catalog;kind=navigation"/>
  <link rel="start" href="${baseUrl}/opds/" type="application/atom+xml;profile=opds-catalog;kind=navigation"/>
  <entry>
    <title>All Books</title>
    <id>urn:hass-odps:books</id>
    <updated>${now}</updated>
    <content type="text">Browse all books in the library</content>
    <link rel="subsection" href="${baseUrl}/opds/books" type="application/atom+xml;profile=opds-catalog;kind=acquisition"/>
  </entry>
</feed>`;
}

function bookEntry(b: Book, baseUrl: string): string {
  const authorXml = b.author ? `\n    <author><name>${escapeXml(b.author)}</name></author>` : '';
  const summaryXml = b.description ? `\n    <summary>${escapeXml(b.description)}</summary>` : '';
  const coverXml = b.hasCover
    ? `\n    <link rel="http://opds-spec.org/image" href="${baseUrl}/opds/books/${b.id}/cover" type="image/jpeg"/>`
    : '';
  return `  <entry>
    <title>${escapeXml(b.title)}</title>
    <id>urn:hass-odps:book:${b.id}</id>
    <updated>${b.mtime.toISOString()}</updated>${authorXml}${summaryXml}${coverXml}
    <link rel="http://opds-spec.org/acquisition"
          href="${baseUrl}/opds/books/${b.id}/download"
          type="application/epub+zip"
          title="${escapeXml(b.filename)}"/>
  </entry>`;
}

function booksFeed(books: Book[], baseUrl: string): string {
  const now = new Date().toISOString();
  const entries = books.map(b => bookEntry(b, baseUrl)).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:opds="http://opds-spec.org/2010/catalog">
  <id>urn:hass-odps:books</id>
  <title>All Books</title>
  <updated>${now}</updated>
  <link rel="self" href="${baseUrl}/opds/books" type="application/atom+xml;profile=opds-catalog;kind=acquisition"/>
  <link rel="start" href="${baseUrl}/opds/" type="application/atom+xml;profile=opds-catalog;kind=navigation"/>
${entries}
</feed>`;
}

export function createOpdsRouter(bookStore: BookStore, userStore: UserStore): Router {
  const router = Router();
  const auth = opdsAuth(userStore);

  router.get('/', auth, (req: Request, res: Response) => {
    log.debug('Root catalog served');
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    res.set('Content-Type', 'application/atom+xml;charset=utf-8');
    res.send(rootFeed(baseUrl));
  });

  router.get('/books', auth, (req: Request, res: Response) => {
    const books = bookStore.listBooks();
    log.debug(`Books feed served (${books.length} books)`);
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    res.set('Content-Type', 'application/atom+xml;charset=utf-8');
    res.send(booksFeed(books, baseUrl));
  });

  router.get('/books/:id/cover', auth, (req: Request, res: Response) => {
    const cover = bookStore.getCover(req.params.id);
    if (!cover) {
      res.status(404).send('Not found');
      return;
    }
    res.set('Content-Type', cover.mime);
    res.send(cover.data);
  });

  router.get('/books/:id/download', auth, (req: Request, res: Response) => {
    const book = bookStore.getBookById(req.params.id);
    if (!book) {
      log.warn(`Download requested for unknown book ID: ${req.params.id}`);
      res.status(404).send('Not found');
      return;
    }
    const username = decodeBasicUser(req.headers.authorization!);
    log.info(`User "${username}" downloaded "${book.filename}"`);
    res.set('Content-Type', 'application/epub+zip');
    res.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(book.filename)}`);
    res.sendFile(book.path);
  });

  return router;
}
```

- [ ] **Step 4: Run tests to confirm all pass**

```bash
npm test -- --testPathPattern=opds
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/routes/opds.ts tests/opds.test.ts
git commit -m "feat: OPDS feed includes author, description, cover link; adds cover endpoint"
```

---

## Task 8: Update UI Routes + Tests (TDD)

**Files:**
- Modify: `app/routes/ui.ts`
- Modify: `tests/ui.test.ts`

- [ ] **Step 1: Add new failing upload test to `tests/ui.test.ts`**

Add this helper and describe block (after the existing DELETE describe):

```typescript
import AdmZip from 'adm-zip';

function makeMinimalEpub(title = 'Test'): Buffer {
  const zip = new AdmZip();
  zip.addFile('mimetype', Buffer.from('application/epub+zip'));
  zip.addFile('META-INF/container.xml', Buffer.from(
    `<?xml version="1.0"?><container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`
  ));
  zip.addFile('OEBPS/content.opf', Buffer.from(
    `<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="2.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${title}</dc:title><dc:creator>Test Author</dc:creator></metadata><manifest/></package>`
  ));
  return zip.toBuffer();
}

describe('POST /api/books/upload — valid epub', () => {
  it('parses metadata and adds book to SQLite', async () => {
    const agent = await authenticatedAgent();
    const res = await agent
      .post('/api/books/upload')
      .attach('files', makeMinimalEpub('My Novel'), 'my-novel.epub');
    expect(res.status).toBe(200);
    expect(res.body.uploaded).toContain('my-novel.epub');
    expect(fs.existsSync(path.join(booksDir, 'my-novel.epub'))).toBe(true);
    // Book should be in SQLite with correct title
    const books = bookStore.listBooks();
    expect(books).toHaveLength(1);
    expect(books[0].title).toBe('My Novel');
    expect(books[0].author).toBe('Test Author');
  });

  it('book id matches KoReader partial MD5 of the saved file', async () => {
    const { partialMD5 } = await import('../app/services/EpubParser');
    const agent = await authenticatedAgent();
    await agent
      .post('/api/books/upload')
      .attach('files', makeMinimalEpub('Dune'), 'dune.epub');
    const savedPath = path.join(booksDir, 'dune.epub');
    const expectedId = partialMD5(savedPath);
    const books = bookStore.listBooks();
    expect(books[0].id).toBe(expectedId);
  });
});

describe('GET /api/books/:id/cover', () => {
  it('returns 404 for unknown id', async () => {
    const agent = await authenticatedAgent();
    const res = await agent.get('/api/books/' + '0'.repeat(32) + '/cover');
    expect(res.status).toBe(404);
  });

  it('returns cover image when present', async () => {
    const bookPath = path.join(booksDir, 'covered.epub');
    fs.writeFileSync(bookPath, 'x');
    const stat = fs.statSync(bookPath);
    const fakeJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    bookStore.addBook('z'.repeat(32), 'covered.epub', bookPath, stat.size, stat.mtime, {
      ...noMeta,
      coverData: fakeJpeg,
      coverMime: 'image/jpeg',
    });
    const agent = await authenticatedAgent();
    const res = await agent.get('/api/books/' + 'z'.repeat(32) + '/cover');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/image\/jpeg/);
  });

  it('returns 302 without session', async () => {
    const res = await request(app).get('/api/books/' + '0'.repeat(32) + '/cover');
    expect(res.status).toBe(302);
  });
});
```

- [ ] **Step 2: Run to confirm new tests fail**

```bash
npm test -- --testPathPattern=ui
```

Expected: existing tests PASS; new `valid epub` and `cover` tests FAIL.

- [ ] **Step 3: Rewrite `app/routes/ui.ts`**

```typescript
import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { BookStore } from '../services/BookStore';
import { AppConfig } from '../types';
import { sessionAuth } from '../middleware/auth';
import { parseEpub, partialMD5 } from '../services/EpubParser';
import { logger } from '../logger';

const log = logger('UI');

const ALLOWED_EXTENSIONS = new Set(['.epub']);

function loginPage(error?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HASS-ODPS Login</title>
  <style>
    *{box-sizing:border-box}
    body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f3f4f6}
    form{background:#fff;padding:2rem;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.1);width:320px}
    h1{margin:0 0 1.5rem;font-size:1.25rem;color:#111}
    label{display:block;margin-bottom:.25rem;font-size:.875rem;color:#374151}
    input{width:100%;padding:.5rem .75rem;margin-bottom:1rem;border:1px solid #d1d5db;border-radius:4px;font-size:1rem}
    button{width:100%;padding:.625rem;background:#2563eb;color:#fff;border:none;border-radius:4px;font-size:1rem;cursor:pointer}
    button:hover{background:#1d4ed8}
    .error{color:#dc2626;font-size:.875rem;margin-bottom:1rem}
  </style>
</head>
<body>
  <form method="POST" action="/login">
    <h1>📚 HASS-ODPS</h1>
    ${error ? `<p class="error">${error}</p>` : ''}
    <label for="u">Username</label>
    <input id="u" name="username" type="text" required autofocus>
    <label for="p">Password</label>
    <input id="p" name="password" type="password" required>
    <button type="submit">Sign In</button>
  </form>
</body>
</html>`;
}

export function createUiRouter(bookStore: BookStore, config: AppConfig): Router {
  const router = Router();

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, bookStore.getBooksDir()),
    filename: (_req, file, cb) => cb(null, file.originalname),
  });

  const upload = multer({
    storage,
    fileFilter: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, ALLOWED_EXTENSIONS.has(ext));
    },
  });

  // ── Auth ──────────────────────────────────────────────

  router.get('/login', (req: Request, res: Response) => {
    if (req.session.authenticated) { res.redirect('/'); return; }
    res.send(loginPage());
  });

  router.post('/login', (req: Request, res: Response) => {
    const { username, password } = req.body as { username?: string; password?: string };
    if (username === config.username && password === config.password) {
      req.session.authenticated = true;
      log.info(`User "${username}" logged in`);
      res.redirect('/');
    } else {
      log.warn(`Login failed for username "${username ?? ''}"`);
      res.status(401).send(loginPage('Invalid credentials'));
    }
  });

  router.post('/logout', (req: Request, res: Response) => {
    log.info('User logged out');
    req.session.destroy(() => res.redirect('/login'));
  });

  // ── Protected ─────────────────────────────────────────

  router.get('/', sessionAuth, (_req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });

  router.get('/api/books', sessionAuth, (_req: Request, res: Response) => {
    res.json(
      bookStore.listBooks().map(b => ({
        id: b.id,
        title: b.title,
        author: b.author,
        series: b.series,
        seriesIndex: b.seriesIndex,
        filename: b.filename,
        size: b.size,
        hasCover: b.hasCover,
      }))
    );
  });

  router.get('/api/books/:id/cover', sessionAuth, (req: Request, res: Response) => {
    const cover = bookStore.getCover(req.params.id);
    if (!cover) {
      res.status(404).send('Not found');
      return;
    }
    res.set('Content-Type', cover.mime);
    res.send(cover.data);
  });

  router.post('/api/books/upload', sessionAuth, upload.array('files'), (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files?.length) {
      log.warn('Upload rejected — no valid files (supported: epub)');
      res.status(400).json({ error: 'No valid files uploaded. Supported: epub' });
      return;
    }

    const uploaded: string[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        const meta = parseEpub(file.path);
        const id = partialMD5(file.path);
        const stat = fs.statSync(file.path);
        bookStore.addBook(id, file.originalname, file.path, stat.size, stat.mtime, meta);
        uploaded.push(file.originalname);
        log.info(`Book uploaded and parsed: "${file.originalname}" (id: ${id})`);
      } catch (err) {
        fs.unlinkSync(file.path);
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${file.originalname}: ${msg}`);
        log.warn(`Failed to parse uploaded EPUB "${file.originalname}": ${msg}`);
      }
    }

    if (uploaded.length === 0) {
      res.status(400).json({ error: `Failed to process: ${errors.join('; ')}` });
      return;
    }

    res.json({ uploaded });
  });

  router.delete('/api/books/:id', sessionAuth, (req: Request, res: Response) => {
    const deleted = bookStore.deleteBook(req.params.id);
    if (!deleted) {
      log.warn(`Delete attempted for unknown book ID: ${req.params.id}`);
      res.status(404).json({ error: 'Book not found' });
      return;
    }
    log.info(`Book deleted: "${deleted.filename}"`);
    res.status(204).send();
  });

  return router;
}
```

- [ ] **Step 4: Run all tests**

```bash
npm test
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/routes/ui.ts tests/ui.test.ts
git commit -m "feat: UI routes — epub-only upload with EPUB parsing, cover endpoint, enriched book list"
```

---

## Task 9: Update Frontend

**Files:**
- Modify: `app/public/index.html`

- [ ] **Step 1: Rewrite `app/public/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HASS-ODPS Library</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,sans-serif;background:#f3f4f6;color:#111;min-height:100vh}
    header{background:#1e40af;color:#fff;padding:1rem 1.5rem;display:flex;align-items:center;justify-content:space-between}
    header h1{font-size:1.25rem}
    .signout{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.5);border-radius:4px;padding:.375rem .75rem;cursor:pointer;font-size:.875rem}
    .signout:hover{background:rgba(255,255,255,.1)}
    main{max-width:800px;margin:2rem auto;padding:0 1rem}
    /* Tab bar */
    #tab-bar{display:flex;border-bottom:2px solid #e5e7eb;margin-bottom:1.5rem}
    .tab{background:transparent;border:none;padding:.625rem 1.25rem;cursor:pointer;font-size:.9rem;color:#6b7280;border-bottom:2px solid transparent;margin-bottom:-2px;font-family:inherit}
    .tab.active{color:#1e40af;border-bottom-color:#1e40af;font-weight:500}
    .tab:hover:not(.active){color:#374151}
    /* Drop zone */
    #drop-zone{border:2px dashed #93c5fd;border-radius:8px;padding:2rem;text-align:center;cursor:pointer;background:#eff6ff;margin-bottom:2rem;transition:background .15s}
    #drop-zone.over{background:#dbeafe;border-color:#3b82f6}
    #drop-zone p{color:#1d4ed8;margin-bottom:.5rem}
    #drop-zone small{color:#6b7280}
    #file-input{display:none}
    #upload-status{margin-top:.75rem;font-size:.875rem;min-height:1.25rem}
    .status-ok{color:#16a34a}
    .status-err{color:#dc2626}
    /* Book list */
    #book-list{list-style:none}
    #book-list li{background:#fff;border-radius:6px;padding:.75rem 1rem;margin-bottom:.5rem;display:flex;align-items:center;gap:.875rem;box-shadow:0 1px 3px rgba(0,0,0,.07)}
    .book-cover{width:40px;height:56px;object-fit:cover;border-radius:3px;flex-shrink:0;background:#e5e7eb}
    .book-cover-placeholder{width:40px;height:56px;border-radius:3px;flex-shrink:0;background:#e5e7eb;display:flex;align-items:center;justify-content:center;font-size:1.25rem;color:#9ca3af}
    .book-info{flex:1;min-width:0}
    .book-title{font-weight:500;margin-bottom:.125rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .book-author{font-size:.8rem;color:#374151;margin-bottom:.125rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .book-meta{font-size:.75rem;color:#6b7280}
    .delete-btn{background:transparent;border:none;cursor:pointer;color:#9ca3af;font-size:1.1rem;padding:.25rem .5rem;border-radius:4px;transition:color .15s;flex-shrink:0}
    .delete-btn:hover{color:#dc2626}
    #empty-msg{color:#6b7280;text-align:center;padding:2rem}
    /* Users */
    #user-list{list-style:none}
    #users-empty{color:#6b7280;text-align:center;padding:2rem}
    .user-row{background:#fff;border-radius:6px;margin-bottom:.5rem;box-shadow:0 1px 3px rgba(0,0,0,.07);overflow:hidden}
    .user-header{display:flex;align-items:center;gap:.5rem;padding:.75rem 1rem;cursor:pointer;user-select:none}
    .user-header:hover{background:#f9fafb}
    .user-chevron{font-size:.7rem;color:#9ca3af;width:12px;flex-shrink:0}
    .user-name{flex:1;font-weight:500}
    .user-meta{font-size:.75rem;color:#6b7280}
    .progress-list{list-style:none;background:#f8fafc;border-top:1px solid #e5e7eb}
    .progress-item{display:grid;grid-template-columns:1fr auto;gap:.25rem .75rem;padding:.5rem 1rem .5rem 2.25rem;border-bottom:1px solid #eef2f7}
    .progress-item:last-child{border-bottom:none}
    .prog-doc{font-size:.8rem;color:#374151;grid-column:1;word-break:break-all}
    .prog-pct{font-size:.8rem;color:#16a34a;font-weight:500;grid-column:2;text-align:right;white-space:nowrap}
    .prog-meta{font-size:.7rem;color:#9ca3af;grid-column:1/3}
    .progress-empty{padding:.5rem 1rem .5rem 2.25rem;font-size:.8rem;color:#9ca3af;display:block}
  </style>
</head>
<body>
  <header>
    <h1>📚 HASS-ODPS Library</h1>
    <form method="POST" action="/logout" style="margin:0">
      <button class="signout">Sign Out</button>
    </form>
  </header>

  <nav id="tab-bar">
    <button class="tab active" data-tab="library">Library</button>
    <button class="tab" data-tab="users">Users</button>
  </nav>

  <main>
    <div id="library-section">
      <div id="drop-zone">
        <input type="file" id="file-input" accept=".epub" multiple>
        <p>Drop books here or <label for="file-input" style="text-decoration:underline;cursor:pointer">click to upload</label></p>
        <small>Supported format: epub</small>
        <div id="upload-status"></div>
      </div>
      <ul id="book-list"></ul>
      <p id="empty-msg" style="display:none">No books yet. Upload some above.</p>
    </div>

    <div id="users-section" style="display:none">
      <ul id="user-list"></ul>
      <p id="users-empty" style="display:none">No KOSync users registered yet.</p>
    </div>
  </main>

  <script>
    // ── Tabs ──────────────────────────────────────────────
    const librarySection = document.getElementById('library-section');
    const usersSection = document.getElementById('users-section');
    let usersLoaded = false;

    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const name = tab.dataset.tab;
        librarySection.style.display = name === 'library' ? '' : 'none';
        usersSection.style.display = name === 'users' ? '' : 'none';
        if (name === 'users' && !usersLoaded) loadUsers();
      });
    });

    // ── Library ───────────────────────────────────────────
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const bookList = document.getElementById('book-list');
    const uploadStatus = document.getElementById('upload-status');
    const emptyMsg = document.getElementById('empty-msg');

    function esc(s) {
      return String(s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function formatSize(bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    function bookCoverEl(book) {
      if (book.hasCover) {
        return `<img class="book-cover" src="/api/books/${esc(book.id)}/cover" alt="" loading="lazy">`;
      }
      return `<div class="book-cover-placeholder">📖</div>`;
    }

    function seriesLine(book) {
      if (!book.series) return '';
      const idx = book.seriesIndex > 0 ? ` #${book.seriesIndex % 1 === 0 ? book.seriesIndex : book.seriesIndex.toFixed(1)}` : '';
      return `<div class="book-meta" style="color:#6366f1">${esc(book.series)}${idx}</div>`;
    }

    async function loadBooks() {
      try {
        const res = await fetch('/api/books');
        if (!res.ok) { emptyMsg.style.display = ''; return; }
        const books = await res.json();
        bookList.innerHTML = '';
        if (books.length === 0) {
          emptyMsg.style.display = '';
        } else {
          emptyMsg.style.display = 'none';
          books.forEach(book => {
            const li = document.createElement('li');
            li.innerHTML = `
              ${bookCoverEl(book)}
              <div class="book-info">
                <div class="book-title">${esc(book.title)}</div>
                ${book.author ? `<div class="book-author">${esc(book.author)}</div>` : ''}
                ${seriesLine(book)}
                <div class="book-meta">EPUB · ${formatSize(book.size)}</div>
              </div>
              <button class="delete-btn" type="button" title="Delete">🗑</button>
            `;
            li.querySelector('.delete-btn').addEventListener('click', () => deleteBook(book.id, book.title));
            bookList.appendChild(li);
          });
        }
      } catch {
        emptyMsg.style.display = '';
      }
    }

    async function deleteBook(id, title) {
      if (!confirm(`Delete "${esc(title)}"?`)) return;
      const res = await fetch(`/api/books/${id}`, { method: 'DELETE' });
      if (res.status === 204) {
        await loadBooks();
      } else {
        alert('Failed to delete book.');
      }
    }

    async function uploadFiles(files) {
      if (!files.length) return;
      uploadStatus.textContent = `Uploading ${files.length} file(s)…`;
      uploadStatus.className = '';
      const fd = new FormData();
      for (const f of files) fd.append('files', f);
      try {
        const res = await fetch('/api/books/upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (res.ok) {
          uploadStatus.textContent = `✓ Uploaded: ${data.uploaded.join(', ')}`;
          uploadStatus.className = 'status-ok';
          await loadBooks();
        } else {
          uploadStatus.textContent = `✗ ${data.error}`;
          uploadStatus.className = 'status-err';
        }
      } catch {
        uploadStatus.textContent = '✗ Upload failed.';
        uploadStatus.className = 'status-err';
      }
    }

    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('over'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('over'));
    dropZone.addEventListener('drop', e => {
      e.preventDefault();
      dropZone.classList.remove('over');
      uploadFiles(e.dataTransfer.files);
    });
    fileInput.addEventListener('change', () => { uploadFiles(fileInput.files); fileInput.value = ''; });

    // ── Users ─────────────────────────────────────────────
    const userList = document.getElementById('user-list');
    const usersEmpty = document.getElementById('users-empty');
    const expandedData = {};

    function relativeTime(timestamp) {
      const diff = Math.floor(Date.now() / 1000) - timestamp;
      if (diff < 60) return 'just now';
      if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
      if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
      return Math.floor(diff / 86400) + 'd ago';
    }

    async function loadUsers() {
      try {
        const res = await fetch('/api/users');
        if (!res.ok) { usersLoaded = false; return; }
        const users = await res.json();
        usersLoaded = true;
        renderUsers(users);
      } catch {
        usersLoaded = false;
      }
    }

    function renderUsers(users) {
      userList.innerHTML = '';
      if (users.length === 0) { usersEmpty.style.display = ''; return; }
      usersEmpty.style.display = 'none';
      users.forEach(u => {
        const li = document.createElement('li');
        li.className = 'user-row';
        li.innerHTML = `
          <div class="user-header">
            <span class="user-chevron">▶</span>
            <span class="user-name">${esc(u.username)}</span>
            <span class="user-meta">${esc(u.progressCount)} synced</span>
            <button class="delete-btn" type="button" title="Delete user">🗑</button>
          </div>
          <ul class="progress-list" style="display:none"></ul>
        `;
        li.querySelector('.user-header').addEventListener('click', e => {
          if (e.target.closest('.delete-btn')) return;
          toggleUser(u.username, li);
        });
        li.querySelector('.delete-btn').addEventListener('click', () => deleteUser(u.username, li));
        userList.appendChild(li);
      });
    }

    async function toggleUser(username, li) {
      const progressList = li.querySelector('.progress-list');
      const chevron = li.querySelector('.user-chevron');
      if (progressList.style.display !== 'none') {
        progressList.style.display = 'none'; chevron.textContent = '▶'; return;
      }
      if (!expandedData[username]) {
        const res = await fetch(`/api/users/${encodeURIComponent(username)}/progress`);
        expandedData[username] = await res.json();
      }
      progressList.innerHTML = '';
      if (expandedData[username].length === 0) {
        progressList.innerHTML = '<li class="progress-empty">No progress records.</li>';
      } else {
        expandedData[username].forEach(p => {
          const item = document.createElement('li');
          item.className = 'progress-item';
          item.innerHTML = `
            <span class="prog-doc">${esc(p.document)}</span>
            <span class="prog-pct">${Math.round(p.percentage * 100)}%</span>
            <span class="prog-meta">${esc(p.device)} · ${relativeTime(p.timestamp)}</span>
          `;
          progressList.appendChild(item);
        });
      }
      progressList.style.display = ''; chevron.textContent = '▼';
    }

    async function deleteUser(username, li) {
      if (!confirm(`Delete user "${esc(username)}" and all their reading progress?`)) return;
      const res = await fetch(`/api/users/${encodeURIComponent(username)}`, { method: 'DELETE' });
      if (res.status === 204) {
        li.remove();
        if (!userList.querySelector('.user-row')) usersEmpty.style.display = '';
      } else {
        alert('Failed to delete user.');
      }
    }

    loadBooks();
  </script>
</body>
</html>
```

- [ ] **Step 2: Run full test suite**

```bash
npm test
```

Expected: all tests PASS.

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: `dist/public/index.html` present, no errors.

- [ ] **Step 4: Commit**

```bash
git add app/public/index.html
git commit -m "feat: UI shows cover thumbnail, author, and series; epub-only upload"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|-----------------|------|
| EPUB-only upload + ALLOWED_EXTENSIONS | Task 8 |
| Parse title/author/description/series/seriesIndex/cover at upload | Tasks 3, 8 |
| KoReader partial-MD5 book ID | Task 3 |
| Cache metadata in SQLite `books` table | Task 5 |
| `UserStore` accepts `Database` instance | Task 4 |
| Shared `Database` in `index.ts` | Task 6 |
| `getCover(id)` serving blob from SQLite | Tasks 5, 7, 8 |
| OPDS: author + summary + cover link per entry | Task 7 |
| OPDS `/books/:id/cover` endpoint | Task 7 |
| UI `/api/books/:id/cover` endpoint | Task 8 |
| UI book list: cover thumbnail, author, series | Task 9 |
| `Book` type updated, `EpubMeta` added | Task 2 |

All spec sections are covered. No gaps found.

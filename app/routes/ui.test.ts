import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import request from 'supertest';
import express from 'express';
import session from 'express-session';
import Database from 'better-sqlite3';
import AdmZip from 'adm-zip';
import { BookStore } from '../services/book-store';
import { UserStore } from '../services/user-store';
import { createUiRouter } from './ui';
import { AppConfig, EpubMeta } from '../types';

jest.mock('../logger');

let booksDir: string;
let db: InstanceType<typeof Database>;
let bookStore: BookStore;
let userStore: UserStore;
let app: express.Express;

const config: AppConfig = {
  username: 'admin',
  password: 'pass',
  booksDir: '',
  dataDir: '/tmp',
  port: 3000,
};

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

// Helper: build a minimal EPUB zip as a Buffer
function makeEpub(
  opts: {
    title?: string;
    author?: string;
    description?: string;
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

  const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    ${opts.title !== undefined ? `<dc:title>${opts.title}</dc:title>` : ''}
    ${opts.author !== undefined ? `<dc:creator>${opts.author}</dc:creator>` : ''}
    ${opts.description !== undefined ? `<dc:description>${opts.description}</dc:description>` : ''}
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

// Returns a supertest agent that has a valid session cookie
async function adminAgent() {
  const agent = request.agent(app);
  await agent
    .post('/login')
    .send('username=admin&password=pass')
    .set('Content-Type', 'application/x-www-form-urlencoded');
  return agent;
}

async function userAgent() {
  const agent = request.agent(app);
  await agent
    .post('/login')
    .send('username=alice&password=alicepass')
    .set('Content-Type', 'application/x-www-form-urlencoded');
  return agent;
}

beforeEach(() => {
  booksDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hass-odps-ui-'));
  db = new Database(':memory:');
  bookStore = new BookStore(booksDir, db);
  userStore = new UserStore(db);
  userStore.createUser('alice', UserStore.hashPassword('alicepass'));

  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(session({ secret: 'test-secret', resave: false, saveUninitialized: false }));
  app.use('/', createUiRouter(bookStore, userStore, { ...config, booksDir }));
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
    const agent = await adminAgent();
    const res = await agent.get('/');
    expect(res.status).toBe(200);
  });
});

describe('POST /login', () => {
  it('redirects to / on correct admin credentials', async () => {
    const res = await request(app)
      .post('/login')
      .send('username=admin&password=pass')
      .set('Content-Type', 'application/x-www-form-urlencoded');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/');
  });

  it('redirects to / on correct regular user credentials', async () => {
    const res = await request(app)
      .post('/login')
      .send('username=alice&password=alicepass')
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

  it('returns 401 for unknown user', async () => {
    const res = await request(app)
      .post('/login')
      .send('username=nobody&password=pass')
      .set('Content-Type', 'application/x-www-form-urlencoded');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/me', () => {
  it('redirects to /login without session', async () => {
    const res = await request(app).get('/api/me');
    expect(res.status).toBe(302);
  });

  it('returns isAdmin true for admin session', async () => {
    const agent = await adminAgent();
    const res = await agent.get('/api/me');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ username: 'admin', isAdmin: true });
  });

  it('returns isAdmin false for regular user session', async () => {
    const agent = await userAgent();
    const res = await agent.get('/api/me');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ username: 'alice', isAdmin: false });
  });
});

describe('GET /api/books', () => {
  it('returns 302 without session', async () => {
    const res = await request(app).get('/api/books');
    expect(res.status).toBe(302);
  });

  it('returns JSON array of books', async () => {
    bookStore.addBook('book1', 'book.epub', path.join(booksDir, 'book.epub'), 100, new Date(), {
      ...FAKE_META,
      title: 'book',
    });
    const agent = await adminAgent();
    const res = await agent.get('/api/books');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].filename).toBe('book.epub');
  });

  it('returns enriched book data with author, series, hasCover', async () => {
    const meta: EpubMeta = {
      ...FAKE_META,
      title: 'Enriched Book',
      author: 'Jane Doe',
      series: 'MySeries',
      seriesIndex: 2,
      coverData: null,
      coverMime: null,
    };
    bookStore.addBook(
      'enriched1',
      'enriched.epub',
      path.join(booksDir, 'enriched.epub'),
      200,
      new Date(),
      meta
    );
    const agent = await adminAgent();
    const res = await agent.get('/api/books');
    expect(res.status).toBe(200);
    const book = res.body[0];
    expect(book.author).toBe('Jane Doe');
    expect(book.series).toBe('MySeries');
    expect(book.seriesIndex).toBe(2);
    expect(book.hasCover).toBe(false);
    expect(book.path).toBeUndefined();
    expect(book.description).toBeUndefined();
  });

  it('returns fileAs in the books API response', async () => {
    const meta: EpubMeta = {
      ...FAKE_META,
      title: 'Foundation',
      fileAs: 'Asimov, Isaac',
      author: 'Isaac Asimov',
    };

    bookStore.addBook(
      'foundation1',
      'foundation.epub',
      path.join(booksDir, 'foundation.epub'),
      200,
      new Date(),
      meta
    );

    const agent = await adminAgent();
    const res = await agent.get('/api/books');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    const [book] = res.body;
    expect(book.fileAs).toBe('Asimov, Isaac');
    expect(book.path).toBeUndefined();
    expect(book.description).toBeUndefined();
  });
});

describe('POST /api/books/upload', () => {
  it('rejects .pdf files with 400 and "Supported: epub"', async () => {
    const agent = await adminAgent();
    const res = await agent
      .post('/api/books/upload')
      .attach('files', Buffer.from('pdf-content'), 'notes.pdf');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Supported: epub/);
  });

  it('rejects .mobi files with 400 and "Supported: epub"', async () => {
    const agent = await adminAgent();
    const res = await agent
      .post('/api/books/upload')
      .attach('files', Buffer.from('mobi-content'), 'book.mobi');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Supported: epub/);
  });

  it('rejects unsupported file types', async () => {
    const agent = await adminAgent();
    const res = await agent
      .post('/api/books/upload')
      .attach('files', Buffer.from('text'), 'notes.txt');
    expect(res.status).toBe(400);
  });

  it('rejects invalid EPUB content with 400', async () => {
    const agent = await adminAgent();
    const res = await agent
      .post('/api/books/upload')
      .attach('files', Buffer.from('not-an-epub'), 'bad.epub');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Failed to parse EPUB/);
  });

  it('accepts a valid .epub, parses metadata, and stores it', async () => {
    const epubBuf = makeEpub({
      title: 'Parsed Title',
      author: 'Parsed Author',
      series: 'Parsed Series',
      seriesIndex: 3,
    });
    const agent = await adminAgent();
    const res = await agent.post('/api/books/upload').attach('files', epubBuf, 'parsed.epub');
    expect(res.status).toBe(200);
    expect(res.body.uploaded).toContain('parsed.epub');
    expect(fs.existsSync(path.join(booksDir, 'parsed.epub'))).toBe(true);

    // Verify metadata was stored
    const books = bookStore.listBooks();
    expect(books).toHaveLength(1);
    expect(books[0].title).toBe('Parsed Title');
    expect(books[0].author).toBe('Parsed Author');
    expect(books[0].series).toBe('Parsed Series');
    expect(books[0].seriesIndex).toBe(3);
  });

  it('accepts a valid .epub with cover', async () => {
    const coverBuf = Buffer.from('fake-jpeg-data');
    const epubBuf = makeEpub({
      title: 'Cover Book',
      author: 'Cover Author',
      coverData: coverBuf,
      coverMime: 'image/jpeg',
    });
    const agent = await adminAgent();
    const res = await agent.post('/api/books/upload').attach('files', epubBuf, 'cover.epub');
    expect(res.status).toBe(200);

    const books = bookStore.listBooks();
    expect(books[0].hasCover).toBe(true);
  });
});

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
    expect(res.status).toBe(302);
  });
});

describe('GET /api/books/:id/cover', () => {
  it('returns 200 with cover image for a book with cover', async () => {
    const coverBuf = Buffer.from('fake-jpeg-bytes');
    const meta: EpubMeta = {
      ...FAKE_META,
      coverData: coverBuf,
      coverMime: 'image/jpeg',
    };
    bookStore.addBook(
      'coverId1',
      'cover-book.epub',
      path.join(booksDir, 'cover-book.epub'),
      100,
      new Date(),
      meta
    );

    const agent = await adminAgent();
    const res = await agent.get('/api/books/coverId1/cover');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/image\/jpeg/);
    expect(Buffer.from(res.body).toString()).toBe('fake-jpeg-bytes');
  });

  it('returns 404 for a book without cover', async () => {
    bookStore.addBook(
      'noCoverId',
      'no-cover.epub',
      path.join(booksDir, 'no-cover.epub'),
      100,
      new Date(),
      FAKE_META
    );

    const agent = await adminAgent();
    const res = await agent.get('/api/books/noCoverId/cover');
    expect(res.status).toBe(404);
  });

  it('returns 404 for an unknown book id', async () => {
    const agent = await adminAgent();
    const res = await agent.get('/api/books/unknownId/cover');
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/books/:id', () => {
  it('deletes a book and returns 204', async () => {
    const bookPath = path.join(booksDir, 'book.epub');
    fs.writeFileSync(bookPath, 'x');
    bookStore.addBook('book1', 'book.epub', bookPath, 1, new Date(), FAKE_META);
    const [book] = bookStore.listBooks();

    const agent = await adminAgent();
    const res = await agent.delete(`/api/books/${book.id}`);
    expect(res.status).toBe(204);
    expect(fs.existsSync(bookPath)).toBe(false);
  });

  it('returns 404 for unknown book id', async () => {
    const agent = await adminAgent();
    const res = await agent.delete('/api/books/deadbeefdeadbeef');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/books/scan', () => {
  it('returns 302 without session', async () => {
    const res = await request(app).post('/api/books/scan');
    expect(res.status).toBe(302);
  });

  it('returns { imported: [], removed: [] } when nothing to scan', async () => {
    const agent = await adminAgent();
    const res = await agent.post('/api/books/scan');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ imported: [], removed: [] });
  });

  it('imports an epub file found on disk but not in DB', async () => {
    // Write a real EPUB to booksDir without going through the upload route
    const epubBuf = makeEpub({ title: 'Found Book', author: 'Found Author' });
    fs.writeFileSync(path.join(booksDir, 'found.epub'), epubBuf);

    const agent = await adminAgent();
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
      ...FAKE_META,
      title: 'Stale Book',
    });

    const agent = await adminAgent();
    const res = await agent.post('/api/books/scan');
    expect(res.status).toBe(200);
    expect(res.body.removed).toContain('deleted.epub');
    expect(res.body.imported).toEqual([]);
  });
});

describe('DELETE /api/books/:id (admin-only)', () => {
  beforeEach(() => {
    bookStore.addBook(
      'b1',
      'book.epub',
      path.join(booksDir, 'book.epub'),
      100,
      new Date(),
      FAKE_META
    );
  });

  it('returns 204 for admin', async () => {
    const agent = await adminAgent();
    const res = await agent.delete('/api/books/b1');
    expect(res.status).toBe(204);
  });

  it('returns 403 for regular user', async () => {
    const agent = await userAgent();
    const res = await agent.delete('/api/books/b1');
    expect(res.status).toBe(403);
  });
});

describe('POST /api/books/scan (admin-only)', () => {
  it('returns 200 for admin', async () => {
    const agent = await adminAgent();
    const res = await agent.post('/api/books/scan');
    expect(res.status).toBe(200);
  });

  it('returns 403 for regular user', async () => {
    const agent = await userAgent();
    const res = await agent.post('/api/books/scan');
    expect(res.status).toBe(403);
  });
});

describe('GET /api/my/progress', () => {
  it('redirects to /login without session', async () => {
    const res = await request(app).get('/api/my/progress');
    expect(res.status).toBe(302);
  });

  it('returns [] for admin', async () => {
    const agent = await adminAgent();
    const res = await agent.get('/api/my/progress');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns own progress records for regular user', async () => {
    userStore.saveProgress('alice', {
      document: 'doc1',
      progress: '/p[1]',
      percentage: 0.72,
      device: 'Kobo',
      device_id: 'd1',
    });
    const agent = await userAgent();
    const res = await agent.get('/api/my/progress');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].document).toBe('doc1');
    expect(res.body[0].percentage).toBeCloseTo(0.72);
  });

  it('does not expose device or progress fields', async () => {
    userStore.saveProgress('alice', {
      document: 'doc1',
      progress: '/p[1]',
      percentage: 0.5,
      device: 'Kobo',
      device_id: 'd1',
    });
    const agent = await userAgent();
    const res = await agent.get('/api/my/progress');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].device).toBeUndefined();
    expect(res.body[0].progress).toBeUndefined();
  });

  it("does not return another user's progress", async () => {
    userStore.createUser('bob', UserStore.hashPassword('bobpass'));
    userStore.saveProgress('bob', {
      document: 'doc2',
      progress: '/p[1]',
      percentage: 0.9,
      device: 'Kobo',
      device_id: 'd2',
    });
    const agent = await userAgent();
    const res = await agent.get('/api/my/progress');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });
});

describe('DELETE /api/my/progress/:document', () => {
  beforeEach(() => {
    userStore.saveProgress('alice', {
      document: 'doc1',
      progress: '/p[1]',
      percentage: 0.5,
      device: 'Kobo',
      device_id: 'd1',
    });
  });

  it('redirects to /login without session', async () => {
    const res = await request(app).delete('/api/my/progress/doc1');
    expect(res.status).toBe(302);
  });

  it('returns 403 for admin', async () => {
    const agent = await adminAgent();
    const res = await agent.delete('/api/my/progress/doc1');
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'Forbidden' });
  });

  it('returns 204 and clears the record for regular user', async () => {
    const agent = await userAgent();
    const res = await agent.delete('/api/my/progress/doc1');
    expect(res.status).toBe(204);
    expect(userStore.getProgress('alice', 'doc1')).toBeNull();
  });

  it('returns 404 when no record exists', async () => {
    const agent = await userAgent();
    const res = await agent.delete('/api/my/progress/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Progress record not found' });
  });
});

describe('GET / HTML structure', () => {
  it('contains series-section element', async () => {
    const agent = await adminAgent();
    const res = await agent.get('/');
    expect(res.text).toContain('id="series-section"');
  });

  it('contains series UI CSS classes', async () => {
    const agent = await adminAgent();
    const res = await agent.get('/');
    expect(res.text).toContain('.series-row');
    expect(res.text).toContain('.series-hero');
  });
});

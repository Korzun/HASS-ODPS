import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import request from 'supertest';
import express from 'express';
import Database from 'better-sqlite3';
import { BookStore } from '../services/book-store';
import { UserStore } from '../services/user-store';
import { createOpdsRouter } from './opds';
import { EpubMeta } from '../types';

jest.mock('../logger');

const FAKE_META: EpubMeta = {
  title: 'My Book',
  author: 'Test Author',
  description: '',
  series: '',
  seriesIndex: 0,
  fileAs: '',
  coverData: null,
  coverMime: null,
};

let booksDir: string;
let db: InstanceType<typeof Database>;
let bookStore: BookStore;
let userStore: UserStore;
let app: express.Express;

// OPDS uses HTTP Basic Auth — password is sent plaintext (RFC 7617).
function basicAuth(username: string, password: string) {
  const encoded = Buffer.from(`${username}:${password}`).toString('base64');
  return { Authorization: `Basic ${encoded}` };
}

beforeEach(() => {
  booksDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hass-odps-opds-'));
  db = new Database(':memory:');
  bookStore = new BookStore(booksDir, db);
  userStore = new UserStore(db);
  // Register a test user the same way KOSync registration does: store MD5(password).
  userStore.createUser('alice', UserStore.hashPassword('secret'));
  app = express();
  app.use('/opds', createOpdsRouter(bookStore, userStore));
});

afterEach(() => {
  db.close();
  fs.rmSync(booksDir, { recursive: true });
});

describe('GET /opds/', () => {
  it('returns 401 without credentials', async () => {
    const res = await request(app).get('/opds/');
    expect(res.status).toBe(401);
  });

  it('returns 401 with wrong password', async () => {
    const res = await request(app).get('/opds/').set(basicAuth('alice', 'wrong'));
    expect(res.status).toBe(401);
  });

  it('returns 401 for unknown user', async () => {
    const res = await request(app).get('/opds/').set(basicAuth('nobody', 'secret'));
    expect(res.status).toBe(401);
  });

  it('returns 200 with valid credentials', async () => {
    const res = await request(app).get('/opds/').set(basicAuth('alice', 'secret'));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/atom\+xml/);
  });

  it('returns valid XML containing a link to /opds/books', async () => {
    const res = await request(app).get('/opds/').set(basicAuth('alice', 'secret'));
    expect(res.text).toContain('/opds/books');
    expect(res.text).toContain('<?xml');
  });
});

describe('GET /opds/books', () => {
  it('returns an empty feed when no books exist', async () => {
    const res = await request(app).get('/opds/books').set(basicAuth('alice', 'secret'));
    expect(res.status).toBe(200);
    expect(res.text).toContain('<feed');
  });

  it('includes an entry for each book', async () => {
    bookStore.addBook(
      'book1',
      'My Book.epub',
      path.join(booksDir, 'My Book.epub'),
      100,
      new Date(),
      { ...FAKE_META, title: 'My Book' }
    );
    const res = await request(app).get('/opds/books').set(basicAuth('alice', 'secret'));
    expect(res.text).toContain('My Book');
    expect(res.text).toContain('opds-spec.org/acquisition');
  });

  it('escapes special characters in titles', async () => {
    bookStore.addBook(
      'book2',
      'A & B <Test>.epub',
      path.join(booksDir, 'A & B <Test>.epub'),
      100,
      new Date(),
      { ...FAKE_META, title: 'A & B <Test>' }
    );
    const res = await request(app).get('/opds/books').set(basicAuth('alice', 'secret'));
    expect(res.text).toContain('A &amp; B &lt;Test&gt;');
    expect(res.text).not.toContain('<Test>');
  });

  it('includes author in book entry', async () => {
    bookStore.addBook('book3', 'Book3.epub', path.join(booksDir, 'Book3.epub'), 100, new Date(), {
      ...FAKE_META,
      author: 'Test Author',
    });
    const res = await request(app).get('/opds/books').set(basicAuth('alice', 'secret'));
    expect(res.text).toContain('<author><name>Test Author</name></author>');
  });

  it('includes summary (description) in book entry', async () => {
    bookStore.addBook('book4', 'Book4.epub', path.join(booksDir, 'Book4.epub'), 100, new Date(), {
      ...FAKE_META,
      description: 'A great book about things.',
    });
    const res = await request(app).get('/opds/books').set(basicAuth('alice', 'secret'));
    expect(res.text).toContain('<summary>A great book about things.</summary>');
  });

  it('includes cover link when hasCover is true', async () => {
    const coverData = Buffer.from('fake-cover-data');
    bookStore.addBook(
      'bookcover',
      'BookCover.epub',
      path.join(booksDir, 'BookCover.epub'),
      100,
      new Date(),
      {
        ...FAKE_META,
        coverData,
        coverMime: 'image/jpeg',
      }
    );
    const res = await request(app).get('/opds/books').set(basicAuth('alice', 'secret'));
    expect(res.text).toContain('rel="http://opds-spec.org/image"');
    expect(res.text).toContain('/opds/books/bookcover/cover');
  });

  it('does not include cover link when hasCover is false', async () => {
    bookStore.addBook(
      'booknocover',
      'BookNoCover.epub',
      path.join(booksDir, 'BookNoCover.epub'),
      100,
      new Date(),
      {
        ...FAKE_META,
        coverData: null,
        coverMime: null,
      }
    );
    const res = await request(app).get('/opds/books').set(basicAuth('alice', 'secret'));
    expect(res.text).not.toContain('rel="http://opds-spec.org/image"');
  });
});

describe('GET /opds/books/:id/download', () => {
  it('returns 404 for unknown book id', async () => {
    const res = await request(app)
      .get('/opds/books/deadbeefdeadbeef/download')
      .set(basicAuth('alice', 'secret'));
    expect(res.status).toBe(404);
  });

  it('returns the file with correct content type', async () => {
    const bookPath = path.join(booksDir, 'book.epub');
    fs.writeFileSync(bookPath, 'epub-content');
    bookStore.addBook('bookdl', 'book.epub', bookPath, 12, new Date(), FAKE_META);
    const res = await request(app)
      .get('/opds/books/bookdl/download')
      .set(basicAuth('alice', 'secret'));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/epub/);
  });
});

describe('GET /opds/books/:id/cover', () => {
  it('returns 404 when book does not exist', async () => {
    const res = await request(app)
      .get('/opds/books/nonexistent/cover')
      .set(basicAuth('alice', 'secret'));
    expect(res.status).toBe(404);
  });

  it('returns 404 when book exists but has no cover', async () => {
    bookStore.addBook(
      'booknocover2',
      'BookNoCover2.epub',
      path.join(booksDir, 'BookNoCover2.epub'),
      100,
      new Date(),
      {
        ...FAKE_META,
        coverData: null,
        coverMime: null,
      }
    );
    const res = await request(app)
      .get('/opds/books/booknocover2/cover')
      .set(basicAuth('alice', 'secret'));
    expect(res.status).toBe(404);
  });

  it('returns cover image with correct content type', async () => {
    const coverData = Buffer.from('fake-jpeg-data');
    bookStore.addBook(
      'bookcoverimg',
      'BookCoverImg.epub',
      path.join(booksDir, 'BookCoverImg.epub'),
      100,
      new Date(),
      {
        ...FAKE_META,
        coverData,
        coverMime: 'image/jpeg',
      }
    );
    const res = await request(app)
      .get('/opds/books/bookcoverimg/cover')
      .set(basicAuth('alice', 'secret'));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/image\/jpeg/);
    expect(res.body).toEqual(coverData);
  });
});

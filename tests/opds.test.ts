import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import request from 'supertest';
import express from 'express';
import { BookStore } from '../app/services/BookStore';
import { createOpdsRouter } from '../app/routes/opds';
import { AppConfig } from '../app/types';

let booksDir: string;
let bookStore: BookStore;
let app: express.Express;

const config: AppConfig = {
  username: 'admin',
  password: 'pass',
  booksDir: '',
  dataDir: '/tmp',
  port: 3000,
};

function basicAuth(username: string, password: string) {
  const encoded = Buffer.from(`${username}:${password}`).toString('base64');
  return { Authorization: `Basic ${encoded}` };
}

beforeEach(() => {
  booksDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hass-odps-opds-'));
  bookStore = new BookStore(booksDir);
  app = express();
  app.use('/opds', createOpdsRouter(bookStore, { ...config, booksDir }));
});

afterEach(() => {
  fs.rmSync(booksDir, { recursive: true });
});

describe('GET /opds/', () => {
  it('returns 401 without credentials', async () => {
    const res = await request(app).get('/opds/');
    expect(res.status).toBe(401);
  });

  it('returns 200 with valid credentials', async () => {
    const res = await request(app).get('/opds/').set(basicAuth('admin', 'pass'));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/atom\+xml/);
  });

  it('returns valid XML containing a link to /opds/books', async () => {
    const res = await request(app).get('/opds/').set(basicAuth('admin', 'pass'));
    expect(res.text).toContain('/opds/books');
    expect(res.text).toContain('<?xml');
  });
});

describe('GET /opds/books', () => {
  it('returns an empty feed when no books exist', async () => {
    const res = await request(app).get('/opds/books').set(basicAuth('admin', 'pass'));
    expect(res.status).toBe(200);
    expect(res.text).toContain('<feed');
  });

  it('includes an entry for each book', async () => {
    fs.writeFileSync(path.join(booksDir, 'My Book.epub'), 'x');
    const res = await request(app).get('/opds/books').set(basicAuth('admin', 'pass'));
    expect(res.text).toContain('My Book');
    expect(res.text).toContain('opds-spec.org/acquisition');
  });

  it('escapes special characters in titles', async () => {
    fs.writeFileSync(path.join(booksDir, 'A & B <Test>.epub'), 'x');
    const res = await request(app).get('/opds/books').set(basicAuth('admin', 'pass'));
    expect(res.text).toContain('A &amp; B &lt;Test&gt;');
    expect(res.text).not.toContain('<Test>');
  });
});

describe('GET /opds/books/:id/download', () => {
  it('returns 404 for unknown book id', async () => {
    const res = await request(app)
      .get('/opds/books/deadbeefdeadbeef/download')
      .set(basicAuth('admin', 'pass'));
    expect(res.status).toBe(404);
  });

  it('returns the file with correct content type', async () => {
    fs.writeFileSync(path.join(booksDir, 'book.epub'), 'epub-content');
    const [book] = bookStore.listBooks();
    const res = await request(app)
      .get(`/opds/books/${book.id}/download`)
      .set(basicAuth('admin', 'pass'));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/epub/);
  });
});

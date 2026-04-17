import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import request from 'supertest';
import express from 'express';
import session from 'express-session';
import { BookStore } from '../app/services/BookStore';
import { createUiRouter } from '../app/routes/ui';
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

// Returns a supertest agent that has a valid session cookie
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
  bookStore = new BookStore(booksDir);

  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(
    session({ secret: 'test-secret', resave: false, saveUninitialized: false })
  );
  app.use('/', createUiRouter(bookStore, { ...config, booksDir }));
});

afterEach(() => {
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

  it('returns JSON array of books', async () => {
    fs.writeFileSync(path.join(booksDir, 'book.epub'), 'x');
    const agent = await authenticatedAgent();
    const res = await agent.get('/api/books');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].filename).toBe('book.epub');
  });
});

describe('POST /api/books/upload', () => {
  it('uploads a valid book file', async () => {
    const agent = await authenticatedAgent();
    const res = await agent
      .post('/api/books/upload')
      .attach('files', Buffer.from('epub-content'), 'uploaded.epub');
    expect(res.status).toBe(200);
    expect(res.body.uploaded).toContain('uploaded.epub');
    expect(fs.existsSync(path.join(booksDir, 'uploaded.epub'))).toBe(true);
  });

  it('rejects unsupported file types', async () => {
    const agent = await authenticatedAgent();
    const res = await agent
      .post('/api/books/upload')
      .attach('files', Buffer.from('text'), 'notes.txt');
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/books/:id', () => {
  it('deletes a book and returns 204', async () => {
    const bookPath = path.join(booksDir, 'book.epub');
    fs.writeFileSync(bookPath, 'x');
    const [book] = bookStore.listBooks();

    const agent = await authenticatedAgent();
    const res = await agent.delete(`/api/books/${book.id}`);
    expect(res.status).toBe(204);
    expect(fs.existsSync(bookPath)).toBe(false);
  });

  it('returns 404 for unknown book id', async () => {
    const agent = await authenticatedAgent();
    const res = await agent.delete('/api/books/deadbeefdeadbeef');
    expect(res.status).toBe(404);
  });
});

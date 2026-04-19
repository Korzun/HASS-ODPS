import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { BookStore } from '../services/book-store';
import { AppConfig, EpubMeta } from '../types';
import { UserStore } from '../services/user-store';
import { sessionAuth, adminAuth } from '../middleware/auth';
import { logger } from '../logger';
import { parseEpub, partialMD5 } from '../services/epub-parser';

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

export function createUiRouter(
  bookStore: BookStore,
  userStore: UserStore,
  config: AppConfig
): Router {
  const router = Router();

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, bookStore.getBooksDir()),
    filename: (_req, file, cb) => cb(null, path.basename(file.originalname)),
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
    if (req.session.authenticated) {
      res.redirect('/');
      return;
    }
    res.send(loginPage());
  });

  router.post('/login', (req: Request, res: Response) => {
    const { username, password } = req.body as { username?: string; password?: string };
    if (typeof username !== 'string' || typeof password !== 'string') {
      res.status(401).send(loginPage('Invalid credentials'));
      return;
    }
    if (username === config.username && password === config.password) {
      req.session.authenticated = true;
      req.session.isAdmin = true;
      req.session.username = username;
      log.info(`Admin "${username}" logged in`);
      res.redirect('/');
      return;
    }
    if (userStore.validateUser(username, password)) {
      req.session.authenticated = true;
      req.session.isAdmin = false;
      req.session.username = username;
      log.info(`User "${username}" logged in`);
      res.redirect('/');
      return;
    }
    log.warn(`Login failed for username "${username ?? ''}"`);
    res.status(401).send(loginPage('Invalid credentials'));
  });

  router.post('/logout', (req: Request, res: Response) => {
    log.info('User logged out');
    req.session.destroy(() => res.redirect('/login'));
  });

  router.get('/api/me', sessionAuth, (req: Request, res: Response) => {
    res.json({ username: req.session.username, isAdmin: req.session.isAdmin });
  });

  router.get('/api/my/progress', sessionAuth, (req: Request, res: Response) => {
    if (req.session.isAdmin) {
      res.json([]);
      return;
    }
    const progress = userStore.getUserProgress(req.session.username!);
    res.json(progress.map(p => ({ document: p.document, percentage: p.percentage })));
  });

  // ── Protected ─────────────────────────────────────────

  router.get('/', sessionAuth, (_req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });

  router.get('/api/books', sessionAuth, (_req: Request, res: Response) => {
    res.json(
      bookStore.listBooks().map((b) => {
        const { path: _path, description: _description, ...rest } = b;
        return rest;
      })
    );
  });

  router.post(
    '/api/books/upload',
    sessionAuth,
    upload.array('files'),
    async (req: Request, res: Response) => {
      const files = req.files as Express.Multer.File[] | undefined;
      if (!files?.length) {
        log.warn('Upload rejected — no valid files (supported: epub)');
        res.status(400).json({ error: 'No valid files uploaded. Supported: epub' });
        return;
      }
      const uploaded: string[] = [];
      for (const file of files) {
        const savedPath = file.path;
        let meta: EpubMeta;
        let id: string;
        try {
          meta = parseEpub(savedPath);
          id = partialMD5(savedPath);
        } catch (err: unknown) {
          fs.unlinkSync(savedPath);
          res.status(400).json({
            error: `Failed to parse EPUB: ${err instanceof Error ? err.message : String(err)}`,
          });
          return;
        }
        bookStore.addBook(id, file.originalname, savedPath, file.size, new Date(), meta);
        uploaded.push(file.originalname);
      }
      log.info(`Books uploaded: ${uploaded.join(', ')}`);
      res.json({ uploaded });
    }
  );

  router.get('/api/books/:id/cover', sessionAuth, (req: Request, res: Response) => {
    const cover = bookStore.getCover(req.params.id);
    if (!cover) {
      res.status(404).send('Not found');
      return;
    }
    res.set('Content-Type', cover.mime);
    res.send(cover.data);
  });

  router.delete('/api/books/:id', sessionAuth, adminAuth, (req: Request, res: Response) => {
    const deleted = bookStore.deleteBook(req.params.id);
    if (!deleted) {
      log.warn(`Delete attempted for unknown book ID: ${req.params.id}`);
      res.status(404).json({ error: 'Book not found' });
      return;
    }
    log.info(`Book deleted: "${deleted.filename}"`);
    res.status(204).send();
  });

  router.post('/api/books/scan', sessionAuth, adminAuth, (_req: Request, res: Response) => {
    const result = bookStore.scan();
    log.info(`Scan: ${result.imported.length} imported, ${result.removed.length} removed`);
    res.json(result);
  });

  return router;
}

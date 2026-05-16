import express, { Router, Request, Response } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { BookStore } from '../services/book-store';
import { AppConfig, EpubMeta } from '../types';
import { UserStore } from '../services/user-store';
import { sessionAuth, adminAuth } from '../middleware/auth';
import { logger } from '../logger';
import { parseEpub, partialMD5 } from '../services/epub-parser';
import { writeMetadata, EpubChanges } from '../services/epub-writer';
import { parseCfiSpineIndex, spineIndexToChapter } from '../utils/cfi';

const log = logger('UI');

const ALLOWED_EXTENSIONS = new Set(['.epub']);

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

  const coverUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      cb(null, file.mimetype.startsWith('image/'));
    },
  });

  // ── Auth ──────────────────────────────────────────────

  const serveSpa = (_req: Request, res: Response): void => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  };

  router.get('/login', serveSpa);

  router.post('/api/login', (req: Request, res: Response) => {
    const { username, password } = req.body as { username?: string; password?: string };
    if (typeof username !== 'string' || typeof password !== 'string') {
      res.sendStatus(401);
      return;
    }
    if (username === config.username && password === config.password) {
      req.session.authenticated = true;
      req.session.isAdmin = true;
      req.session.username = username;
      log.info(`Admin "${username}" logged in`);
      res.sendStatus(200);
      return;
    }
    if (userStore.validateUser(username, password)) {
      req.session.authenticated = true;
      req.session.isAdmin = false;
      req.session.username = username;
      log.info(`User "${username}" logged in`);
      res.sendStatus(200);
      return;
    }
    log.warn(`Login failed for username "${username ?? ''}"`);
    res.sendStatus(401);
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
    const progressList = userStore.getUserProgress(req.session.username!);
    res.json(
      progressList.map((p) => {
        const spineIndex = parseCfiSpineIndex(p.progress);
        const book = bookStore.getBookById(p.document);
        const currentChapter =
          spineIndex !== null && book && book.chapterSpineMap.length > 0
            ? (spineIndexToChapter(spineIndex, book.chapterSpineMap) ?? undefined)
            : undefined;
        return {
          document: p.document,
          percentage: p.percentage,
          ...(currentChapter !== undefined ? { currentChapter } : {}),
        };
      })
    );
  });

  router.delete('/api/my/progress/:document', sessionAuth, (req: Request, res: Response) => {
    if (req.session.isAdmin) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const cleared = userStore.clearProgress(req.session.username!, req.params.document);
    if (!cleared) {
      res.status(404).json({ error: 'Progress record not found' });
      return;
    }
    res.status(204).send();
  });

  // ── Static assets (no auth required) ──────────────────
  router.use('/assets', express.static(path.join(__dirname, '../../client/dist/assets')));

  // ── Protected SPA ──────────────────────────────────────

  router.get('/', sessionAuth, serveSpa);
  router.get('/books/:id', sessionAuth, serveSpa);
  router.get('/books/:id/edit', sessionAuth, serveSpa);
  router.get('/series/:name', sessionAuth, serveSpa);

  router.get('/api/books', sessionAuth, (_req: Request, res: Response) => {
    res.json(
      bookStore.listBooks().map((b) => {
        const {
          path: _path,
          description: _description,
          publisher: _publisher,
          identifiers: _identifiers,
          subjects: _subjects,
          addedAt: _addedAt,
          chapterSpineMap: _chapterSpineMap,
          ...rest
        } = b;
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

  router.get('/api/books/:id', sessionAuth, (req: Request, res: Response) => {
    const book = bookStore.getBookById(req.params.id);
    if (!book) {
      res.status(404).json({ error: 'Book not found' });
      return;
    }
    const { path: _path, chapterSpineMap: _chapterSpineMap, ...rest } = book;
    res.json(rest);
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
      if (body.seriesIndex !== undefined) {
        const n = parseFloat(body.seriesIndex);
        if (Number.isNaN(n)) {
          res.status(400).json({ error: 'seriesIndex must be a number' });
          return;
        }
        changes.seriesIndex = n;
      }
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
      const { path: _path, chapterSpineMap: _chapterSpineMap, ...rest } = updated;
      res.json(rest);
    }
  );

  return router;
}

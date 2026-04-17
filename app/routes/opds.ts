import { Router, Request, Response } from 'express';
import { BookStore } from '../services/BookStore';
import { AppConfig, Book } from '../types';
import { basicAuth } from '../middleware/auth';

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

function booksFeed(books: Book[], baseUrl: string): string {
  const now = new Date().toISOString();
  const entries = books
    .map(
      b => `  <entry>
    <title>${escapeXml(b.title)}</title>
    <id>urn:hass-odps:book:${b.id}</id>
    <updated>${b.mtime.toISOString()}</updated>
    <link rel="http://opds-spec.org/acquisition"
          href="${baseUrl}/opds/books/${b.id}/download"
          type="${b.mimeType}"
          title="${escapeXml(b.filename)}"/>
  </entry>`
    )
    .join('\n');

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

export function createOpdsRouter(bookStore: BookStore, config: AppConfig): Router {
  const router = Router();
  const auth = basicAuth(config);

  router.get('/', auth, (req: Request, res: Response) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    res.set('Content-Type', 'application/atom+xml;charset=utf-8');
    res.send(rootFeed(baseUrl));
  });

  router.get('/books', auth, (req: Request, res: Response) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    res.set('Content-Type', 'application/atom+xml;charset=utf-8');
    res.send(booksFeed(bookStore.listBooks(), baseUrl));
  });

  router.get('/books/:id/download', auth, (req: Request, res: Response) => {
    const book = bookStore.getBookById(req.params.id);
    if (!book) {
      res.status(404).send('Not found');
      return;
    }
    res.set('Content-Type', book.mimeType);
    res.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(book.filename)}`);
    res.sendFile(book.path);
  });

  return router;
}

import * as fs from 'fs';
import * as path from 'path';
import Database, { Database as DB } from 'better-sqlite3';
import { Book, EpubMeta } from '../types';

interface BookRow {
  id: string;
  filename: string;
  path: string;
  title: string;
  author: string;
  description: string;
  series: string;
  series_index: number;
  has_cover: number;
  size: number;
  mtime: number;
  added_at: number;
}

export class BookStore {
  private readonly db: DB;

  constructor(private readonly booksDir: string, db: DB) {
    this.db = db;
    this.migrate();
  }

  getBooksDir(): string {
    return this.booksDir;
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
      )
    `);
  }

  addBook(
    id: string,
    filename: string,
    filePath: string,
    size: number,
    mtime: Date,
    meta: EpubMeta
  ): void {
    const stmt = this.db.prepare(`
      INSERT INTO books (id, filename, path, title, author, description, series, series_index, cover_data, cover_mime, size, mtime, added_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(filename) DO UPDATE SET
        id = excluded.id,
        path = excluded.path,
        title = excluded.title,
        author = excluded.author,
        description = excluded.description,
        series = excluded.series,
        series_index = excluded.series_index,
        cover_data = excluded.cover_data,
        cover_mime = excluded.cover_mime,
        size = excluded.size,
        mtime = excluded.mtime
    `);
    const title = meta.title.trim() || path.basename(filename, path.extname(filename));
    stmt.run(
      id,
      filename,
      filePath,
      title,
      meta.author,
      meta.description,
      meta.series,
      meta.seriesIndex,
      meta.coverData,
      meta.coverMime,
      size,
      mtime.getTime(),
      Date.now()
    );
  }

  listBooks(): Book[] {
    const rows = this.db.prepare(`
      SELECT id, filename, path, title, author, description, series, series_index,
             cover_data IS NOT NULL AS has_cover, size, mtime, added_at
      FROM books ORDER BY title
    `).all() as BookRow[];
    return rows.map(r => this.rowToBook(r));
  }

  getBookById(id: string): Book | null {
    const row = this.db.prepare(`
      SELECT id, filename, path, title, author, description, series, series_index,
             cover_data IS NOT NULL AS has_cover, size, mtime, added_at
      FROM books WHERE id = ?
    `).get(id) as BookRow | undefined;
    return row ? this.rowToBook(row) : null;
  }

  deleteBook(id: string): Book | null {
    const book = this.getBookById(id);
    if (!book) return null;
    try { fs.unlinkSync(book.path); } catch { /* file already gone */ }
    this.db.prepare('DELETE FROM books WHERE id = ?').run(id);
    return book;
  }

  getCover(id: string): { data: Buffer; mime: string } | null {
    const row = this.db.prepare('SELECT cover_data, cover_mime FROM books WHERE id = ?').get(id) as { cover_data: Buffer | null; cover_mime: string | null } | undefined;
    if (!row || !row.cover_data) return null;
    return { data: row.cover_data as Buffer, mime: row.cover_mime as string };
  }

  private rowToBook(r: BookRow): Book {
    return {
      id: r.id,
      filename: r.filename,
      path: r.path,
      title: r.title,
      author: r.author,
      description: r.description,
      series: r.series,
      seriesIndex: r.series_index,
      hasCover: Boolean(r.has_cover),
      size: r.size,
      mtime: new Date(r.mtime),
      addedAt: new Date(r.added_at),
    };
  }
}

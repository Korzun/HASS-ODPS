import * as fs from 'fs';
import * as path from 'path';
import { Database as DB } from 'better-sqlite3';
import { Book, EpubMeta } from '../types';
import { parseEpub, partialMD5 } from './epub-parser';
import { logger } from '../logger';

const log = logger('BookStore');

interface BookRow {
  id: string;
  filename: string;
  path: string;
  title: string;
  file_as: string;
  author: string;
  description: string;
  publisher: string;
  series: string;
  series_index: number;
  identifiers: string; // JSON string
  subjects: string; // JSON string
  has_cover: number;
  size: number;
  mtime: number;
  added_at: number;
}

export interface ScanImporter {
  parseEpub: (filePath: string) => EpubMeta;
  partialMD5: (filePath: string) => string;
}

const defaultImporter: ScanImporter = { parseEpub, partialMD5 };

export class BookStore {
  private readonly db: DB;

  constructor(
    private readonly booksDir: string,
    db: DB
  ) {
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
        file_as       TEXT    NOT NULL DEFAULT '',
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

    const columns = this.db.prepare('PRAGMA table_info(books)').all() as Array<{ name: string }>;
    if (!columns.some((column) => column.name === 'file_as')) {
      this.db.exec(`ALTER TABLE books ADD COLUMN file_as TEXT NOT NULL DEFAULT ''`);
    }

    // Migration v2: recompute book IDs with corrected partial MD5 (first offset was 256, now 0)
    const { user_version } = this.db.prepare('PRAGMA user_version').get() as {
      user_version: number;
    };
    if (user_version < 2) {
      const books = this.db.prepare('SELECT id, path FROM books').all() as {
        id: string;
        path: string;
      }[];
      const updateBook = this.db.prepare('UPDATE books SET id = ? WHERE id = ?');
      const progressExists = this.db
        .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='progress'")
        .get();
      const updateProgress = progressExists
        ? this.db.prepare('UPDATE progress SET document = ? WHERE document = ?')
        : null;

      let recomputed = 0;
      this.db.transaction(() => {
        for (const book of books) {
          let newId: string;
          try {
            newId = partialMD5(book.path);
          } catch {
            continue;
          }
          if (newId !== book.id) {
            updateBook.run(newId, book.id);
            updateProgress?.run(newId, book.id);
            recomputed++;
          }
        }
      })();
      this.db.exec('PRAGMA user_version = 2');
      if (recomputed > 0) log.info(`Migration v2: recomputed ${recomputed} book ID(s)`);
    }

    if (user_version < 3) {
      const cols = this.db.prepare('PRAGMA table_info(books)').all() as Array<{ name: string }>;
      const colNames = new Set(cols.map((c) => c.name));
      if (!colNames.has('publisher')) {
        this.db.exec(`ALTER TABLE books ADD COLUMN publisher TEXT NOT NULL DEFAULT ''`);
      }
      if (!colNames.has('identifiers')) {
        this.db.exec(`ALTER TABLE books ADD COLUMN identifiers TEXT NOT NULL DEFAULT '[]'`);
      }
      if (!colNames.has('subjects')) {
        this.db.exec(`ALTER TABLE books ADD COLUMN subjects TEXT NOT NULL DEFAULT '[]'`);
      }
      this.db.exec('PRAGMA user_version = 3');
    }
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
      INSERT INTO books (id, filename, path, title, file_as, author, description, publisher, series, series_index, identifiers, subjects, cover_data, cover_mime, size, mtime, added_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(filename) DO UPDATE SET
        id = excluded.id,
        path = excluded.path,
        title = excluded.title,
        file_as = excluded.file_as,
        author = excluded.author,
        description = excluded.description,
        publisher = excluded.publisher,
        series = excluded.series,
        series_index = excluded.series_index,
        identifiers = excluded.identifiers,
        subjects = excluded.subjects,
        cover_data = excluded.cover_data,
        cover_mime = excluded.cover_mime,
        size = excluded.size,
        mtime = excluded.mtime
    `);
    const title = meta.title.trim() || path.basename(filename, path.extname(filename));
    const fileAs = (meta.fileAs || '').trim();
    stmt.run(
      id,
      filename,
      filePath,
      title,
      fileAs,
      meta.author,
      meta.description,
      meta.publisher,
      meta.series,
      meta.seriesIndex,
      JSON.stringify(meta.identifiers),
      JSON.stringify(meta.subjects),
      meta.coverData,
      meta.coverMime,
      size,
      mtime.getTime(),
      Date.now()
    );
  }

  listBooks(): Book[] {
    const rows = this.db
      .prepare(
        `
      SELECT id, filename, path, title, file_as, author, description, publisher, series, series_index,
             identifiers, subjects, cover_data IS NOT NULL AS has_cover, size, mtime, added_at
      FROM books
      ORDER BY CASE WHEN file_as != '' THEN file_as ELSE title END, title, filename
    `
      )
      .all() as BookRow[];
    return rows.map((r) => this.rowToBook(r));
  }

  getBookById(id: string): Book | null {
    const row = this.db
      .prepare(
        `
      SELECT id, filename, path, title, file_as, author, description, publisher, series, series_index,
             identifiers, subjects, cover_data IS NOT NULL AS has_cover, size, mtime, added_at
      FROM books WHERE id = ?
    `
      )
      .get(id) as BookRow | undefined;
    return row ? this.rowToBook(row) : null;
  }

  deleteBook(id: string): Book | null {
    const book = this.getBookById(id);
    if (!book) return null;
    try {
      fs.unlinkSync(book.path);
    } catch {
      /* file already gone */
    }
    this.db.prepare('DELETE FROM books WHERE id = ?').run(id);
    return book;
  }

  private removeStaleBook(id: string): void {
    this.db.prepare('DELETE FROM books WHERE id = ?').run(id);
  }

  getCover(id: string): { data: Buffer; mime: string } | null {
    const row = this.db.prepare('SELECT cover_data, cover_mime FROM books WHERE id = ?').get(id) as
      | { cover_data: Buffer | null; cover_mime: string | null }
      | undefined;
    if (!row || !row.cover_data) return null;
    return { data: row.cover_data as Buffer, mime: row.cover_mime as string };
  }

  scan(importer: ScanImporter = defaultImporter): { imported: string[]; removed: string[] } {
    const imported: string[] = [];
    const removed: string[] = [];

    const dbBooks = this.listBooks();
    const dbFilenames = new Set(dbBooks.map((b) => b.filename));

    const diskFilenames: string[] = fs.existsSync(this.booksDir)
      ? fs.readdirSync(this.booksDir).filter((f) => path.extname(f).toLowerCase() === '.epub')
      : [];
    const diskFilenameSet = new Set(diskFilenames);

    // Import new files: on disk but not in DB
    for (const filename of diskFilenames) {
      if (dbFilenames.has(filename)) continue;
      const filePath = path.join(this.booksDir, filename);
      try {
        const stat = fs.statSync(filePath);
        const meta = importer.parseEpub(filePath);
        const id = importer.partialMD5(filePath);
        this.addBook(id, filename, filePath, stat.size, stat.mtime, meta);
        imported.push(filename);
      } catch (err: unknown) {
        log.warn(
          `scan: skipping "${filename}" — ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    // Remove stale entries: in DB but file no longer on disk
    for (const book of dbBooks) {
      if (!diskFilenameSet.has(book.filename)) {
        this.removeStaleBook(book.id);
        removed.push(book.filename);
      }
    }

    return { imported, removed };
  }

  private rowToBook(r: BookRow): Book {
    const fileAs = r.file_as;
    return {
      id: r.id,
      filename: r.filename,
      path: r.path,
      title: r.title,
      fileAs,
      author: r.author,
      description: r.description,
      publisher: r.publisher,
      series: r.series,
      seriesIndex: r.series_index,
      identifiers: JSON.parse(r.identifiers) as { scheme: string; value: string }[],
      subjects: JSON.parse(r.subjects) as string[],
      hasCover: Boolean(r.has_cover),
      size: r.size,
      mtime: new Date(r.mtime),
      addedAt: new Date(r.added_at),
    };
  }
}

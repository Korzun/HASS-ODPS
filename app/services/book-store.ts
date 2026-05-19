import * as fs from 'fs';
import * as path from 'path';
import { Database as DB } from 'better-sqlite3';
import { Book, EpubMeta } from '../types';
import { parseEpub, partialMD5 } from './epub-parser';
import { logger } from '../logger';
import { downloadFilename } from '../utils/download-filename';

const log = logger('BookStore');

export class BookHashCollisionError extends Error {
  constructor(public readonly collidingId: string) {
    super(`Book hash collision: edited content matches existing book "${collidingId}"`);
    this.name = 'BookHashCollisionError';
  }
}

export class BookAlreadyExistsError extends Error {
  constructor(public readonly existingId: string) {
    super(`Book with id "${existingId}" already exists in the library`);
    this.name = 'BookAlreadyExistsError';
  }
}

interface BookRow {
  id: string;
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
  chapter_count: number;
  chapter_spine_map: string;
  chapter_names: string | null;
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
    this.db.exec('PRAGMA foreign_keys = ON');
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
        publisher     TEXT    NOT NULL DEFAULT '',
        series        TEXT    NOT NULL DEFAULT '',
        series_index  REAL    NOT NULL DEFAULT 0,
        identifiers   TEXT    NOT NULL DEFAULT '[]',
        subjects      TEXT    NOT NULL DEFAULT '[]',
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

    if (user_version < 4) {
      const cols = this.db.prepare('PRAGMA table_info(books)').all() as Array<{ name: string }>;
      const colNames = new Set(cols.map((c) => c.name));
      if (!colNames.has('chapter_count')) {
        this.db.exec(`ALTER TABLE books ADD COLUMN chapter_count INTEGER NOT NULL DEFAULT 0`);
      }
      if (!colNames.has('chapter_spine_map')) {
        this.db.exec(`ALTER TABLE books ADD COLUMN chapter_spine_map TEXT NOT NULL DEFAULT '[]'`);
      }
      this.db.exec('PRAGMA user_version = 4');
    }

    if (user_version < 5) {
      const cols = this.db.prepare('PRAGMA table_info(books)').all() as Array<{ name: string }>;
      if (!cols.some((c) => c.name === 'chapter_names')) {
        this.db.exec(`ALTER TABLE books ADD COLUMN chapter_names TEXT`);
      }
      this.db.exec('PRAGMA user_version = 5');
    }

    if (user_version < 6) {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS book_thumbnails (
          book_id  TEXT    NOT NULL REFERENCES books(id) ON DELETE CASCADE ON UPDATE CASCADE,
          width    INTEGER NOT NULL,
          data     BLOB    NOT NULL,
          mime     TEXT    NOT NULL,
          PRIMARY KEY (book_id, width)
        )
      `);
      this.db.exec('PRAGMA user_version = 6');
    }
  }

  addBook(id: string, srcPath: string, meta: EpubMeta): void {
    const existing = this.db.prepare('SELECT 1 FROM books WHERE id = ?').get(id);
    if (existing) {
      throw new BookAlreadyExistsError(id);
    }

    const targetPath = path.join(this.booksDir, id + '.epub');
    if (path.resolve(srcPath) !== path.resolve(targetPath)) {
      fs.renameSync(srcPath, targetPath);
    }

    const stat = fs.statSync(targetPath);
    const filename = id + '.epub';
    const title = meta.title.trim();
    const fileAs = (meta.fileAs || '').trim();

    this.db
      .prepare(
        `
      INSERT INTO books (id, filename, path, title, file_as, author, description, publisher,
                         series, series_index, identifiers, subjects, cover_data, cover_mime,
                         size, mtime, added_at, chapter_count, chapter_spine_map, chapter_names)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        id,
        filename,
        targetPath,
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
        stat.size,
        stat.mtimeMs,
        Date.now(),
        meta.chapterCount,
        JSON.stringify(meta.chapterSpineMap),
        JSON.stringify(meta.chapterNames)
      );
  }

  listBooks(): Book[] {
    const rows = this.db
      .prepare(
        `
      SELECT id, title, file_as, author, description, publisher, series, series_index,
             identifiers, subjects, cover_data IS NOT NULL AS has_cover, size, mtime, added_at,
             chapter_count, chapter_spine_map, chapter_names
      FROM books
      ORDER BY CASE WHEN file_as != '' THEN file_as ELSE title END, title, id
    `
      )
      .all() as BookRow[];
    return rows.map((r) => this.rowToBook(r));
  }

  getBookById(id: string): Book | null {
    const row = this.db
      .prepare(
        `
      SELECT id, title, file_as, author, description, publisher, series, series_index,
             identifiers, subjects, cover_data IS NOT NULL AS has_cover, size, mtime, added_at,
             chapter_count, chapter_spine_map, chapter_names
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

  reimportBook(id: string, importer: ScanImporter = defaultImporter): Book | null {
    const row = this.db.prepare('SELECT path, filename FROM books WHERE id = ?').get(id) as
      | { path: string; filename: string }
      | undefined;
    if (!row) return null;

    let stat: fs.Stats;
    try {
      stat = fs.statSync(row.path);
    } catch {
      return null;
    }
    const meta = importer.parseEpub(row.path);
    const newId = importer.partialMD5(row.path);

    const progressExists = this.db
      .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='progress'")
      .get();

    if (newId !== id && this.db.prepare('SELECT 1 FROM books WHERE id = ?').get(newId)) {
      throw new BookHashCollisionError(newId);
    }

    this.db.transaction(() => {
      if (newId !== id) {
        this.db
          .prepare(
            `UPDATE books SET id=?, title=?, file_as=?, author=?, description=?, publisher=?,
             series=?, series_index=?, identifiers=?, subjects=?, cover_data=?, cover_mime=?,
             size=?, mtime=?, chapter_count=?, chapter_spine_map=?, chapter_names=? WHERE id=?`
          )
          .run(
            newId,
            meta.title.trim() || path.basename(row.filename, path.extname(row.filename)),
            (meta.fileAs || '').trim(),
            meta.author,
            meta.description,
            meta.publisher,
            meta.series,
            meta.seriesIndex,
            JSON.stringify(meta.identifiers),
            JSON.stringify(meta.subjects),
            meta.coverData,
            meta.coverMime,
            stat.size,
            stat.mtime.getTime(),
            meta.chapterCount,
            JSON.stringify(meta.chapterSpineMap),
            JSON.stringify(meta.chapterNames),
            id
          );
        if (progressExists) {
          // For users with progress under both ids, keep whichever record is newer
          type Conflict = { username: string; old_ts: number; new_ts: number };
          const conflicts = this.db
            .prepare(
              `SELECT p1.username, p1.timestamp AS old_ts, p2.timestamp AS new_ts
               FROM progress p1
               JOIN progress p2 ON p1.username = p2.username AND p2.document = ?
               WHERE p1.document = ?`
            )
            .all(newId, id) as Conflict[];
          for (const c of conflicts) {
            if (c.old_ts >= c.new_ts) {
              this.db
                .prepare('DELETE FROM progress WHERE username = ? AND document = ?')
                .run(c.username, newId);
            } else {
              this.db
                .prepare('DELETE FROM progress WHERE username = ? AND document = ?')
                .run(c.username, id);
            }
          }
          this.db.prepare('UPDATE progress SET document=? WHERE document=?').run(newId, id);
        }
      } else {
        this.db
          .prepare(
            `UPDATE books SET title=?, file_as=?, author=?, description=?, publisher=?,
             series=?, series_index=?, identifiers=?, subjects=?, cover_data=?, cover_mime=?,
             size=?, mtime=?, chapter_count=?, chapter_spine_map=?, chapter_names=? WHERE id=?`
          )
          .run(
            meta.title.trim() || path.basename(row.filename, path.extname(row.filename)),
            (meta.fileAs || '').trim(),
            meta.author,
            meta.description,
            meta.publisher,
            meta.series,
            meta.seriesIndex,
            JSON.stringify(meta.identifiers),
            JSON.stringify(meta.subjects),
            meta.coverData,
            meta.coverMime,
            stat.size,
            stat.mtime.getTime(),
            meta.chapterCount,
            JSON.stringify(meta.chapterSpineMap),
            JSON.stringify(meta.chapterNames),
            id
          );
      }
    })();

    return this.getBookById(newId);
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

  saveThumbnail(bookId: string, width: number, data: Buffer, mime: string): void {
    this.db
      .prepare(
        `INSERT INTO book_thumbnails (book_id, width, data, mime) VALUES (?, ?, ?, ?)
         ON CONFLICT (book_id, width) DO UPDATE SET data = excluded.data, mime = excluded.mime`
      )
      .run(bookId, width, data, mime);
  }

  getThumbnail(bookId: string, width: number): { data: Buffer; mime: string } | null {
    const row = this.db
      .prepare('SELECT data, mime FROM book_thumbnails WHERE book_id = ? AND width = ?')
      .get(bookId, width) as { data: Buffer; mime: string } | undefined;
    return row ?? null;
  }

  pruneThumbnails(configuredWidths: number[]): number {
    if (configuredWidths.length === 0) {
      return this.db.prepare('DELETE FROM book_thumbnails').run().changes;
    }
    const placeholders = configuredWidths.map(() => '?').join(', ');
    return this.db
      .prepare(`DELETE FROM book_thumbnails WHERE width NOT IN (${placeholders})`)
      .run(...configuredWidths).changes;
  }

  getMissingThumbnailPairs(widths: number[]): Array<{ bookId: string; width: number }> {
    const result: Array<{ bookId: string; width: number }> = [];
    const stmt = this.db.prepare(
      `SELECT id AS bookId FROM books
       WHERE cover_data IS NOT NULL
         AND id NOT IN (SELECT book_id FROM book_thumbnails WHERE width = ?)`
    );
    for (const width of widths) {
      const rows = stmt.all(width) as { bookId: string }[];
      for (const { bookId } of rows) {
        result.push({ bookId, width });
      }
    }
    return result;
  }

  scan(importer: ScanImporter = defaultImporter): { imported: string[]; removed: string[] } {
    const imported: string[] = [];
    const removed: string[] = [];

    const dbDiskNames = this.db.prepare('SELECT id, filename FROM books').all() as Array<{
      id: string;
      filename: string;
    }>;
    const dbFilenames = new Set(dbDiskNames.map((r) => r.filename));

    const diskFilenames: string[] = fs.existsSync(this.booksDir)
      ? fs.readdirSync(this.booksDir).filter((f) => path.extname(f).toLowerCase() === '.epub')
      : [];
    const diskFilenameSet = new Set(diskFilenames);

    // Import new files: on disk but not in DB
    for (const filename of diskFilenames) {
      if (dbFilenames.has(filename)) continue;
      const filePath = path.join(this.booksDir, filename);
      try {
        const meta = importer.parseEpub(filePath);
        const id = importer.partialMD5(filePath);
        const titleFallback = meta.title.trim() || path.basename(filename, path.extname(filename));
        this.addBook(id, filePath, { ...meta, title: titleFallback });
        imported.push(filename);
      } catch (err: unknown) {
        log.warn(
          `scan: skipping "${filename}" — ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    // Remove stale entries: in DB but file no longer on disk
    for (const row of dbDiskNames) {
      if (!diskFilenameSet.has(row.filename)) {
        this.removeStaleBook(row.id);
        removed.push(row.filename);
      }
    }

    return { imported, removed };
  }

  private rowToBook(r: BookRow): Book {
    const fileAs = r.file_as;
    return {
      id: r.id,
      filename: downloadFilename({
        author: r.author,
        series: r.series,
        seriesIndex: r.series_index,
        title: r.title,
      }),
      path: path.join(this.booksDir, r.id + '.epub'),
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
      chapterCount: r.chapter_count,
      chapterSpineMap: JSON.parse(r.chapter_spine_map) as number[],
      chapterNames: r.chapter_names ? (JSON.parse(r.chapter_names) as string[]) : [],
    };
  }
}

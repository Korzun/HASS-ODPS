import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as crypto from 'crypto';
import Database from 'better-sqlite3';
import { BookStore, ScanImporter } from './book-store';
import { EpubMeta } from '../types';

const FAKE_META: EpubMeta = {
  title: 'Test Book',
  author: 'Author Name',
  description: 'A test description',
  series: 'Test Series',
  seriesIndex: 1,
  fileAs: '',
  coverData: Buffer.from('fake-cover'),
  coverMime: 'image/jpeg',
};

let db: InstanceType<typeof Database>;
let booksDir: string;
let bookStore: BookStore;

beforeEach(() => {
  booksDir = fs.mkdtempSync(path.join(os.tmpdir(), 'books-test-'));
  db = new Database(':memory:');
  bookStore = new BookStore(booksDir, db);
});

afterEach(() => {
  db.close();
  fs.rmSync(booksDir, { recursive: true });
});

describe('addBook and listBooks', () => {
  it('inserts a book and lists it', () => {
    bookStore.addBook('abc123', 'test.epub', '/books/test.epub', 1000, new Date(1000), FAKE_META);
    const books = bookStore.listBooks();
    expect(books).toHaveLength(1);
    expect(books[0].id).toBe('abc123');
    expect(books[0].title).toBe('Test Book');
    expect(books[0].author).toBe('Author Name');
    expect(books[0].hasCover).toBe(true);
  });

  it('upserts on same filename', () => {
    bookStore.addBook('id1', 'dupe.epub', '/books/dupe.epub', 100, new Date(), FAKE_META);
    bookStore.addBook('id2', 'dupe.epub', '/books/dupe.epub', 200, new Date(), { ...FAKE_META, title: 'Updated' });
    const books = bookStore.listBooks();
    expect(books).toHaveLength(1);
    expect(books[0].title).toBe('Updated');
  });

  it('sorts by title', () => {
    bookStore.addBook('id1', 'b.epub', '/books/b.epub', 100, new Date(), { ...FAKE_META, title: 'Zebra' });
    bookStore.addBook('id2', 'a.epub', '/books/a.epub', 100, new Date(), { ...FAKE_META, title: 'Apple' });
    const books = bookStore.listBooks();
    expect(books[0].title).toBe('Apple');
    expect(books[1].title).toBe('Zebra');
  });

  it('returns hasCover false when no cover', () => {
    bookStore.addBook('id1', 'nocover.epub', '/books/nocover.epub', 100, new Date(), { ...FAKE_META, coverData: null, coverMime: null });
    const books = bookStore.listBooks();
    expect(books[0].hasCover).toBe(false);
  });

  it('uses filename stem as title fallback when title is empty', () => {
    bookStore.addBook('id-empty', 'my-book.epub', '/books/my-book.epub', 100, new Date(), { ...FAKE_META, title: '' });
    const book = bookStore.getBookById('id-empty');
    expect(book!.title).toBe('my-book');
  });

  it('persists fileAs on stored books', () => {
    bookStore.addBook('abc123', 'test.epub', '/books/test.epub', 1000, new Date(1000), {
      ...FAKE_META,
      fileAs: 'Asimov, Isaac',
    });

    const book = bookStore.getBookById('abc123');

    expect(book!.fileAs).toBe('Asimov, Isaac');
  });

  it('stores trimmed fileAs even when metadata has extra whitespace', () => {
    bookStore.addBook('trim1', 'whitespace.epub', '/books/whitespace.epub', 1000, new Date(1000), {
      ...FAKE_META,
      fileAs: '  Asimov, Isaac  ',
    });

    const book = bookStore.getBookById('trim1');
    expect(book!.fileAs).toBe('Asimov, Isaac');
  });

  it('sorts by fileAs before title', () => {
    bookStore.addBook('id1', 'zebra.epub', '/books/zebra.epub', 100, new Date(), {
      ...FAKE_META,
      title: 'Zebra Stories',
      fileAs: 'Apple, A.',
    });
    bookStore.addBook('id2', 'apple.epub', '/books/apple.epub', 100, new Date(), {
      ...FAKE_META,
      title: 'Apple Stories',
      fileAs: 'Zulu, Z.',
    });

    const books = bookStore.listBooks();

    expect(books[0].title).toBe('Zebra Stories');
    expect(books[1].title).toBe('Apple Stories');
  });

  it('falls back to title when fileAs is empty', () => {
    bookStore.addBook('id1', 'b.epub', '/books/b.epub', 100, new Date(), { ...FAKE_META, title: 'Bravo', fileAs: '' });
    bookStore.addBook('id2', 'a.epub', '/books/a.epub', 100, new Date(), { ...FAKE_META, title: 'Alpha', fileAs: '' });

    const books = bookStore.listBooks();

    expect(books[0].title).toBe('Alpha');
    expect(books[1].title).toBe('Bravo');
  });
});

describe('getBookById', () => {
  it('returns the book by id', () => {
    bookStore.addBook('myid', 'mybook.epub', '/books/mybook.epub', 500, new Date(), FAKE_META);
    const book = bookStore.getBookById('myid');
    expect(book).not.toBeNull();
    expect(book!.filename).toBe('mybook.epub');
  });

  it('returns null for unknown id', () => {
    expect(bookStore.getBookById('unknown')).toBeNull();
  });
});

describe('deleteBook', () => {
  it('removes book from db and returns it', () => {
    bookStore.addBook('del1', 'delete-me.epub', '/books/delete-me.epub', 100, new Date(), FAKE_META);
    const deleted = bookStore.deleteBook('del1');
    expect(deleted).not.toBeNull();
    expect(deleted!.id).toBe('del1');
    expect(bookStore.listBooks()).toHaveLength(0);
  });

  it('returns null for unknown id', () => {
    expect(bookStore.deleteBook('nope')).toBeNull();
  });
});

describe('getCover', () => {
  it('returns cover data and mime', () => {
    bookStore.addBook('cov1', 'cover-book.epub', '/books/cover-book.epub', 100, new Date(), FAKE_META);
    const cover = bookStore.getCover('cov1');
    expect(cover).not.toBeNull();
    expect(cover!.data).toEqual(Buffer.from('fake-cover'));
    expect(cover!.mime).toBe('image/jpeg');
  });

  it('returns null when no cover', () => {
    bookStore.addBook('nocov', 'no-cover.epub', '/books/no-cover.epub', 100, new Date(), { ...FAKE_META, coverData: null, coverMime: null });
    expect(bookStore.getCover('nocov')).toBeNull();
  });

  it('returns null for unknown id', () => {
    expect(bookStore.getCover('unknown')).toBeNull();
  });
});

// ── scan() ───────────────────────────────────────────────────────────────────

function makeMockImporter(): ScanImporter {
  return {
    parseEpub: (_filePath: string): EpubMeta => ({
      title: 'Mock Title',
      author: 'Mock Author',
      description: '',
      series: '',
      seriesIndex: 0,
      fileAs: '',
      coverData: null,
      coverMime: null,
    }),
    partialMD5: (filePath: string): string =>
      crypto.createHash('md5').update(filePath).digest('hex'),
  };
}

describe('BookStore.scan()', () => {
  it('returns empty lists when booksDir is empty and DB is empty', () => {
    const result = bookStore.scan(makeMockImporter());
    expect(result).toEqual({ imported: [], removed: [] });
  });

  it('imports an epub found on disk but not in DB', () => {
    const filePath = path.join(booksDir, 'new-book.epub');
    fs.writeFileSync(filePath, 'fake-epub-content');
    const result = bookStore.scan(makeMockImporter());
    expect(result.imported).toEqual(['new-book.epub']);
    expect(result.removed).toEqual([]);
    const books = bookStore.listBooks();
    expect(books).toHaveLength(1);
    expect(books[0].filename).toBe('new-book.epub');
    expect(books[0].title).toBe('Mock Title');
  });

  it('does not re-import a book already in the DB', () => {
    const filePath = path.join(booksDir, 'existing.epub');
    fs.writeFileSync(filePath, 'fake-epub-content');
    bookStore.scan(makeMockImporter()); // first scan imports it
    const result = bookStore.scan(makeMockImporter()); // second scan is a no-op
    expect(result.imported).toEqual([]);
    expect(result.removed).toEqual([]);
    expect(bookStore.listBooks()).toHaveLength(1);
  });

  it('removes a stale DB entry whose file no longer exists on disk', () => {
    const fakePath = path.join(booksDir, 'ghost.epub');
    // Add directly to DB without creating the file
    bookStore.addBook('ghostid001', 'ghost.epub', fakePath, 100, new Date(), {
      title: 'Ghost Book', author: '', description: '', series: '',
      seriesIndex: 0, fileAs: '', coverData: null, coverMime: null,
    });
    expect(bookStore.listBooks()).toHaveLength(1);
    const result = bookStore.scan(makeMockImporter());
    expect(result.removed).toEqual(['ghost.epub']);
    expect(result.imported).toEqual([]);
    expect(bookStore.listBooks()).toHaveLength(0);
  });

  it('skips a file that fails to parse and continues scanning others', () => {
    fs.writeFileSync(path.join(booksDir, 'bad.epub'), 'bad');
    fs.writeFileSync(path.join(booksDir, 'good.epub'), 'good');
    const errorImporter: ScanImporter = {
      parseEpub: (filePath: string): EpubMeta => {
        if (filePath.includes('bad')) throw new Error('parse failed');
        return { title: 'Good', author: '', description: '', series: '',
          seriesIndex: 0, fileAs: '', coverData: null, coverMime: null };
      },
      partialMD5: (filePath: string): string =>
        crypto.createHash('md5').update(filePath).digest('hex'),
    };
    const result = bookStore.scan(errorImporter);
    expect(result.imported).toHaveLength(1);
    expect(result.imported).toContain('good.epub');
    expect(result.removed).toEqual([]);
  });

  it('ignores non-epub files in booksDir', () => {
    fs.writeFileSync(path.join(booksDir, 'readme.txt'), 'text');
    fs.writeFileSync(path.join(booksDir, 'book.epub'), 'epub');
    const result = bookStore.scan(makeMockImporter());
    expect(result.imported).toEqual(['book.epub']);
  });
});

describe('migrations', () => {
  it('adds the file_as column when opening an existing books table', () => {
    const preexistingDb = new Database(':memory:');
    preexistingDb.exec(`
      CREATE TABLE books (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL UNIQUE,
        path TEXT NOT NULL,
        title TEXT NOT NULL,
        author TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        series TEXT NOT NULL DEFAULT '',
        series_index REAL NOT NULL DEFAULT 0,
        cover_data BLOB,
        cover_mime TEXT,
        size INTEGER NOT NULL,
        mtime INTEGER NOT NULL,
        added_at INTEGER NOT NULL
      )
    `);

    const migratedStore = new BookStore(booksDir, preexistingDb);
    const columns = preexistingDb.prepare('PRAGMA table_info(books)').all() as Array<{ name: string }>;

    expect(columns.some(column => column.name === 'file_as')).toBe(true);
    expect(migratedStore.listBooks()).toEqual([]);

    preexistingDb.close();
  });
});

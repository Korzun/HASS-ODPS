import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import Database from 'better-sqlite3';
import { BookStore } from '../app/services/BookStore';
import { EpubMeta } from '../app/types';

const FAKE_META: EpubMeta = {
  title: 'Test Book',
  author: 'Author Name',
  description: 'A test description',
  series: 'Test Series',
  seriesIndex: 1,
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

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { BookStore } from '../app/services/BookStore';

let booksDir: string;
let store: BookStore;

beforeEach(() => {
  booksDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hass-odps-books-'));
  store = new BookStore(booksDir);
});

afterEach(() => {
  fs.rmSync(booksDir, { recursive: true });
});

describe('BookStore.listBooks', () => {
  it('returns empty array when directory is empty', () => {
    expect(store.listBooks()).toEqual([]);
  });

  it('returns empty array when directory does not exist', () => {
    const s = new BookStore('/tmp/does-not-exist-hass-odps');
    expect(s.listBooks()).toEqual([]);
  });

  it('includes supported formats', () => {
    fs.writeFileSync(path.join(booksDir, 'book.epub'), 'epub-content');
    fs.writeFileSync(path.join(booksDir, 'manual.pdf'), 'pdf-content');
    const books = store.listBooks();
    expect(books).toHaveLength(2);
    expect(books.map(b => b.ext)).toEqual(expect.arrayContaining(['.epub', '.pdf']));
  });

  it('skips unsupported file formats', () => {
    fs.writeFileSync(path.join(booksDir, 'notes.txt'), 'text');
    fs.writeFileSync(path.join(booksDir, 'book.epub'), 'epub');
    expect(store.listBooks()).toHaveLength(1);
  });

  it('sets correct metadata fields', () => {
    fs.writeFileSync(path.join(booksDir, 'My Great Book.epub'), 'x');
    const [book] = store.listBooks();
    expect(book.title).toBe('My Great Book');
    expect(book.ext).toBe('.epub');
    expect(book.mimeType).toBe('application/epub+zip');
    expect(book.filename).toBe('My Great Book.epub');
    expect(typeof book.id).toBe('string');
    expect(book.id).toHaveLength(16);
  });
});

describe('BookStore.getBookById', () => {
  it('returns the correct book', () => {
    fs.writeFileSync(path.join(booksDir, 'book.epub'), 'x');
    const [book] = store.listBooks();
    expect(store.getBookById(book.id)).toMatchObject({ filename: 'book.epub' });
  });

  it('returns null for unknown id', () => {
    expect(store.getBookById('deadbeefdeadbeef')).toBeNull();
  });
});

describe('BookStore.deleteBook', () => {
  it('deletes the file and returns the deleted book', () => {
    const bookPath = path.join(booksDir, 'book.epub');
    fs.writeFileSync(bookPath, 'x');
    const [book] = store.listBooks();
    expect(store.deleteBook(book.id)).not.toBeNull();
    expect(fs.existsSync(bookPath)).toBe(false);
  });

  it('returns null for unknown id', () => {
    expect(store.deleteBook('deadbeefdeadbeef')).toBeNull();
  });
});

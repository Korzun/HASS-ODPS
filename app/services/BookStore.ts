import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Book } from '../types';

const SUPPORTED: Record<string, string> = {
  '.epub': 'application/epub+zip',
  '.pdf': 'application/pdf',
  '.mobi': 'application/x-mobipocket-ebook',
  '.cbz': 'application/x-cbz',
  '.cbr': 'application/x-cbr',
};

export class BookStore {
  constructor(private readonly booksDir: string) {}

  getBooksDir(): string {
    return this.booksDir;
  }

  static bookId(relativePath: string): string {
    return crypto.createHash('sha256').update(relativePath).digest('hex').slice(0, 16);
  }

  listBooks(): Book[] {
    if (!fs.existsSync(this.booksDir)) return [];

    return fs
      .readdirSync(this.booksDir)
      .filter(filename => {
        const ext = path.extname(filename).toLowerCase();
        return ext in SUPPORTED;
      })
      .map(filename => {
        const ext = path.extname(filename).toLowerCase();
        const absolutePath = path.join(this.booksDir, filename);
        const stat = fs.statSync(absolutePath);
        return {
          id: BookStore.bookId(filename),
          filename,
          path: absolutePath,
          relativePath: filename,
          title: path.basename(filename, ext),
          size: stat.size,
          ext,
          mimeType: SUPPORTED[ext],
          mtime: stat.mtime,
        } satisfies Book;
      })
      .filter(b => fs.statSync(b.path).isFile())
      .sort((a, b) => a.title.localeCompare(b.title));
  }

  getBookById(id: string): Book | null {
    return this.listBooks().find(b => b.id === id) ?? null;
  }

  deleteBook(id: string): boolean {
    const book = this.getBookById(id);
    if (!book) return false;
    fs.unlinkSync(book.path);
    return true;
  }
}

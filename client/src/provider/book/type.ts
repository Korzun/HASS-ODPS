export type BookList = Record<string, Book>;

export type Book = {
  id: string;
  title: string;
  author: string;
  fileAs: string;
  publisher: string;
  series: string;
  seriesIndex: number;
  description?: string; // stripped from GET /api/books (list), present on GET /api/books/:id
  subjects: string[];
  identifiers: Identifier[];
  hasCover: boolean;
  size: number;
  addedAt: string;
}

export type Identifier = { scheme: string; value: string };

export type Series = Record<string, BookList>;

export type UploadResult = { uploaded: string[] }

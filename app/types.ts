export interface Book {
  id: string; // 32-char partial MD5 (KoReader binary algorithm) — matches KOSync progress.document
  filename: string;
  path: string;
  title: string;
  fileAs: string;
  author: string;
  description: string;
  series: string;
  seriesIndex: number; // REAL — supports fractional entries like 2.5
  hasCover: boolean; // true when cover blob is present in SQLite
  size: number;
  mtime: Date;
  addedAt: Date;
}

export interface EpubMeta {
  title: string;
  fileAs: string;
  author: string;
  description: string;
  series: string;
  seriesIndex: number;
  coverData: Buffer | null;
  coverMime: string | null;
}

export interface Progress {
  document: string;
  progress: string;
  percentage: number;
  device: string;
  device_id: string;
  timestamp: number;
}

export interface AppConfig {
  username: string;
  password: string;
  booksDir: string;
  dataDir: string;
  port: number;
}

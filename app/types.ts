export interface Book {
  id: string;           // SHA-256 of relativePath, first 16 hex chars
  filename: string;     // e.g. "My Book.epub"
  path: string;         // absolute path
  relativePath: string; // relative to booksDir, e.g. "My Book.epub"
  title: string;        // filename without extension
  size: number;         // bytes
  ext: string;          // e.g. ".epub"
  mimeType: string;     // e.g. "application/epub+zip"
  mtime: Date;
}

export interface Progress {
  document: string;     // document hash sent by KoReader
  progress: string;     // e.g. "/body/DocFragment[23]"
  percentage: number;   // 0.0–1.0
  device: string;
  device_id: string;
  timestamp: number;    // Unix seconds
}

export interface AppConfig {
  username: string;
  password: string;
  booksDir: string;
  dataDir: string;
  port: number;
}

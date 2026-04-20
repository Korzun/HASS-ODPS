export interface Book {
  id: string;
  title: string;
  author: string;
  fileAs: string;
  publisher: string;
  series: string;
  seriesIndex: number;
  description?: string; // stripped from GET /api/books (list), present on GET /api/books/:id
  subjects: string[];
  identifiers: { scheme: string; value: string }[];
  hasCover: boolean;
  size: number;
  addedAt: string;
}

export interface User {
  username: string;
  progressCount: number;
}

export interface Progress {
  document: string;
  percentage: number;
  device?: string;    // present on GET /api/users/:username/progress (admin), absent on GET /api/my/progress
  timestamp?: number; // present on GET /api/users/:username/progress (admin), absent on GET /api/my/progress
}

export interface CurrentUser {
  username: string;
  isAdmin: boolean;
}

export interface UploadResult {
  uploaded: string[];
}

export interface ScanResult {
  imported: string[];
  removed: string[];
}

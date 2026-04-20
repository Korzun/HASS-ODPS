export interface Book {
  id: string;
  title: string;
  author: string | null;
  fileAs: string | null;
  publisher: string | null;
  series: string | null;
  seriesIndex: number | null;
  description: string | null;
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
  device: string;
  timestamp: number;
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

import type { Book, ScanResult, UploadResult } from '../types';

export async function getBooks(): Promise<Book[]> {
  const res = await fetch('/api/books');
  if (!res.ok) throw new Error('Failed to fetch books');
  return res.json() as Promise<Book[]>;
}

export async function getBook(id: string): Promise<Book> {
  const res = await fetch(`/api/books/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error('Book not found');
  return res.json() as Promise<Book>;
}

export async function deleteBook(id: string): Promise<void> {
  const res = await fetch(`/api/books/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (res.status !== 204) throw new Error('Failed to delete book');
}

export async function uploadBooks(files: FileList): Promise<UploadResult> {
  const fd = new FormData();
  for (const f of files) fd.append('files', f);
  const res = await fetch('/api/books/upload', { method: 'POST', body: fd });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? 'Upload failed');
  }
  return res.json() as Promise<UploadResult>;
}

export async function scanLibrary(): Promise<ScanResult> {
  const res = await fetch('/api/books/scan', { method: 'POST' });
  if (!res.ok) throw new Error('Scan failed');
  return res.json() as Promise<ScanResult>;
}

export async function patchBookMetadata(id: string, data: FormData): Promise<Book> {
  const res = await fetch(`/api/books/${encodeURIComponent(id)}/metadata`, {
    method: 'PATCH',
    body: data,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? 'Save failed');
  }
  return res.json() as Promise<Book>;
}

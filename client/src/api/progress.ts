import type { Progress } from '../types';

export async function getMyProgress(): Promise<Progress[]> {
  const res = await fetch('/api/my/progress');
  if (!res.ok) throw new Error('Failed to fetch progress');
  return res.json() as Promise<Progress[]>;
}

export async function deleteMyProgress(bookId: string): Promise<void> {
  const res = await fetch(`/api/my/progress/${encodeURIComponent(bookId)}`, {
    method: 'DELETE',
  });
  if (res.status !== 204) throw new Error('Failed to clear progress');
}

import type { Progress, User } from '../types';

export async function getUsers(): Promise<User[]> {
  const res = await fetch('/api/users');
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json() as Promise<User[]>;
}

export async function getUserProgress(username: string): Promise<Progress[]> {
  const res = await fetch(`/api/users/${encodeURIComponent(username)}/progress`);
  if (!res.ok) throw new Error('Failed to fetch progress');
  return res.json() as Promise<Progress[]>;
}

export async function deleteUser(username: string): Promise<void> {
  const res = await fetch(`/api/users/${encodeURIComponent(username)}`, { method: 'DELETE' });
  if (res.status !== 204) throw new Error('Failed to delete user');
}

export async function deleteUserProgress(username: string, docId: string): Promise<void> {
  const res = await fetch(
    `/api/users/${encodeURIComponent(username)}/progress/${encodeURIComponent(docId)}`,
    { method: 'DELETE' }
  );
  if (res.status !== 204) throw new Error('Failed to clear progress');
}

export async function registerUser(username: string, password: string): Promise<void> {
  const res = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (res.status === 409) throw new Error('Username already taken');
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? 'Registration failed');
  }
}

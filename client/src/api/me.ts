import type { CurrentUser } from '../types';

export async function getMe(): Promise<CurrentUser> {
  const res = await fetch('/api/me');
  if (!res.ok) throw new Error('Not authenticated');
  return res.json() as Promise<CurrentUser>;
}

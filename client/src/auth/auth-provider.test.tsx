import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './auth-provider';
import { describe, it, expect, vi, afterEach } from 'vitest';

function UserDisplay() {
  const { username, isAdmin } = useAuth();
  return (
    <div>
      <span data-testid="username">{username}</span>
      <span data-testid="is-admin">{String(isAdmin)}</span>
    </div>
  );
}

describe('AuthProvider', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('fetches /api/me and provides user info', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ username: 'admin', isAdmin: true }),
    }));
    render(<AuthProvider><UserDisplay /></AuthProvider>);
    await waitFor(() =>
      expect(screen.getByTestId('username').textContent).toBe('admin')
    );
    expect(screen.getByTestId('is-admin').textContent).toBe('true');
  });

  it('defaults to empty user when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    render(<AuthProvider><UserDisplay /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('username').textContent).toBe(''));
    expect(screen.getByTestId('is-admin').textContent).toBe('false');
  });

  it('defaults to empty user when response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    render(<AuthProvider><UserDisplay /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('username').textContent).toBe(''));
  });
});

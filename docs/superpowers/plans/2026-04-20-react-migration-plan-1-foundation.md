# React Migration — Plan 1: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the `client/` package and implement the shared foundation — types, utilities, theme system, auth provider, API layer, and test utilities — so all subsequent plans have a working base to build on.

**Architecture:** A new `client/` directory is created as a standalone Vite + React package. It has its own `package.json`, `tsconfig.json`, and `vite.config.ts`. The Vite dev server proxies `/api` and `/logout` to the Express backend. A placeholder `main.tsx` renders a static div so the dev server can be verified immediately. The real `App.tsx` is wired up in Plan 5.

**Tech Stack:** React 18, Vite 6, Vitest 2, react-jss 10, React Router DOM 6, React Testing Library 16, TypeScript 5

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `client/package.json` | Create | Package manifest with all deps |
| `client/tsconfig.json` | Create | TypeScript config for Vite/React |
| `client/vite.config.ts` | Create | Vite + Vitest config with proxy |
| `client/index.html` | Create | Vite entry point |
| `client/src/main.tsx` | Create | Placeholder — renders static div |
| `client/src/setup.ts` | Create | Vitest setup: imports jest-dom matchers |
| `client/src/types.ts` | Create | Shared domain types (Book, User, etc.) |
| `client/src/utils.ts` | Create | `formatSize`, `relativeTime` |
| `client/src/utils.test.ts` | Create | Tests for utils |
| `client/src/theme/theme.ts` | Create | `Theme` interface + `defaultTheme` |
| `client/src/theme/theme-provider.tsx` | Create | Typed `ThemeProvider` + `useTheme` |
| `client/src/theme/theme-provider.test.tsx` | Create | Verifies token values reach children |
| `client/src/auth/auth-provider.tsx` | Create | `AuthProvider`, `useAuth`, `AuthContext` |
| `client/src/auth/auth-provider.test.tsx` | Create | Tests fetch + fallback behaviour |
| `client/src/api/me.ts` | Create | `getMe()` |
| `client/src/api/books.ts` | Create | `getBooks`, `getBook`, `deleteBook`, `uploadBooks`, `scanLibrary`, `patchBookMetadata` |
| `client/src/api/users.ts` | Create | `getUsers`, `getUserProgress`, `deleteUser`, `deleteUserProgress`, `registerUser` |
| `client/src/api/progress.ts` | Create | `getMyProgress`, `deleteMyProgress` |
| `client/src/test-utils.tsx` | Create | `renderWithProviders` helper used by all component tests |
| `package.json` (root) | Modify | Add `dev:client` and `build:client` scripts |

---

### Task 1: Scaffold client/ package

**Files:**
- Create: `client/package.json`
- Create: `client/tsconfig.json`
- Create: `client/vite.config.ts`
- Create: `client/index.html`
- Create: `client/src/main.tsx`
- Create: `client/src/setup.ts`

- [ ] **Step 1: Create `client/package.json`**

```json
{
  "name": "hass-odps-client",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-jss": "^10.10.0",
    "react-router-dom": "^6.28.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "jsdom": "^25.0.1",
    "typescript": "^5.6.3",
    "vite": "^6.0.0",
    "vitest": "^2.1.5"
  }
}
```

- [ ] **Step 2: Create `client/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `client/vite.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/logout': 'http://localhost:3000',
    },
  },
  build: {
    outDir: 'dist',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setup.ts'],
  },
});
```

- [ ] **Step 4: Create `client/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>HASS-ODPS Library</title>
    <style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: system-ui, sans-serif; background: #f3f4f6; color: #111; min-height: 100vh; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create `client/src/setup.ts`**

```ts
import '@testing-library/jest-dom';
```

- [ ] **Step 6: Create placeholder `client/src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>HASS-ODPS — scaffold OK</h1>
    </div>
  </StrictMode>
);
```

- [ ] **Step 7: Install dependencies**

```bash
cd client && npm install
```

Expected: `node_modules/` populated, no errors.

- [ ] **Step 8: Verify dev server starts**

```bash
cd client && npm run dev
```

Expected: Vite prints `Local: http://localhost:5173/`. Open in browser — should show "HASS-ODPS — scaffold OK". Stop the server (`Ctrl+C`).

- [ ] **Step 9: Commit**

```bash
git add client/
git commit -m "feat: scaffold client/ Vite + React package"
```

---

### Task 2: Shared types

**Files:**
- Create: `client/src/types.ts`

- [ ] **Step 1: Create `client/src/types.ts`**

```ts
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
```

- [ ] **Step 2: Verify TypeScript is happy**

```bash
cd client && npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/types.ts
git commit -m "feat: add shared domain types"
```

---

### Task 3: Utility functions

**Files:**
- Create: `client/src/utils.ts`
- Create: `client/src/utils.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `client/src/utils.test.ts`:

```ts
import { formatSize, relativeTime } from './utils';

describe('formatSize', () => {
  it('formats bytes', () => expect(formatSize(500)).toBe('500 B'));
  it('formats kilobytes', () => expect(formatSize(1536)).toBe('1.5 KB'));
  it('formats megabytes', () => expect(formatSize(1_048_576)).toBe('1.0 MB'));
});

describe('relativeTime', () => {
  it('returns "just now" for less than 60 seconds', () => {
    const ts = Math.floor(Date.now() / 1000) - 30;
    expect(relativeTime(ts)).toBe('just now');
  });
  it('returns minutes ago', () => {
    const ts = Math.floor(Date.now() / 1000) - 120;
    expect(relativeTime(ts)).toBe('2m ago');
  });
  it('returns hours ago', () => {
    const ts = Math.floor(Date.now() / 1000) - 7200;
    expect(relativeTime(ts)).toBe('2h ago');
  });
  it('returns days ago', () => {
    const ts = Math.floor(Date.now() / 1000) - 172_800;
    expect(relativeTime(ts)).toBe('2d ago');
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd client && npm test
```

Expected: FAIL — `Cannot find module './utils'`

- [ ] **Step 3: Create `client/src/utils.ts`**

```ts
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function relativeTime(timestamp: number): string {
  const diff = Math.floor(Date.now() / 1000) - timestamp;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd client && npm test
```

Expected: PASS — 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add client/src/utils.ts client/src/utils.test.ts
git commit -m "feat: add formatSize and relativeTime utilities"
```

---

### Task 4: Theme system

**Files:**
- Create: `client/src/theme/theme.ts`
- Create: `client/src/theme/theme-provider.tsx`
- Create: `client/src/theme/theme-provider.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `client/src/theme/theme-provider.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { ThemeProvider, useTheme } from './theme-provider';

function TokenDisplay() {
  const theme = useTheme();
  return (
    <div>
      <span data-testid="primary">{theme.colors.primary}</span>
      <span data-testid="success">{theme.colors.success}</span>
      <span data-testid="radius-sm">{theme.borderRadius.sm}</span>
      <span data-testid="shadow-card">{theme.shadows.card}</span>
    </div>
  );
}

it('provides theme tokens to children', () => {
  render(
    <ThemeProvider>
      <TokenDisplay />
    </ThemeProvider>
  );
  expect(screen.getByTestId('primary').textContent).toBe('#1e40af');
  expect(screen.getByTestId('success').textContent).toBe('#16a34a');
  expect(screen.getByTestId('radius-sm').textContent).toBe('4px');
  expect(screen.getByTestId('shadow-card').textContent).toBe('0 1px 3px rgba(0,0,0,.07)');
});
```

- [ ] **Step 2: Run — expect failure**

```bash
cd client && npm test
```

Expected: FAIL — `Cannot find module './theme-provider'`

- [ ] **Step 3: Create `client/src/theme/theme.ts`**

```ts
export interface Theme {
  colors: {
    primary: string;
    primaryHover: string;
    primaryLight: string;
    primaryBorder: string;
    danger: string;
    success: string;
    text: {
      primary: string;
      secondary: string;
      muted: string;
      faint: string;
    };
    bg: {
      page: string;
      card: string;
      input: string;
    };
    border: string;
    borderLight: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    pill: string;
  };
  shadows: {
    card: string;
    cover: string;
  };
}

export const defaultTheme: Theme = {
  colors: {
    primary: '#1e40af',
    primaryHover: '#1d4ed8',
    primaryLight: '#eff6ff',
    primaryBorder: '#bfdbfe',
    danger: '#dc2626',
    success: '#16a34a',
    text: {
      primary: '#111',
      secondary: '#374151',
      muted: '#6b7280',
      faint: '#9ca3af',
    },
    bg: {
      page: '#f3f4f6',
      card: '#fff',
      input: '#fff',
    },
    border: '#d1d5db',
    borderLight: '#e5e7eb',
  },
  borderRadius: {
    sm: '4px',
    md: '6px',
    lg: '8px',
    pill: '20px',
  },
  shadows: {
    card: '0 1px 3px rgba(0,0,0,.07)',
    cover: '0 2px 8px rgba(0,0,0,.15)',
  },
};
```

- [ ] **Step 4: Create `client/src/theme/theme-provider.tsx`**

```tsx
import { ThemeProvider as JssThemeProvider, useTheme as useJssTheme } from 'react-jss';
import type { ReactNode } from 'react';
import { defaultTheme, type Theme } from './theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  return <JssThemeProvider theme={defaultTheme}>{children}</JssThemeProvider>;
}

export function useTheme(): Theme {
  return useJssTheme<Theme>();
}
```

- [ ] **Step 5: Run — expect pass**

```bash
cd client && npm test
```

Expected: PASS — all tests pass (utils + theme).

- [ ] **Step 6: Commit**

```bash
git add client/src/theme/
git commit -m "feat: add typed ThemeProvider and useTheme hook"
```

---

### Task 5: Auth provider

**Files:**
- Create: `client/src/api/me.ts`
- Create: `client/src/auth/auth-provider.tsx`
- Create: `client/src/auth/auth-provider.test.tsx`

- [ ] **Step 1: Create `client/src/api/me.ts`**

This is needed before the auth provider can be implemented.

```ts
import type { CurrentUser } from '../types';

export async function getMe(): Promise<CurrentUser> {
  const res = await fetch('/api/me');
  if (!res.ok) throw new Error('Not authenticated');
  return res.json() as Promise<CurrentUser>;
}
```

- [ ] **Step 2: Write the failing test**

Create `client/src/auth/auth-provider.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './auth-provider';

function UserDisplay() {
  const { username, isAdmin } = useAuth();
  return (
    <div>
      <span data-testid="username">{username}</span>
      <span data-testid="is-admin">{String(isAdmin)}</span>
    </div>
  );
}

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
  await waitFor(() => {});
  expect(screen.getByTestId('username').textContent).toBe('');
  expect(screen.getByTestId('is-admin').textContent).toBe('false');
});

it('defaults to empty user when response is not ok', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
  render(<AuthProvider><UserDisplay /></AuthProvider>);
  await waitFor(() => {});
  expect(screen.getByTestId('username').textContent).toBe('');
});
```

- [ ] **Step 3: Run — expect failure**

```bash
cd client && npm test
```

Expected: FAIL — `Cannot find module './auth-provider'`

- [ ] **Step 4: Create `client/src/auth/auth-provider.tsx`**

```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getMe } from '../api/me';
import type { CurrentUser } from '../types';

const defaultUser: CurrentUser = { username: '', isAdmin: false };

export const AuthContext = createContext<CurrentUser>(defaultUser);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser>(defaultUser);

  useEffect(() => {
    getMe().then(setUser).catch(() => {});
  }, []);

  return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>;
}

export function useAuth(): CurrentUser {
  return useContext(AuthContext);
}
```

- [ ] **Step 5: Run — expect pass**

```bash
cd client && npm test
```

Expected: PASS — all tests pass.

- [ ] **Step 6: Commit**

```bash
git add client/src/api/me.ts client/src/auth/
git commit -m "feat: add AuthProvider and useAuth hook"
```

---

### Task 6: API layer

**Files:**
- Create: `client/src/api/books.ts`
- Create: `client/src/api/users.ts`
- Create: `client/src/api/progress.ts`

No tests — these are thin fetch wrappers exercised through component tests in Plans 2–5.

- [ ] **Step 1: Create `client/src/api/books.ts`**

```ts
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
```

- [ ] **Step 2: Create `client/src/api/users.ts`**

```ts
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
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? 'Registration failed');
  }
}
```

- [ ] **Step 3: Create `client/src/api/progress.ts`**

```ts
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
```

- [ ] **Step 4: Verify TypeScript is happy**

```bash
cd client && npm run lint
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add client/src/api/
git commit -m "feat: add typed API layer (books, users, progress, me)"
```

---

### Task 7: Test utilities

**Files:**
- Create: `client/src/test-utils.tsx`

Used by every component test in Plans 2–5. Wraps renders with `ThemeProvider` (so `useStyle` hooks get the real theme) and `AuthContext` (so `useAuth` gets a controllable user without triggering a fetch).

- [ ] **Step 1: Create `client/src/test-utils.tsx`**

```tsx
import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { ThemeProvider } from './theme/theme-provider';
import { AuthContext } from './auth/auth-provider';
import type { CurrentUser } from './types';

interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  user?: CurrentUser;
}

export function renderWithProviders(
  ui: ReactElement,
  {
    user = { username: '', isAdmin: false },
    ...options
  }: RenderWithProvidersOptions = {}
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ThemeProvider>
        <AuthContext.Provider value={user}>
          {children}
        </AuthContext.Provider>
      </ThemeProvider>
    );
  }
  return render(ui, { wrapper: Wrapper, ...options });
}
```

- [ ] **Step 2: Verify TypeScript is happy**

```bash
cd client && npm run lint
```

Expected: no errors.

- [ ] **Step 3: Run all tests — still passing**

```bash
cd client && npm test
```

Expected: PASS — all existing tests still pass.

- [ ] **Step 4: Commit**

```bash
git add client/src/test-utils.tsx
git commit -m "feat: add renderWithProviders test helper"
```

---

### Task 8: Root scripts

**Files:**
- Modify: `package.json` (root)

- [ ] **Step 1: Add client scripts to root `package.json`**

Add two entries to the `"scripts"` object:

```json
"dev:client": "npm run --prefix client dev",
"build:client": "npm run --prefix client build"
```

The full scripts block becomes:

```json
"scripts": {
  "build": "tsc && node -e \"const fs=require('fs');if(fs.existsSync('app/public'))fs.cpSync('app/public','dist/public',{recursive:true})\"",
  "start": "node dist/index.js",
  "test": "jest",
  "test:watch": "jest --watch",
  "lint": "eslint . && tsc --noEmit",
  "lint:fix": "eslint . --fix",
  "dev:client": "npm run --prefix client dev",
  "build:client": "npm run --prefix client build"
}
```

- [ ] **Step 2: Verify the script works from root**

```bash
npm run dev:client
```

Expected: Vite dev server starts on port 5173. Stop with `Ctrl+C`.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: add dev:client and build:client root scripts"
```

---

## Plan 1 complete

All foundation pieces are in place:
- `client/` package installs, lints, and has a working dev server
- Shared types cover all domain objects used across the app
- `formatSize` and `relativeTime` are tested
- `ThemeProvider` / `useTheme` are tested with real token values
- `AuthProvider` / `useAuth` are tested including failure fallback
- API layer is typed and ready for component use
- `renderWithProviders` is ready for Plans 2–5

**Next:** Plan 2 — Shared components (`cover-stack`, `shared/book-card`, `header`, `tab-bar`)

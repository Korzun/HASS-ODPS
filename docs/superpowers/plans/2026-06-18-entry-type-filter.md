# Entry Type Filter (Series / Single) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Series" / "Single books" `entryType` filter chip to the library search bar, enforced server-side so pagination remains correct.

**Architecture:** `entryType` is added to both the server `BookListFilters` type and the client `BookListFilter` type. The server route parses and validates it; `listBooksPage` uses two internal flags (`includeStandalones`, `includeSeries`) that already exist and only need one-line changes. The client propagates it through URL params, API calls, the suggestion hook (empty-input quick-picks), and the chip system.

**Tech Stack:** TypeScript, Express, Prisma (server); React, JSS (client); Vitest (client tests); Jest (server tests).

## Global Constraints

- Git branch: `feat/subject-filter-links` — all commits go here, never to main.
- Git remote is named `GitHub` (not `origin`) — use `git push -u GitHub <branch>` if pushing.
- React component files use kebab-case naming. Do NOT rename any existing file.
- Keep `react-hooks/exhaustive-deps` rule at error level. Never use `// eslint-disable`.
- Run `npm test` then `npm run lint` from the repo root (or `-w app/server` / `-w app/client`) after every task. Both must pass before committing.
- `entryType` values are exactly `'series'` (show only series rows) and `'standalone'` (show only standalone book rows). The display labels are `'Series'` and `'Single books'` respectively.

---

### Task 1: Server data model and filtering logic

**Files:**
- Modify: `app/server/types.ts`
- Modify: `app/server/services/book-store.ts:984-985`
- Test: `app/server/services/book-store.test.ts` (append to `describe('listBooksPage with filters', ...)`)

**Interfaces:**
- Produces: `BookListFilters.entryType?: 'series' | 'standalone'` — consumed by Task 2, and by the server route which already imports `BookListFilters`.

---

- [ ] **Step 1: Write failing tests**

Append these three tests at the end of the `describe('listBooksPage with filters', () => {` block (around line 2295 of `app/server/services/book-store.test.ts`). Each test seeds its own data — no shared `beforeEach` needed; follow the existing pattern in that describe.

```typescript
it('entryType=series returns only series display units', async () => {
  await bookStore.addBook(OWNER, 'b1', stage('b1'), {
    ...FAKE_META,
    title: 'Alpha',
    series: '',
    seriesIndex: 0,
  });
  await bookStore.addBook(OWNER, 'b2', stage('b2'), {
    ...FAKE_META,
    title: 'Dune 1',
    series: 'Dune',
    seriesIndex: 1,
  });
  const result = await bookStore.listBooksPage(OWNER, null, 20, { entryType: 'series' });
  expect(result.items).toEqual([{ type: 'series', seriesName: 'Dune' }]);
  expect(result.books).toHaveLength(1);
  expect(result.books[0].id).toBe('b2');
});

it('entryType=standalone returns only standalone display units', async () => {
  await bookStore.addBook(OWNER, 'b1', stage('b1'), {
    ...FAKE_META,
    title: 'Alpha',
    series: '',
    seriesIndex: 0,
  });
  await bookStore.addBook(OWNER, 'b2', stage('b2'), {
    ...FAKE_META,
    title: 'Dune 1',
    series: 'Dune',
    seriesIndex: 1,
  });
  const result = await bookStore.listBooksPage(OWNER, null, 20, { entryType: 'standalone' });
  expect(result.items).toEqual([{ type: 'standalone', bookId: 'b1' }]);
  expect(result.books).toHaveLength(1);
  expect(result.books[0].id).toBe('b1');
});

it('no entryType filter returns both series and standalone display units', async () => {
  await bookStore.addBook(OWNER, 'b1', stage('b1'), {
    ...FAKE_META,
    title: 'Alpha',
    series: '',
    seriesIndex: 0,
  });
  await bookStore.addBook(OWNER, 'b2', stage('b2'), {
    ...FAKE_META,
    title: 'Dune 1',
    series: 'Dune',
    seriesIndex: 1,
  });
  const result = await bookStore.listBooksPage(OWNER, null, 20, {});
  expect(result.items).toHaveLength(2);
  expect(result.items).toEqual(
    expect.arrayContaining([
      { type: 'series', seriesName: 'Dune' },
      { type: 'standalone', bookId: 'b1' },
    ])
  );
});
```

- [ ] **Step 2: Run tests and confirm they fail**

```bash
npm test -w app/server -- --testPathPattern=book-store.test
```

Expected: the three new tests fail with a TypeScript or runtime error (because `entryType` doesn't exist on `BookListFilters` yet).

- [ ] **Step 3: Add `entryType` to `BookListFilters`**

In `app/server/types.ts`, replace:

```typescript
export type BookListFilters = {
  query?: string;
  author?: string;
  seriesName?: string;
  status?: 'not-started' | 'in-progress' | 'completed';
  subjects?: string[];
};
```

with:

```typescript
export type BookListFilters = {
  query?: string;
  author?: string;
  seriesName?: string;
  status?: 'not-started' | 'in-progress' | 'completed';
  subjects?: string[];
  entryType?: 'series' | 'standalone';
};
```

- [ ] **Step 4: Update the filtering flags in `listBooksPage`**

In `app/server/services/book-store.ts`, replace the two lines at the top of `listBooksPage` (around line 984):

```typescript
    const includeStandalones = filters?.seriesName === undefined;
    const includeSeries = true;
```

with:

```typescript
    const includeStandalones = filters?.seriesName === undefined && filters?.entryType !== 'series';
    const includeSeries = filters?.entryType !== 'standalone';
```

No other change needed in `book-store.ts`.

- [ ] **Step 5: Run tests and confirm they pass**

```bash
npm test -w app/server -- --testPathPattern=book-store.test
```

Expected: all tests in the file pass, including the three new ones.

- [ ] **Step 6: Run full server test suite and lint**

```bash
npm test -w app/server && npm run lint -w app/server
```

Expected: all server tests pass, no lint errors.

- [ ] **Step 7: Commit**

```bash
git add app/server/types.ts app/server/services/book-store.ts app/server/services/book-store.test.ts
git commit -m "$(cat <<'EOF'
feat: add entryType filter to BookListFilters and listBooksPage

New entryType?: 'series' | 'standalone' field on BookListFilters;
wired to existing includeStandalones/includeSeries flags in listBooksPage.
EOF
)"
```

---

### Task 2: Server route — parse and pass `entryType`

**Files:**
- Modify: `app/server/routes/ui.ts` (the `GET /api/books` handler)
- Test: `app/server/routes/ui.test.ts` (append to `describe('GET /api/books (filtered)', ...)`)

**Interfaces:**
- Consumes: `BookListFilters.entryType` from Task 1.
- Produces: `GET /api/books?entryType=series` and `GET /api/books?entryType=standalone` work end-to-end.

---

- [ ] **Step 1: Write failing tests**

Append these three tests to the `describe('GET /api/books (filtered)', () => {` block (around line 2213 of `app/server/routes/ui.test.ts`):

```typescript
it('entryType=series returns only series rows', async () => {
  await bookStore.addBook(aliceOwner, 'sa1', stage('sa1'), {
    ...FAKE_META,
    title: 'Alpha',
    series: '',
    seriesIndex: 0,
  });
  await bookStore.addBook(aliceOwner, 'sr1', stage('sr1'), {
    ...FAKE_META,
    title: 'Dune 1',
    series: 'Dune',
    seriesIndex: 1,
  });
  const token = await loginAlice();
  const res = await request(app)
    .get('/api/books?take=20&entryType=series')
    .set(...bearer(token));
  expect(res.status).toBe(200);
  expect(res.body.items).toEqual([{ type: 'series', seriesName: 'Dune' }]);
});

it('entryType=standalone returns only standalone rows', async () => {
  await bookStore.addBook(aliceOwner, 'sa1', stage('sa1'), {
    ...FAKE_META,
    title: 'Alpha',
    series: '',
    seriesIndex: 0,
  });
  await bookStore.addBook(aliceOwner, 'sr1', stage('sr1'), {
    ...FAKE_META,
    title: 'Dune 1',
    series: 'Dune',
    seriesIndex: 1,
  });
  const token = await loginAlice();
  const res = await request(app)
    .get('/api/books?take=20&entryType=standalone')
    .set(...bearer(token));
  expect(res.status).toBe(200);
  expect(res.body.items).toEqual([{ type: 'standalone', bookId: 'sa1' }]);
});

it('invalid entryType value is silently ignored and returns all books', async () => {
  await bookStore.addBook(aliceOwner, 'sa1', stage('sa1'), {
    ...FAKE_META,
    title: 'Alpha',
    series: '',
    seriesIndex: 0,
  });
  const token = await loginAlice();
  const res = await request(app)
    .get('/api/books?take=20&entryType=invalid')
    .set(...bearer(token));
  expect(res.status).toBe(200);
  expect(res.body.items).toEqual([{ type: 'standalone', bookId: 'sa1' }]);
});
```

- [ ] **Step 2: Run tests and confirm they fail**

```bash
npm test -w app/server -- --testPathPattern=ui.test
```

Expected: the three new tests fail because the route ignores `entryType` (it's not parsed yet).

- [ ] **Step 3: Parse `entryType` in the route handler**

In `app/server/routes/ui.ts`, in the `GET /api/books` handler, replace the destructuring line (around line 411):

```typescript
    const { cursor, take, status, query, author, seriesName, subjects } = req.query;
```

with:

```typescript
    const { cursor, take, status, query, author, seriesName, subjects, entryType } = req.query;
```

Then add a validation + narrowing line immediately after the existing `status` validation block (after the closing `}`  of the status check, around line 418):

```typescript
    const entryTypeValue =
      entryType === 'series' || entryType === 'standalone' ? entryType : undefined;
```

Then include `entryTypeValue` in the `filters` condition and object. Replace the `filters` block (around lines 429–442):

```typescript
    const filters: BookListFilters | undefined =
      status !== undefined ||
      queryValue !== undefined ||
      authorValue !== undefined ||
      seriesNameValue !== undefined ||
      subjectsValue.length > 0
        ? {
            status: status as BookListFilters['status'],
            query: queryValue,
            author: authorValue,
            seriesName: seriesNameValue,
            subjects: subjectsValue.length > 0 ? subjectsValue : undefined,
          }
        : undefined;
```

with:

```typescript
    const filters: BookListFilters | undefined =
      status !== undefined ||
      queryValue !== undefined ||
      authorValue !== undefined ||
      seriesNameValue !== undefined ||
      subjectsValue.length > 0 ||
      entryTypeValue !== undefined
        ? {
            status: status as BookListFilters['status'],
            query: queryValue,
            author: authorValue,
            seriesName: seriesNameValue,
            subjects: subjectsValue.length > 0 ? subjectsValue : undefined,
            entryType: entryTypeValue,
          }
        : undefined;
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
npm test -w app/server -- --testPathPattern=ui.test
```

Expected: all tests in the file pass.

- [ ] **Step 5: Run full server test suite and lint**

```bash
npm test -w app/server && npm run lint -w app/server
```

Expected: all server tests pass, no lint errors.

- [ ] **Step 6: Commit**

```bash
git add app/server/routes/ui.ts app/server/routes/ui.test.ts
git commit -m "$(cat <<'EOF'
feat: parse entryType query param in GET /api/books route

Accepts entryType=series or entryType=standalone; invalid values
silently resolve to undefined (all books returned).
EOF
)"
```

---

### Task 3: Client data model, URL sync, and API params

**Files:**
- Modify: `app/client/src/provider/book/type.ts`
- Modify: `app/client/src/provider/book/hook/use-book-list-filter.ts`
- Modify: `app/client/src/provider/book/hook/use-fetch-book-list.ts`
- Modify: `app/client/src/provider/book/hook/use-fetch-next-page.ts`
- Test: `app/client/src/provider/book/hook/use-fetch-book-list.test.tsx`

**Interfaces:**
- Produces: `BookListFilter.entryType?: 'series' | 'standalone'` — used by Tasks 4 and 5.

---

- [ ] **Step 1: Write failing test**

In `app/client/src/provider/book/hook/use-fetch-book-list.test.tsx`, append one test to the `describe('useFetchBookList', ...)` block:

```typescript
it('appends entryType filter param to URL when bookListFilter.entryType is set', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeResponse([])),
    })
  );
  const { result } = renderHook(() => useFetchBookList(), {
    wrapper: makeWrapper({ bookListFilter: { entryType: 'series' } }),
  });
  await act(() => result.current());
  expect(fetch).toHaveBeenCalledWith('/api/books?entryType=series&take=20', {});
});
```

- [ ] **Step 2: Run test and confirm it fails**

```bash
npm test -w app/client -- use-fetch-book-list
```

Expected: the new test fails because `entryType` is not appended to the URL yet.

- [ ] **Step 3: Add `entryType` to `BookListFilter`**

In `app/client/src/provider/book/type.ts`, replace:

```typescript
export type BookListFilter = {
  query?: string;
  author?: string;
  seriesName?: string;
  status?: 'not-started' | 'in-progress' | 'completed';
  subjects?: string[];
};
```

with:

```typescript
export type BookListFilter = {
  query?: string;
  author?: string;
  seriesName?: string;
  status?: 'not-started' | 'in-progress' | 'completed';
  subjects?: string[];
  entryType?: 'series' | 'standalone';
};
```

- [ ] **Step 4: Update URL sync in `use-book-list-filter.ts`**

Replace the entire file with the following (changes: `entryType` in `filterFromSearchParams`, `filterToSearchParams`, and `filtersEqual`):

```typescript
import { useCallback, useContext, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Context } from '../context';
import type { BookListFilter } from '../type';

function filterFromSearchParams(params: URLSearchParams): BookListFilter {
  const filter: BookListFilter = {};
  const q = params.get('q');
  if (q) filter.query = q;
  const author = params.get('author');
  if (author) filter.author = author;
  const seriesName = params.get('seriesName');
  if (seriesName) filter.seriesName = seriesName;
  const status = params.get('status');
  if (status === 'not-started' || status === 'in-progress' || status === 'completed')
    filter.status = status;
  const subjects = params.getAll('subjects');
  if (subjects.length > 0) filter.subjects = subjects;
  const entryType = params.get('entryType');
  if (entryType === 'series' || entryType === 'standalone') filter.entryType = entryType;
  return filter;
}

export function filterToSearchParams(filter: BookListFilter): URLSearchParams {
  const params = new URLSearchParams();
  if (filter.query) params.set('q', filter.query);
  if (filter.author) params.set('author', filter.author);
  if (filter.seriesName) params.set('seriesName', filter.seriesName);
  if (filter.status) params.set('status', filter.status);
  for (const s of filter.subjects ?? []) params.append('subjects', s);
  if (filter.entryType) params.set('entryType', filter.entryType);
  return params;
}

function filtersEqual(a: BookListFilter, b: BookListFilter): boolean {
  return (
    a.query === b.query &&
    a.author === b.author &&
    a.seriesName === b.seriesName &&
    a.status === b.status &&
    a.entryType === b.entryType &&
    JSON.stringify([...(a.subjects ?? [])].sort()) ===
      JSON.stringify([...(b.subjects ?? [])].sort())
  );
}

export const useBookListFilter = (): [BookListFilter, (filter: BookListFilter) => void] => {
  const { bookListFilter, setBookListFilter } = useContext(Context);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const urlFilter = filterFromSearchParams(searchParams);
    if (filtersEqual(urlFilter, bookListFilter)) return;
    setBookListFilter(urlFilter);
  }, [searchParams, bookListFilter, setBookListFilter]);

  const setFilter = useCallback(
    (newFilter: BookListFilter) => {
      setBookListFilter(newFilter);
      setSearchParams(filterToSearchParams(newFilter), { replace: true });
    },
    [setBookListFilter, setSearchParams]
  );

  return [filterFromSearchParams(searchParams), setFilter];
};
```

- [ ] **Step 5: Add `entryType` param to `use-fetch-book-list.ts`**

In `app/client/src/provider/book/hook/use-fetch-book-list.ts`, add one line after the subjects loop (after line 43):

```typescript
      for (const subject of bookListFilter.subjects ?? []) {
        params.append('subjects', subject);
      }
      if (bookListFilter.entryType) params.append('entryType', bookListFilter.entryType);
```

The full params block after the change:

```typescript
      const params = new URLSearchParams();
      if (bookListFilter.query) params.append('query', bookListFilter.query);
      if (bookListFilter.author) params.append('author', bookListFilter.author);
      if (bookListFilter.seriesName) params.append('seriesName', bookListFilter.seriesName);
      if (bookListFilter.status) params.append('status', bookListFilter.status);
      for (const subject of bookListFilter.subjects ?? []) {
        params.append('subjects', subject);
      }
      if (bookListFilter.entryType) params.append('entryType', bookListFilter.entryType);
      params.append('take', '20');
```

- [ ] **Step 6: Add `entryType` param to `use-fetch-next-page.ts`**

Same one-liner in `app/client/src/provider/book/hook/use-fetch-next-page.ts`, after the subjects loop (after line 44). The full params block after the change:

```typescript
      const params = new URLSearchParams();
      params.append('cursor', nextCursor);
      if (bookListFilter.query) params.append('query', bookListFilter.query);
      if (bookListFilter.author) params.append('author', bookListFilter.author);
      if (bookListFilter.seriesName) params.append('seriesName', bookListFilter.seriesName);
      if (bookListFilter.status) params.append('status', bookListFilter.status);
      for (const subject of bookListFilter.subjects ?? []) {
        params.append('subjects', subject);
      }
      if (bookListFilter.entryType) params.append('entryType', bookListFilter.entryType);
      params.append('take', '20');
```

- [ ] **Step 7: Run tests and confirm they pass**

```bash
npm test -w app/client -- use-fetch-book-list
```

Expected: all tests pass including the new one.

- [ ] **Step 8: Run full client test suite and lint**

```bash
npm test -w app/client && npm run lint -w app/client
```

Expected: all client tests pass, no lint errors.

- [ ] **Step 9: Commit**

```bash
git add app/client/src/provider/book/type.ts \
        app/client/src/provider/book/hook/use-book-list-filter.ts \
        app/client/src/provider/book/hook/use-fetch-book-list.ts \
        app/client/src/provider/book/hook/use-fetch-next-page.ts \
        app/client/src/provider/book/hook/use-fetch-book-list.test.tsx
git commit -m "$(cat <<'EOF'
feat: add entryType to client BookListFilter and wire URL sync + API params
EOF
)"
```

---

### Task 4: Search suggestions hook — `entryType` type and empty-state quick-picks

**Files:**
- Modify: `app/client/src/component/search-bar/use-search-suggestions.ts`
- Test: `app/client/src/component/search-bar/use-search-suggestions.test.ts`

**Interfaces:**
- Consumes: `BookListFilter.entryType` from Task 3.
- Produces: When `inputValue` is empty and `filter.entryType` is not set, the hook returns a `SuggestionGroup` with `type: 'entryType'` as the first group. `Suggestion['type']` now includes `'entryType'` — consumed by Task 5.

---

- [ ] **Step 1: Write failing tests**

In `app/client/src/component/search-bar/use-search-suggestions.test.ts`:

**Update** the existing test `'returns empty groups and loading=false when inputValue is empty'` (around line 44) — it will fail after the change, so update it now as the spec for the new behavior:

```typescript
it('returns Type and Status quick-pick groups when inputValue is empty and no filter is active', () => {
  const { result } = renderHook(() => useSearchSuggestions('', emptyFilter));
  expect(result.current.groups).toHaveLength(2);
  expect(result.current.groups[0].type).toBe('entryType');
  expect(result.current.groups[0].items).toHaveLength(2);
  expect(result.current.groups[1].type).toBe('status');
  expect(result.current.groups[1].items).toHaveLength(3);
  expect(result.current.loading).toBe(false);
  expect(vi.mocked(apiFetch)).not.toHaveBeenCalled();
});
```

**Update** the existing test `'resets groups to [] when inputValue becomes empty'` (around line 190) — also update it to match the new behavior:

```typescript
it('returns empty-state quick-pick groups when inputValue becomes empty', async () => {
  vi.mocked(apiFetch).mockResolvedValue(
    makeResponse([
      {
        type: 'author',
        items: [{ label: 'N.K. Jemisin', value: 'N.K. Jemisin', matchStart: 5, matchLength: 4 }],
      },
    ])
  );
  const { result, rerender } = renderHook(
    ({ input }: { input: string }) => useSearchSuggestions(input, emptyFilter),
    { initialProps: { input: 'jemi' } }
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(200);
  });
  await waitFor(() => expect(result.current.groups.length).toBeGreaterThan(0));

  rerender({ input: '' });
  expect(result.current.groups).toHaveLength(2); // Type + Status
  expect(result.current.groups[0].type).toBe('entryType');
  expect(result.current.loading).toBe(false);
});
```

**Add** these three new tests after the existing `'omits status group when filter.status is already set'` test (around line 107):

```typescript
it('omits Type group when entryType filter is already set', () => {
  const { result } = renderHook(() =>
    useSearchSuggestions('', { entryType: 'series' })
  );
  expect(result.current.groups).toHaveLength(1);
  expect(result.current.groups[0].type).toBe('status');
});

it('omits both Type and Status groups when both are already set', () => {
  const { result } = renderHook(() =>
    useSearchSuggestions('', { entryType: 'series', status: 'completed' })
  );
  expect(result.current.groups).toHaveLength(0);
});

it('empty-state Type group items have correct labels, values, additive=false, matchStart=0, matchLength=0', () => {
  const { result } = renderHook(() => useSearchSuggestions('', emptyFilter));
  const typeGroup = result.current.groups.find((g) => g.type === 'entryType');
  expect(typeGroup?.items[0]).toMatchObject({
    type: 'entryType',
    label: 'Series',
    value: 'series',
    additive: false,
    matchStart: 0,
    matchLength: 0,
  });
  expect(typeGroup?.items[1]).toMatchObject({
    type: 'entryType',
    label: 'Single books',
    value: 'standalone',
    additive: false,
    matchStart: 0,
    matchLength: 0,
  });
});
```

- [ ] **Step 2: Run tests and confirm they fail**

```bash
npm test -w app/client -- use-search-suggestions
```

Expected: the two updated tests and the three new tests fail.

- [ ] **Step 3: Implement the changes in `use-search-suggestions.ts`**

Replace the entire file with:

```typescript
import { useEffect, useRef, useState } from 'react';

import { apiFetch } from '~/lib/api-fetch';
import type { BookListFilter } from '~/provider/book';
import { useWithTargetUser } from '~/provider/library-target';

export type Suggestion = {
  type: 'entryType' | 'status' | 'author' | 'series' | 'book' | 'subject';
  label: string;
  value: string;
  additive: boolean;
  matchStart: number;
  matchLength: number;
};

export type SuggestionGroup = {
  type: Suggestion['type'];
  label: string;
  items: Suggestion[];
};

type ServerItem = { label: string; value: string; matchStart: number; matchLength: number };
type ServerGroup = {
  type: 'author' | 'series' | 'book' | 'subject';
  items: ServerItem[];
};

const TYPE_OPTIONS: { label: string; value: 'series' | 'standalone' }[] = [
  { label: 'Series', value: 'series' },
  { label: 'Single books', value: 'standalone' },
];

const STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: 'Not Started', value: 'not-started' },
  { label: 'In Progress', value: 'in-progress' },
  { label: 'Completed', value: 'completed' },
];

const GROUP_LABEL: Record<Suggestion['type'], string> = {
  entryType: 'Type',
  status: 'Status',
  author: 'Author',
  series: 'Series',
  book: 'Book',
  subject: 'Subject',
};

function matchInfo(
  text: string,
  query: string
): { matchStart: number; matchLength: number } | null {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return null;
  return { matchStart: idx, matchLength: query.length };
}

export function useSearchSuggestions(
  inputValue: string,
  filter: BookListFilter
): { groups: SuggestionGroup[]; loading: boolean } {
  const withTargetUser = useWithTargetUser();
  const [groups, setGroups] = useState<SuggestionGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Destructure filter fields as primitive deps so the effect does not re-fire
  // when the caller passes a new object literal with identical values.
  const { status, author, seriesName, subjects, entryType } = filter;
  // subjects is a string[] — serialize it so the dep compares by value rather
  // than reference. The effect reconstructs the array from this key.
  const subjectsKey = subjects?.join('\0') ?? '';

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const query = inputValue.trim();
    if (!query) {
      // Abort any in-flight request. Groups and loading are short-circuited at
      // the return site when query is empty, avoiding setState in an effect body
      // (react-hooks/set-state-in-effect).
      abortRef.current?.abort();
      return;
    }

    debounceRef.current = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      // Reconstruct subjects array from the serialized key so no array
      // reference is needed in the dep list.
      const subjectsArray = subjectsKey ? subjectsKey.split('\0') : [];

      const params = new URLSearchParams({ q: query });
      if (author) params.set('author', author);
      if (seriesName) params.set('seriesName', seriesName);
      for (const s of subjectsArray) params.append('subjects', s);
      const url = withTargetUser(`/api/search/suggestions?${params.toString()}`);

      setLoading(true);
      apiFetch(url, { signal: controller.signal })
        .then(async (res) => {
          if (!res.ok) throw new Error('Suggestion fetch failed');
          return res.json() as Promise<{ groups: ServerGroup[] }>;
        })
        .then(({ groups: serverGroups }) => {
          if (controller.signal.aborted) return;

          const result: SuggestionGroup[] = [];

          if (!status) {
            const items: Suggestion[] = [];
            for (const opt of STATUS_OPTIONS) {
              const info = matchInfo(opt.label, query);
              if (info) {
                items.push({
                  type: 'status',
                  label: opt.label,
                  value: opt.value,
                  additive: false,
                  ...info,
                });
              }
            }
            if (items.length > 0) result.push({ type: 'status', label: GROUP_LABEL.status, items });
          }

          for (const g of serverGroups) {
            const additive = g.type === 'subject';
            const items: Suggestion[] = g.items.map((item) => ({
              type: g.type,
              label: item.label,
              value: item.value,
              additive,
              matchStart: item.matchStart,
              matchLength: item.matchLength,
            }));
            if (items.length > 0) {
              result.push({ type: g.type, label: GROUP_LABEL[g.type], items });
            }
          }

          setGroups(result);
          setLoading(false);
        })
        .catch((_err: unknown) => {
          if (controller.signal.aborted) return;
          setGroups([]);
          setLoading(false);
        });
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue, status, author, seriesName, subjectsKey, withTargetUser]);

  // When input is empty, return static quick-pick groups (Type and/or Status)
  // so the dropdown shows useful options on focus. Both are omitted when the
  // corresponding filter is already active.
  const query = inputValue.trim();
  if (!query) {
    const emptyGroups: SuggestionGroup[] = [];
    if (!entryType) {
      emptyGroups.push({
        type: 'entryType',
        label: GROUP_LABEL.entryType,
        items: TYPE_OPTIONS.map((opt) => ({
          type: 'entryType' as const,
          label: opt.label,
          value: opt.value,
          additive: false,
          matchStart: 0,
          matchLength: 0,
        })),
      });
    }
    if (!status) {
      emptyGroups.push({
        type: 'status',
        label: GROUP_LABEL.status,
        items: STATUS_OPTIONS.map((opt) => ({
          type: 'status' as const,
          label: opt.label,
          value: opt.value,
          additive: false,
          matchStart: 0,
          matchLength: 0,
        })),
      });
    }
    return { groups: emptyGroups, loading: false };
  }

  return { groups, loading };
}
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
npm test -w app/client -- use-search-suggestions
```

Expected: all tests pass.

- [ ] **Step 5: Run full client test suite and lint**

```bash
npm test -w app/client && npm run lint -w app/client
```

Expected: all client tests pass, no lint errors.

- [ ] **Step 6: Commit**

```bash
git add app/client/src/component/search-bar/use-search-suggestions.ts \
        app/client/src/component/search-bar/use-search-suggestions.test.ts
git commit -m "$(cat <<'EOF'
feat: add entryType suggestion type and empty-state quick-picks to useSearchSuggestions

When the search input is empty, the hook returns Type (Series / Single books)
and Status groups so the dropdown offers useful quick-picks on focus.
EOF
)"
```

---

### Task 5: SearchBar chip system and styles

**Files:**
- Modify: `app/client/src/component/search-bar/index.tsx`
- Modify: `app/client/src/component/search-bar/style.ts`

**Interfaces:**
- Consumes: `BookListFilter.entryType` from Task 3; `Suggestion['type']` including `'entryType'` from Task 4.

No new test file — the component does not have an existing test file and the chip helper functions are internal. Behavior is verified by lint passing and by running the dev server manually.

---

- [ ] **Step 1: Add `chipEntryType` and `dropdownItemTypeEntryType` to `style.ts`**

In `app/client/src/component/search-bar/style.ts`:

After the `chipSubject` rule (after line 114), add:

```typescript
  chipEntryType: {
    color: '#c0415e',
    background: 'rgba(192, 65, 94, 0.08)',
    borderColor: 'rgba(192, 65, 94, 0.22)',
  },
```

After the `dropdownItemTypeSubject` rule (after line 191), add:

```typescript
  dropdownItemTypeEntryType: {
    color: '#c0415e',
    background: 'rgba(192, 65, 94, 0.08)',
  },
```

- [ ] **Step 2: Update `index.tsx` — types and display maps**

In `app/client/src/component/search-bar/index.tsx`:

Replace `ChipDef`:

```typescript
type ChipDef =
  | { kind: 'entryType'; value: 'Series' | 'Single books' }
  | { kind: 'status'; value: string }
  | { kind: 'author'; value: string }
  | { kind: 'series'; value: string }
  | { kind: 'subject'; value: string };
```

Replace `TYPE_CHIP_CLASS`:

```typescript
const TYPE_CHIP_CLASS: Record<ChipDef['kind'], string> = {
  entryType: 'chipEntryType',
  status: 'chipStatus',
  author: 'chipAuthor',
  series: 'chipSeries',
  subject: 'chipSubject',
};
```

Replace `TYPE_CHIP_LABEL`:

```typescript
const TYPE_CHIP_LABEL: Record<ChipDef['kind'], string> = {
  entryType: 'Type',
  status: 'Status',
  author: 'Author',
  series: 'Series',
  subject: 'Subject',
};
```

Replace `TYPE_DROPDOWN_CLASS`:

```typescript
const TYPE_DROPDOWN_CLASS: Record<Suggestion['type'], string> = {
  entryType: 'dropdownItemTypeEntryType',
  status: 'dropdownItemTypeStatus',
  author: 'dropdownItemTypeAuthor',
  series: 'dropdownItemTypeSeries',
  book: 'dropdownItemTypeBook',
  subject: 'dropdownItemTypeSubject',
};
```

- [ ] **Step 3: Update `filterToChips`**

Replace the function:

```typescript
function filterToChips(filter: BookListFilter): ChipDef[] {
  const chips: ChipDef[] = [];
  if (filter.entryType)
    chips.push({
      kind: 'entryType',
      value: filter.entryType === 'series' ? 'Series' : 'Single books',
    });
  if (filter.status)
    chips.push({ kind: 'status', value: STATUS_LABELS[filter.status] ?? filter.status });
  if (filter.author) chips.push({ kind: 'author', value: filter.author });
  if (filter.seriesName) chips.push({ kind: 'series', value: filter.seriesName });
  for (const s of filter.subjects ?? []) chips.push({ kind: 'subject', value: s });
  return chips;
}
```

- [ ] **Step 4: Update `removeChip`**

Replace the function:

```typescript
function removeChip(filter: BookListFilter, chip: ChipDef): BookListFilter {
  switch (chip.kind) {
    case 'entryType':
      return { ...filter, entryType: undefined };
    case 'status':
      return { ...filter, status: undefined };
    case 'author':
      return { ...filter, author: undefined };
    case 'series':
      return { ...filter, seriesName: undefined };
    case 'subject':
      return { ...filter, subjects: filter.subjects?.filter((s) => s !== chip.value) };
  }
}
```

- [ ] **Step 5: Update `applySelection`**

Replace the function:

```typescript
function applySelection(filter: BookListFilter, suggestion: Suggestion): BookListFilter {
  switch (suggestion.type) {
    case 'entryType':
      return { ...filter, entryType: suggestion.value as 'series' | 'standalone' };
    case 'status':
      return { ...filter, status: suggestion.value as BookListFilter['status'] };
    case 'author':
      return { ...filter, author: suggestion.value };
    case 'series':
      return { ...filter, seriesName: suggestion.value };
    case 'subject':
      return { ...filter, subjects: [...(filter.subjects ?? []), suggestion.value] };
    case 'book':
      return filter;
  }
}
```

- [ ] **Step 6: Update the placeholder text**

In the `<input>` element (around line 252), replace:

```typescript
            placeholder={
              chips.length > 0
                ? 'Search titles…'
                : 'Search by title, author, series, subject, or status…'
            }
```

with:

```typescript
            placeholder={
              chips.length > 0
                ? 'Search titles…'
                : 'Search by title, author, series, subject, status, or type…'
            }
```

- [ ] **Step 7: Run full client test suite and lint**

```bash
npm test -w app/client && npm run lint -w app/client
```

Expected: all client tests pass, no lint errors. TypeScript must compile without errors (the type checker runs as part of lint via `tsc --noEmit`).

- [ ] **Step 8: Commit**

```bash
git add app/client/src/component/search-bar/index.tsx \
        app/client/src/component/search-bar/style.ts
git commit -m "$(cat <<'EOF'
feat: add entryType chip, display maps, and handlers to SearchBar

Selecting Series or Single books from the empty-state dropdown applies the
entryType filter; the active filter renders as a removable Type chip.
EOF
)"
```

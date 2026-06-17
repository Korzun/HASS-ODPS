# Unified Search Suggestions Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the four separate suggestion data endpoints and their eager-fetching client hooks with a single `GET /api/search/suggestions` endpoint that does server-side text matching and returns pre-grouped, pre-filtered results.

**Architecture:** The server runs four parallel DB queries (authors, series, books, subjects), each scoped to the active filter chips, caps results at 5 per group, and returns a flat list of groups. The client sends the debounced query + active chips, receives pre-matched groups, computes highlight offsets locally, and prepends the static status group. A loading spinner shows in the dropdown while the request is in flight.

**Tech Stack:** TypeScript, Node.js/Express, Prisma/SQLite, React, react-jss (JSS)

---

## Endpoint

`GET /api/search/suggestions`

### Query Parameters

| Param | Type | Notes |
|-------|------|-------|
| `q` | string (required) | Text to match. Empty/missing returns `{ groups: [] }` immediately. |
| `author` | string (optional) | Active author chip — constrains series, books, and subjects; suppresses author group. |
| `seriesName` | string (optional) | Active series chip — constrains books and subjects; suppresses series group. |
| `subjects` | string[] (optional) | Active subject chips — these values are excluded from the subject group. |

`status` is not sent — the three status options are static and matched client-side.

### Response

```json
{
  "groups": [
    { "type": "author",  "items": [{ "label": "N.K. Jemisin",     "value": "N.K. Jemisin"     }] },
    { "type": "series",  "items": [{ "label": "Broken Earth",      "value": "Broken Earth"      }] },
    { "type": "book",    "items": [{ "label": "The Fifth Season",  "value": "book-id-xyz"       }] },
    { "type": "subject", "items": [{ "label": "Fantasy",           "value": "Fantasy"           }] }
  ]
}
```

- Groups with zero matching items are omitted.
- Each group is capped at 5 items server-side. No pagination — suggestions are ephemeral.
- `matchStart` / `matchLength` are **not** in the response; the client computes them from the query string it already holds.
- `value` for `book` items is the book ID (used to navigate to the detail page on selection). All other types use the label as value.

---

## Server Implementation

### Store method — `getSearchSuggestions`

**File:** `app/server/services/book-store.ts`

```ts
async getSearchSuggestions(
  owner: Owner,
  {
    q,
    filter,
  }: {
    q: string;
    filter: {
      author?: string;
      seriesName?: string;
      activeSubjects?: string[];
    };
  }
): Promise<SearchSuggestionsResponse>
```

Runs four queries in `Promise.all`. Skipped branches resolve to `[]` without touching the DB.

**Authors** (skipped when `filter.author` is set):
```ts
prisma.book.groupBy({
  by: ['author'],
  where: {
    userId: owner.userId,
    author: { contains: q },
    ...(filter.seriesName ? { series: filter.seriesName } : {}),
  },
  orderBy: { author: 'asc' },
  take: 5,
})
```

**Series** (skipped when `filter.seriesName` is set):
```ts
prisma.series.findMany({
  where: {
    userId: owner.userId,
    name: { contains: q },
    ...(filter.author ? { books: { some: { author: filter.author } } } : {}),
  },
  select: { name: true },
  orderBy: { name: 'asc' },
  take: 5,
})
```

**Books** (always runs):
```ts
prisma.book.findMany({
  where: {
    userId: owner.userId,
    title: { contains: q },
    ...(filter.author ? { author: filter.author } : {}),
    ...(filter.seriesName ? { series: filter.seriesName } : {}),
  },
  select: { id: true, title: true },
  orderBy: { title: 'asc' },
  take: 5,
})
```

**Subjects** (always runs — raw SQL via `$queryRaw`):
```ts
const authorClause = filter.author
  ? Prisma.sql`AND author = ${filter.author}`
  : Prisma.empty;
const seriesClause = filter.seriesName
  ? Prisma.sql`AND series = ${filter.seriesName}`
  : Prisma.empty;
// Exclude already-active subjects — filter in application code after the query
// (Prisma.join works for NOT IN but subject exclusion is simpler post-query given the 5-item cap)

prisma.$queryRaw<Array<{ value: string }>>`
  SELECT DISTINCT trim(CAST(json_each.value AS TEXT)) AS value
  FROM books, json_each(books.subjects)
  WHERE user_id = ${owner.userId}
    AND LOWER(trim(CAST(json_each.value AS TEXT))) LIKE LOWER(${'%' + q + '%'})
    ${authorClause}
    ${seriesClause}
    ${excludeClause}
    AND json_each.type = 'text'
    AND trim(CAST(json_each.value AS TEXT)) <> ''
  ORDER BY value
  LIMIT 5
`
```

### Route

`GET /api/search/suggestions` — placed before any `/api/search/:param` route to avoid conflicts (none exist today). Uses the standard `requireAuth` + `resolveOwner` pattern.

```ts
router.get('/api/search/suggestions', requireAuth, async (req, res) => {
  const owner = await resolveOwner(req, res);
  if (!owner) return;
  const { q, author, seriesName, subjects } = req.query;
  if (!q || typeof q !== 'string' || !q.trim()) {
    res.json({ groups: [] });
    return;
  }
  const activeSubjects: string[] = Array.isArray(subjects)
    ? subjects.filter((s): s is string => typeof s === 'string')
    : typeof subjects === 'string'
      ? [subjects]
      : [];
  const result = await bookStore.getSearchSuggestions(owner, {
    q: q.trim(),
    filter: {
      author: typeof author === 'string' ? author : undefined,
      seriesName: typeof seriesName === 'string' ? seriesName : undefined,
      activeSubjects,
    },
  });
  res.json(result);
});
```

### Type

Add to `app/server/types.ts`:

```ts
export type SearchSuggestionsResponse = {
  groups: Array<{
    type: 'author' | 'series' | 'book' | 'subject';
    items: Array<{ label: string; value: string }>;
  }>;
};
```

---

## Client Implementation

### `useSearchSuggestions` hook

**File:** `app/client/src/component/search-bar/use-search-suggestions.ts`

Rewritten from a pure-computation hook to a data-fetching hook.

```ts
export function useSearchSuggestions(
  inputValue: string,
  filter: BookListFilter
): { groups: SuggestionGroup[]; loading: boolean }
```

Behavior:
- Debounces `inputValue` by 200 ms. The debounced value is the actual trigger for requests.
- When the debounced query is empty, returns `{ groups: [], loading: false }` with no request.
- When the debounced query changes, fires `GET /api/search/suggestions` via `apiFetch` with an `AbortController`. The previous in-flight request is aborted.
- Uses `withTargetUser` to append `?user=X` for admin viewing another library.
- On response: assembles `SuggestionGroup[]` — prepends the static status group (client-side match against `STATUS_OPTIONS`) then maps server groups, computing `matchStart`/`matchLength` from the query string.
- Returns `loading: true` from the moment the debounced query fires until the response arrives (or is aborted).
- On fetch error, returns `{ groups: [], loading: false }` silently (no user-visible error for a suggestion failure).

`matchInfo` helper remains unchanged — it computes the highlight position from the label and the query the client already holds.

### `SearchBar` component

**File:** `app/client/src/component/search-bar/index.tsx`

Minor update to consume the `loading` flag:

```tsx
const { groups, loading } = useSearchSuggestions(inputValue, filter);
```

Dropdown render logic:
- `isOpen && loading` → show spinner panel
- `isOpen && !loading && flatSuggestions.length > 0` → show suggestion groups (unchanged)
- `isOpen && !loading && flatSuggestions.length === 0` → no dropdown (unchanged)

The spinner is a small centered indicator inside the same dropdown container, matching the existing dropdown styling.

### Deleted client files

- `app/client/src/provider/book/hook/use-all-authors.ts`
- `app/client/src/provider/book/hook/use-all-series-names.ts`
- `app/client/src/provider/book/hook/use-all-book-titles.ts`

### Reverted client files

- `app/client/src/provider/book/hook/use-library-subjects.ts` — reverts to simple no-filter form (filter params added in the previous iteration are removed; book-edit-form usage is unaffected)

### Export cleanup

- `app/client/src/provider/book/hook/index.ts` — remove `useAllAuthors`, `useAllSeriesNames`, `useAllBookTitles`, `BookTitleEntry`
- `app/client/src/provider/book/index.ts` — remove same exports

---

## Deleted Server Artifacts

### Store methods (deleted)

- `listAuthors`
- `listSeriesNames`
- `listBookTitles`

`getSubjects` reverts to its simple no-filter form (still used by `/api/subjects` for book-edit-form subject autocomplete).

### Routes (deleted)

- `GET /api/authors`
- `GET /api/series-names`
- `GET /api/books/titles`

`GET /api/subjects` reverts to no filter params.

---

## Testing

### Server

New test cases in `app/server/services/book-store.test.ts` (or a new `book-store-suggestions.test.ts`):

- Returns matching authors scoped to active seriesName filter
- Returns matching series scoped to active author filter
- Returns matching book titles scoped to active author and/or seriesName
- Returns matching subjects, excluding active subject chips
- Omits author group when `filter.author` is set
- Omits series group when `filter.seriesName` is set
- Returns empty groups for empty query

### Client

Update `app/client/src/component/search-bar/use-search-suggestions.test.ts`:

- Mock `apiFetch` (or the hook's fetch call) instead of mocking the four data hooks
- Verify status group is prepended client-side
- Verify `matchStart`/`matchLength` computed correctly
- Verify debounce: no fetch fired until 200 ms elapses
- Verify abort: changing query mid-flight cancels the previous request
- Verify `loading: true` while request is in flight, `false` after
- Verify empty query returns `{ groups: [], loading: false }` with no fetch

Delete `use-all-authors.test.ts`, `use-all-series-names.test.ts`, `use-all-book-titles.test.ts` if they exist.

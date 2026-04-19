# Reading Progress in Library View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show each logged-in regular user their own KOSync reading progress in the Library view, with per-book progress badges, series average %, and a per-book "Clear" button. None of this shows for admin.

**Architecture:** Two new API endpoints (`GET /api/my/progress`, `DELETE /api/my/progress/:document`) are added to `app/routes/ui.ts`. The frontend fetches books and progress in parallel on load, joins them client-side via a `progressMap`, and renders progress indicators inline on book rows and series rows. A new `user-only` CSS class (the inverse of `admin-only`) controls visibility.

**Tech Stack:** Node.js, Express, better-sqlite3, TypeScript (backend); vanilla JS/HTML (frontend); Jest + Supertest (tests).

---

## File Map

| File | Change |
|---|---|
| `app/services/user-store.ts` | Add `clearProgress(username, document): boolean` method |
| `app/services/user-store.test.ts` | Add 3 tests for `clearProgress` |
| `app/routes/ui.ts` | Add `GET /api/my/progress` and `DELETE /api/my/progress/:document` routes |
| `app/routes/ui.test.ts` | Add 6 integration tests for the two new routes |
| `app/public/index.html` | Add CSS, module-level state, update `loadBooks`, `renderSeriesRow`, `renderStandaloneSection`, `showSeriesPage`; add `seriesProgressPct` and `clearProgress` functions |

---

## Task 1: Add `clearProgress` to `UserStore`

**Files:**
- Modify: `app/services/user-store.ts`
- Test: `app/services/user-store.test.ts`

- [ ] **Step 1: Write the three failing tests**

Open `app/services/user-store.test.ts`. Add this block after the existing `UserStore.validateUser` describe block at the bottom of the file:

```typescript
describe('UserStore.clearProgress', () => {
  beforeEach(() => {
    store.createUser('alice', 'pass');
    store.createUser('bob', 'pass');
  });

  it('returns false when no record exists', () => {
    expect(store.clearProgress('alice', 'doc1')).toBe(false);
  });

  it('deletes an existing record and returns true', () => {
    store.saveProgress('alice', {
      document: 'doc1',
      progress: '/p[1]',
      percentage: 0.5,
      device: 'Kobo',
      device_id: 'd1',
    });
    expect(store.clearProgress('alice', 'doc1')).toBe(true);
    expect(store.getProgress('alice', 'doc1')).toBeNull();
  });

  it('does not affect another user\'s progress for the same document', () => {
    store.saveProgress('alice', {
      document: 'doc1',
      progress: '/p[1]',
      percentage: 0.5,
      device: 'Kobo',
      device_id: 'd1',
    });
    store.saveProgress('bob', {
      document: 'doc1',
      progress: '/p[2]',
      percentage: 0.7,
      device: 'Kobo',
      device_id: 'd2',
    });
    store.clearProgress('alice', 'doc1');
    expect(store.getProgress('bob', 'doc1')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest app/services/user-store.test.ts --no-coverage
```

Expected: 3 failures mentioning `store.clearProgress is not a function`.

- [ ] **Step 3: Implement `clearProgress`**

In `app/services/user-store.ts`, add this method after `getUserProgress`:

```typescript
clearProgress(username: string, document: string): boolean {
  const result = this.db
    .prepare('DELETE FROM progress WHERE username = ? AND document = ?')
    .run(username, document);
  return result.changes > 0;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest app/services/user-store.test.ts --no-coverage
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/services/user-store.ts app/services/user-store.test.ts
git commit -m "feat: add UserStore.clearProgress method"
```

---

## Task 2: Add `GET /api/my/progress` endpoint

**Files:**
- Modify: `app/routes/ui.ts`
- Test: `app/routes/ui.test.ts`

- [ ] **Step 1: Write the failing tests**

Open `app/routes/ui.test.ts`. Add this block after the `POST /api/books/scan (admin-only)` describe block:

```typescript
describe('GET /api/my/progress', () => {
  it('redirects to /login without session', async () => {
    const res = await request(app).get('/api/my/progress');
    expect(res.status).toBe(302);
  });

  it('returns [] for admin', async () => {
    const agent = await adminAgent();
    const res = await agent.get('/api/my/progress');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns own progress records for regular user', async () => {
    userStore.saveProgress('alice', {
      document: 'doc1',
      progress: '/p[1]',
      percentage: 0.72,
      device: 'Kobo',
      device_id: 'd1',
    });
    const agent = await userAgent();
    const res = await agent.get('/api/my/progress');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].document).toBe('doc1');
    expect(res.body[0].percentage).toBeCloseTo(0.72);
  });

  it('does not expose device or progress fields', async () => {
    userStore.saveProgress('alice', {
      document: 'doc1',
      progress: '/p[1]',
      percentage: 0.5,
      device: 'Kobo',
      device_id: 'd1',
    });
    const agent = await userAgent();
    const res = await agent.get('/api/my/progress');
    expect(res.body[0].device).toBeUndefined();
    expect(res.body[0].progress).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest app/routes/ui.test.ts --no-coverage -t "GET /api/my/progress"
```

Expected: 4 failures with `404` or similar (route does not exist yet).

- [ ] **Step 3: Implement the route**

In `app/routes/ui.ts`, add this route after the existing `router.get('/api/me', ...)` block:

```typescript
router.get('/api/my/progress', sessionAuth, (req: Request, res: Response) => {
  if (req.session.isAdmin) {
    res.json([]);
    return;
  }
  const progress = userStore.getUserProgress(req.session.username!);
  res.json(progress.map(p => ({ document: p.document, percentage: p.percentage })));
});
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest app/routes/ui.test.ts --no-coverage -t "GET /api/my/progress"
```

Expected: all 4 pass.

- [ ] **Step 5: Commit**

```bash
git add app/routes/ui.ts app/routes/ui.test.ts
git commit -m "feat: add GET /api/my/progress endpoint"
```

---

## Task 3: Add `DELETE /api/my/progress/:document` endpoint

**Files:**
- Modify: `app/routes/ui.ts`
- Test: `app/routes/ui.test.ts`

- [ ] **Step 1: Write the failing tests**

In `app/routes/ui.test.ts`, add this block after the `GET /api/my/progress` describe block added in Task 2:

```typescript
describe('DELETE /api/my/progress/:document', () => {
  beforeEach(() => {
    userStore.saveProgress('alice', {
      document: 'doc1',
      progress: '/p[1]',
      percentage: 0.5,
      device: 'Kobo',
      device_id: 'd1',
    });
  });

  it('redirects to /login without session', async () => {
    const res = await request(app).delete('/api/my/progress/doc1');
    expect(res.status).toBe(302);
  });

  it('returns 403 for admin', async () => {
    const agent = await adminAgent();
    const res = await agent.delete('/api/my/progress/doc1');
    expect(res.status).toBe(403);
  });

  it('returns 204 and clears the record for regular user', async () => {
    const agent = await userAgent();
    const res = await agent.delete('/api/my/progress/doc1');
    expect(res.status).toBe(204);
    expect(userStore.getProgress('alice', 'doc1')).toBeNull();
  });

  it('returns 404 when no record exists', async () => {
    const agent = await userAgent();
    const res = await agent.delete('/api/my/progress/nonexistent');
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest app/routes/ui.test.ts --no-coverage -t "DELETE /api/my/progress"
```

Expected: failures (route not found / unexpected status codes).

- [ ] **Step 3: Implement the route**

In `app/routes/ui.ts`, add this route immediately after the `GET /api/my/progress` route added in Task 2:

```typescript
router.delete('/api/my/progress/:document', sessionAuth, (req: Request, res: Response) => {
  if (req.session.isAdmin) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  const cleared = userStore.clearProgress(req.session.username!, req.params.document);
  if (!cleared) {
    res.status(404).json({ error: 'Progress record not found' });
    return;
  }
  res.status(204).send();
});
```

- [ ] **Step 4: Run all tests to verify everything passes**

```bash
npx jest --no-coverage
```

Expected: all tests pass (no regressions).

- [ ] **Step 5: Commit**

```bash
git add app/routes/ui.ts app/routes/ui.test.ts
git commit -m "feat: add DELETE /api/my/progress/:document endpoint"
```

---

## Task 4: Frontend — progress display and clear button

**Files:**
- Modify: `app/public/index.html`

This task updates the single-file frontend. All changes are within the `<style>` block or the `<script>` block. Make each change carefully — the file is large and edits must be exact.

- [ ] **Step 1: Add CSS rules**

In the `<style>` block, add two rules immediately after the existing `body.user-mode .admin-only{display:none!important}` line:

```css
    body:not(.user-mode) .user-only{display:none!important}
    .clear-btn:hover{color:#dc2626}
```

The style block around that area should look like:

```css
    body.user-mode .admin-only{display:none!important}
    body:not(.user-mode) .user-only{display:none!important}
    .clear-btn:hover{color:#dc2626}
```

- [ ] **Step 2: Add module-level state variables**

In the `<script>` block, find the existing line:

```js
    let currentUser = { username: '', isAdmin: false };
```

Add two new variables immediately before it:

```js
    let progressMap = new Map();
    let cachedBooks = [];
    let currentUser = { username: '', isAdmin: false };
```

- [ ] **Step 3: Add `seriesProgressPct` helper function**

In the `<script>` block, find the `groupBooks` function. Add `seriesProgressPct` immediately after `groupBooks`:

```js
    function seriesProgressPct(books) {
      if (!books.some(b => progressMap.has(b.id))) return null;
      const avg = books.reduce((sum, b) => sum + (progressMap.get(b.id) ?? 0), 0) / books.length;
      return Math.round(avg * 100);
    }
```

- [ ] **Step 4: Update `renderSeriesRow` to show series progress**

Replace the existing `renderSeriesRow` function with:

```js
    function renderSeriesRow(seriesName, books) {
      const li = document.createElement('li');
      li.className = 'series-row';
      const author = books[0] ? books[0].author : '';
      const count = books.length;
      const stackHtml = buildCoverStack(books, 58, 74, 44, 62, LIST_STACK_OFFSETS);
      const pct = seriesProgressPct(books);
      const pctHtml = pct != null
        ? ' · <span style="color:#16a34a;font-weight:500">' + pct + '%</span>'
        : '';
      li.innerHTML = stackHtml +
        '<div class="series-info">' +
          '<div class="series-name">' + esc(seriesName) + '</div>' +
          '<div class="series-meta">' +
            (author ? esc(author) + ' · ' : '') +
            count + ' book' + (count !== 1 ? 's' : '') +
            pctHtml +
          '</div>' +
          '<div class="series-link">View series →</div>' +
        '</div>';
      li.addEventListener('click', () => showSeriesPage(seriesName, books));
      return li;
    }
```

- [ ] **Step 5: Update `renderStandaloneSection` to show per-book progress and Clear button**

Inside `renderStandaloneSection`, replace the `books.forEach(book => { ... })` block with:

```js
      books.forEach(book => {
        const li = document.createElement('li');
        const coverHtml = book.hasCover
          ? '<img src="/api/books/' + esc(book.id) + '/cover" alt="' + esc(book.title) + '" style="width:40px;height:56px;object-fit:cover;border-radius:2px;display:block;">'
          : '<div style="width:40px;height:56px;background:#e0e0e0;border-radius:2px;"></div>';
        const pct = progressMap.get(book.id);
        const pctHtml = pct != null
          ? '<span style="font-size:.75rem;color:#16a34a;font-weight:500;margin-right:.25rem">' + Math.round(pct * 100) + '%</span>'
          : '';
        li.innerHTML =
          '<div style="display:flex;align-items:center;gap:.75rem;background:#fff;border-radius:6px;padding:.6rem .9rem;margin-bottom:.4rem;box-shadow:0 1px 3px rgba(0,0,0,.07)">' +
            '<div style="flex-shrink:0">' + coverHtml + '</div>' +
            '<div style="flex:1;min-width:0">' +
              '<div class="book-title">' + esc(book.title) + '</div>' +
              (book.author ? '<div class="book-meta">' + esc(book.author) + '</div>' : '') +
              '<div class="book-format">EPUB · ' + formatSize(book.size) + '</div>' +
            '</div>' +
            pctHtml +
            '<button class="clear-btn user-only" type="button" title="Clear reading status" style="background:transparent;border:none;cursor:pointer;color:#9ca3af;font-size:.75rem;padding:.25rem .5rem;border-radius:4px;font-family:inherit">Clear</button>' +
            '<button class="delete-btn admin-only" type="button" title="Delete">🗑</button>' +
          '</div>';
        li.querySelector('.delete-btn').addEventListener('click', () => deleteBook(book.id, book.title));
        li.querySelector('.clear-btn').addEventListener('click', () => clearProgress(book.id));
        list.appendChild(li);
      });
```

- [ ] **Step 6: Update `showSeriesPage` to show per-book progress and Clear button**

Inside `showSeriesPage`, replace the `books.forEach(book => { ... })` block (the one that builds `seriesBookList`) with:

```js
      books.forEach(book => {
        const li = document.createElement('li');
        const coverHtml = book.hasCover
          ? '<img src="/api/books/' + esc(book.id) + '/cover" alt="' + esc(book.title) + '" style="width:32px;height:46px;object-fit:cover;border-radius:2px;display:block;">'
          : '<div style="width:32px;height:46px;background:#e0e0e0;border-radius:2px;"></div>';
        const pct = progressMap.get(book.id);
        const pctHtml = pct != null
          ? '<span style="font-size:.75rem;color:#16a34a;font-weight:500;margin-right:.25rem">' + Math.round(pct * 100) + '%</span>'
          : '';
        li.innerHTML =
          '<div style="display:flex;align-items:center;gap:.75rem;background:#fff;border-radius:5px;padding:.55rem .75rem;margin-bottom:.35rem;box-shadow:0 1px 3px rgba(0,0,0,.07)">' +
            '<div style="flex-shrink:0">' + coverHtml + '</div>' +
            '<div style="flex:1;min-width:0">' +
              '<div class="book-title">' + esc(book.title) + '</div>' +
              '<div class="book-format">' +
                (book.seriesIndex != null ? '#' + book.seriesIndex + ' · ' : '') +
                'EPUB · ' + formatSize(book.size) +
              '</div>' +
            '</div>' +
            pctHtml +
            '<button class="clear-btn user-only" type="button" title="Clear reading status" style="background:transparent;border:none;cursor:pointer;color:#9ca3af;font-size:.75rem;padding:.25rem .5rem;border-radius:4px;font-family:inherit">Clear</button>' +
            '<button class="delete-btn admin-only" type="button" title="Delete">🗑</button>' +
          '</div>';
        li.querySelector('.delete-btn').addEventListener('click', () => deleteBook(book.id, book.title));
        li.querySelector('.clear-btn').addEventListener('click', () => clearProgress(book.id));
        seriesBookList.appendChild(li);
      });
```

- [ ] **Step 7: Update `loadBooks` to fetch progress in parallel**

Replace the entire `async function loadBooks()` with:

```js
    async function loadBooks() {
      try {
        const [booksRes, progressRes] = await Promise.all([
          fetch('/api/books'),
          currentUser.isAdmin ? Promise.resolve(null) : fetch('/api/my/progress'),
        ]);
        if (!booksRes.ok) { emptyMsg.style.display = ''; return; }
        const books = await booksRes.json();
        cachedBooks = books;

        const progressList = progressRes && progressRes.ok ? await progressRes.json() : [];
        progressMap = new Map(progressList.map(p => [p.document, p.percentage]));

        bookList.innerHTML = '';
        const oldStandalone = document.getElementById('standalone-section');
        if (oldStandalone) oldStandalone.remove();

        if (books.length === 0) {
          emptyMsg.style.display = '';
          return;
        }
        emptyMsg.style.display = 'none';

        const { series, standalone } = groupBooks(books);

        series.forEach(([seriesName, seriesBooks]) => {
          bookList.appendChild(renderSeriesRow(seriesName, seriesBooks));
        });

        if (standalone.length > 0) {
          librarySection.appendChild(renderStandaloneSection(standalone));
        }
      } catch {
        bookList.innerHTML = '';
        const errStandalone = document.getElementById('standalone-section');
        if (errStandalone) errStandalone.remove();
        emptyMsg.style.display = '';
      }
    }
```

- [ ] **Step 8: Add `clearProgress` function**

Add this function immediately after the existing `deleteBook` function:

```js
    async function clearProgress(bookId) {
      const res = await fetch('/api/my/progress/' + encodeURIComponent(bookId), { method: 'DELETE' });
      if (res.status === 204) {
        progressMap.delete(bookId);
        if (currentSeriesName !== null) {
          const { series } = groupBooks(cachedBooks);
          const entry = series.find(([name]) => name === currentSeriesName);
          if (entry) showSeriesPage(currentSeriesName, entry[1]);
        } else {
          await loadBooks();
        }
      } else {
        alert('Failed to clear reading status.');
      }
    }
```

- [ ] **Step 9: Run all tests**

```bash
npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Step 10: Commit**

```bash
git add app/public/index.html
git commit -m "feat: show reading progress in library view for regular users"
```

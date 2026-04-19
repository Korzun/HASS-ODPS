# Series Stack UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Library tab to group books by series (fanned cover stack, click → series page) and collect standalone books in a collapsible section at the bottom.

**Architecture:** All changes are client-side in `app/public/index.html`. The existing `GET /api/books` endpoint already returns `series` and `seriesIndex` per book; grouping and sorting are done in the browser. A new `#series-section` div replaces the library view during series page navigation — no URL changes, no new API endpoints.

**Tech Stack:** Vanilla JS/HTML/CSS in `app/public/index.html`. Tests via Jest + Supertest in `app/routes/ui.test.ts`.

---

## File Map

| File | Action | What changes |
|---|---|---|
| `app/public/index.html` | Modify | CSS (new classes), HTML (new `#series-section` element), JS (new helpers + refactored `loadBooks` + `deleteBook`) |
| `app/routes/ui.test.ts` | Modify | Two new assertions verifying key HTML elements are present in the served page |

---

## Task 1: Write failing tests for the new HTML structure

**Files:**
- Modify: `app/routes/ui.test.ts`

- [ ] **Step 1: Add the new test block at the bottom of `app/routes/ui.test.ts`** (before the closing brace of the file, after all existing `describe` blocks):

```ts
describe('GET / HTML structure', () => {
  it('contains series-section element', async () => {
    const agent = await authenticatedAgent();
    const res = await agent.get('/');
    expect(res.text).toContain('id="series-section"');
  });

  it('contains series UI CSS classes', async () => {
    const agent = await authenticatedAgent();
    const res = await agent.get('/');
    expect(res.text).toContain('.series-row');
    expect(res.text).toContain('.series-hero');
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

```bash
cd /Users/korzun/Code/HASS-ODPS && npx jest app/routes/ui.test.ts -t 'GET / HTML structure' --no-coverage
```

Expected output: 2 failing tests — `id="series-section"` and `.series-row` do not exist in the HTML yet.

---

## Task 2: Add CSS for series groups and the standalone section

**Files:**
- Modify: `app/public/index.html` (inside `<style>`)

- [ ] **Step 1: Append the following CSS inside the `<style>` block, after the last existing rule (`.progress-empty{...}`)**

```css
/* Series groups */
.series-row{background:#fff;border-radius:6px;padding:.75rem 1rem;margin-bottom:.5rem;display:flex;align-items:center;gap:.9rem;box-shadow:0 1px 3px rgba(0,0,0,.07);cursor:pointer;border:1px solid transparent}
.series-row:hover{border-color:#bfdbfe}
.series-info{flex:1;min-width:0}
.series-name{font-weight:600;font-size:.92rem;color:#111;margin-bottom:.15rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.series-meta{font-size:.75rem;color:#6b7280;margin-bottom:.1rem}
.series-link{font-size:.7rem;color:#1e40af;font-weight:500}
/* Standalone section */
.standalone-section{margin-top:1.25rem}
.standalone-header{display:flex;align-items:center;gap:.5rem;padding:.5rem .25rem;cursor:pointer;user-select:none;margin-bottom:.4rem}
.standalone-chevron{font-size:.65rem;color:#9ca3af;width:12px;flex-shrink:0}
.standalone-label{font-size:.75rem;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em}
.standalone-count{font-size:.7rem;color:#9ca3af;margin-left:.25rem}
/* Series page */
.series-hero{background:#1e40af;padding:1rem 1.5rem;display:flex;align-items:flex-end;gap:1rem;border-radius:6px;margin-bottom:.75rem}
.series-hero-badge{font-size:.65rem;color:rgba(255,255,255,.65);text-transform:uppercase;letter-spacing:.07em;margin-bottom:.25rem}
.series-hero-title{font-size:1.1rem;font-weight:700;color:#fff;line-height:1.2;margin-bottom:.2rem}
.series-hero-meta{font-size:.75rem;color:rgba(255,255,255,.75)}
.series-back{background:none;border:none;color:#1e40af;font-size:.8rem;font-weight:500;cursor:pointer;padding:0;font-family:inherit;display:inline-block;margin:.75rem 0}
.series-back:hover{text-decoration:underline}
.series-order-label{font-size:.68rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin-bottom:.45rem}
```

---

## Task 3: Add `#series-section` to HTML and run tests

**Files:**
- Modify: `app/public/index.html` (inside `<main>`)

- [ ] **Step 1: Add the series section element inside `<main>`, after the closing `</div>` of `#users-section`**

Current end of `<main>`:
```html
    <div id="users-section" style="display:none">
      <ul id="user-list"></ul>
      <p id="users-empty" style="display:none">No KOSync users registered yet.</p>
    </div>
  </main>
```

Replace with:
```html
    <div id="users-section" style="display:none">
      <ul id="user-list"></ul>
      <p id="users-empty" style="display:none">No KOSync users registered yet.</p>
    </div>

    <div id="series-section" style="display:none"></div>
  </main>
```

- [ ] **Step 2: Run the tests and verify they now pass**

```bash
cd /Users/korzun/Code/HASS-ODPS && npx jest app/routes/ui.test.ts --no-coverage
```

Expected: All tests pass (including the 2 new ones).

- [ ] **Step 3: Commit**

```bash
git add app/public/index.html app/routes/ui.test.ts
git commit -m "feat: add series UI scaffold — CSS classes, #series-section element, route tests"
```

---

## Task 4: Wire up state variables and update tab handler

**Files:**
- Modify: `app/public/index.html` (JavaScript section)

- [ ] **Step 1: Add `seriesSection` variable and `currentSeriesName` state**

Find this block near the top of the `<script>` (after the tab handler setup):
```js
    const librarySection = document.getElementById('library-section');
    const usersSection = document.getElementById('users-section');
    let usersLoaded = false;
```

Replace with:
```js
    const librarySection = document.getElementById('library-section');
    const usersSection = document.getElementById('users-section');
    const seriesSection = document.getElementById('series-section');
    let usersLoaded = false;
    let currentSeriesName = null;
```

- [ ] **Step 2: Update the tab click handler to clear series state on tab switch**

Find the existing tab handler:
```js
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const name = tab.dataset.tab;
        librarySection.style.display = name === 'library' ? '' : 'none';
        usersSection.style.display = name === 'users' ? '' : 'none';
        if (name === 'users' && !usersLoaded) loadUsers();
      });
    });
```

Replace with:
```js
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const name = tab.dataset.tab;
        seriesSection.style.display = 'none';
        currentSeriesName = null;
        librarySection.style.display = name === 'library' ? '' : 'none';
        usersSection.style.display = name === 'users' ? '' : 'none';
        if (name === 'users' && !usersLoaded) loadUsers();
      });
    });
```

---

## Task 5: Implement `groupBooks()` helper

**Files:**
- Modify: `app/public/index.html` (JavaScript section)

- [ ] **Step 1: Add `groupBooks()` immediately before the `loadBooks` function**

Find the comment `// ── Library ───────────────────────────────────────────` and the `loadBooks` function that follows. Insert this new function before `async function loadBooks()`:

```js
    function groupBooks(books) {
      const seriesMap = new Map();
      const standalone = [];
      for (const book of books) {
        if (book.series) {
          if (!seriesMap.has(book.series)) seriesMap.set(book.series, []);
          seriesMap.get(book.series).push(book);
        } else {
          standalone.push(book);
        }
      }
      for (const [, bks] of seriesMap) {
        bks.sort((a, b) => (a.seriesIndex ?? 0) - (b.seriesIndex ?? 0));
      }
      const sortedSeries = [...seriesMap.entries()].sort(([a], [b]) => a.localeCompare(b));
      standalone.sort((a, b) => a.title.localeCompare(b.title));
      return { series: sortedSeries, standalone };
    }
```

---

## Task 6: Implement `buildCoverStack()` and offset constants

**Files:**
- Modify: `app/public/index.html` (JavaScript section)

- [ ] **Step 1: Add the offset constants and `buildCoverStack()` immediately after `groupBooks()`**

```js
    const LIST_STACK_OFFSETS = [
      { left: 10, top: 5, rotate: '-6deg' },   // back
      { left: 5,  top: 2, rotate: '-2deg' },   // middle
      { left: 0,  top: 0, rotate:  '0deg' },   // front
    ];

    const HERO_STACK_OFFSETS = [
      { left: 13, top: 6, rotate: '-6deg' },
      { left: 6,  top: 3, rotate: '-2deg' },
      { left: 0,  top: 0, rotate:  '0deg' },
    ];

    // books: array sorted ascending by seriesIndex.
    // offsets: [{left, top, rotate}] indexed back→front (index 0 = back).
    // Returns an HTML string for the fanned cover stack container.
    function buildCoverStack(books, cw, ch, lw, lh, offsets) {
      // Map books to layers: front book (books[0]) goes to the front position (index 2),
      // books[1] to middle (index 1), books[2] to back (index 0).
      const layers = [books[2] || null, books[1] || null, books[0] || null];
      const layerHtml = offsets.map((pos, i) => {
        const book = layers[i];
        const isGhost = !book;
        const opacity = isGhost ? (i === 0 ? '.3' : '.45') : '1';
        const style = 'position:absolute'
          + ';left:' + pos.left + 'px'
          + ';top:' + pos.top + 'px'
          + ';width:' + lw + 'px'
          + ';height:' + lh + 'px'
          + ';border-radius:2px'
          + ';transform:rotate(' + pos.rotate + ')'
          + ';z-index:' + (i + 1)
          + ';opacity:' + opacity
          + ';box-shadow:1px 1px 3px rgba(0,0,0,.18)';
        if (book && book.hasCover) {
          return '<img src="/api/books/' + esc(book.id) + '/cover" alt="" style="' + style + ';object-fit:cover;display:block">';
        }
        return '<div style="' + style + ';background:#d1d5db"></div>';
      }).join('');
      return '<div style="position:relative;width:' + cw + 'px;height:' + ch + 'px;flex-shrink:0">' + layerHtml + '</div>';
    }
```

---

## Task 7: Implement `renderSeriesRow()` and `renderStandaloneSection()`

**Files:**
- Modify: `app/public/index.html` (JavaScript section)

- [ ] **Step 1: Add `renderSeriesRow()` after `buildCoverStack()`**

```js
    function renderSeriesRow(seriesName, books) {
      const li = document.createElement('li');
      li.className = 'series-row';
      const author = books[0] ? books[0].author : '';
      const count = books.length;
      const stackHtml = buildCoverStack(books, 58, 74, 44, 62, LIST_STACK_OFFSETS);
      li.innerHTML = stackHtml +
        '<div class="series-info">' +
          '<div class="series-name">' + esc(seriesName) + '</div>' +
          '<div class="series-meta">' +
            (author ? esc(author) + ' · ' : '') +
            count + ' book' + (count !== 1 ? 's' : '') +
          '</div>' +
          '<div class="series-link">View series →</div>' +
        '</div>';
      li.addEventListener('click', () => showSeriesPage(seriesName, books));
      return li;
    }
```

- [ ] **Step 2: Add `renderStandaloneSection()` immediately after `renderSeriesRow()`**

```js
    function renderStandaloneSection(books) {
      const section = document.createElement('div');
      section.className = 'standalone-section';
      section.id = 'standalone-section';

      const header = document.createElement('div');
      header.className = 'standalone-header';
      header.innerHTML =
        '<span class="standalone-chevron">▼</span>' +
        '<span class="standalone-label">Standalone Books</span>' +
        '<span class="standalone-count">' + books.length + ' book' + (books.length !== 1 ? 's' : '') + '</span>';

      const list = document.createElement('ul');
      list.style.listStyle = 'none';
      list.style.padding = '0';
      list.style.margin = '0';

      books.forEach(book => {
        const li = document.createElement('li');
        const coverHtml = book.hasCover
          ? '<img src="/api/books/' + esc(book.id) + '/cover" alt="' + esc(book.title) + '" style="width:40px;height:56px;object-fit:cover;border-radius:2px;display:block;">'
          : '<div style="width:40px;height:56px;background:#e0e0e0;border-radius:2px;"></div>';
        li.innerHTML =
          '<div style="display:flex;align-items:center;gap:.75rem;background:#fff;border-radius:6px;padding:.6rem .9rem;margin-bottom:.4rem;box-shadow:0 1px 3px rgba(0,0,0,.07)">' +
            '<div style="flex-shrink:0">' + coverHtml + '</div>' +
            '<div style="flex:1;min-width:0">' +
              '<div class="book-title">' + esc(book.title) + '</div>' +
              (book.author ? '<div class="book-meta">' + esc(book.author) + '</div>' : '') +
              '<div class="book-format">EPUB · ' + formatSize(book.size) + '</div>' +
            '</div>' +
            '<button class="delete-btn" type="button" title="Delete">🗑</button>' +
          '</div>';
        li.querySelector('.delete-btn').addEventListener('click', () => deleteBook(book.id, book.title));
        list.appendChild(li);
      });

      header.addEventListener('click', () => {
        const isOpen = list.style.display !== 'none';
        list.style.display = isOpen ? 'none' : '';
        header.querySelector('.standalone-chevron').textContent = isOpen ? '▶' : '▼';
      });

      section.appendChild(header);
      section.appendChild(list);
      return section;
    }
```

---

## Task 8: Refactor `loadBooks()` to use grouped rendering

**Files:**
- Modify: `app/public/index.html` (JavaScript section)

- [ ] **Step 1: Replace the existing `loadBooks` function**

Find and replace the entire `async function loadBooks()` function (lines 131–168 in the original file):

```js
    async function loadBooks() {
      try {
        const res = await fetch('/api/books');
        if (!res.ok) { emptyMsg.style.display = ''; return; }
        const books = await res.json();

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
        emptyMsg.style.display = '';
      }
    }
```

- [ ] **Step 2: Run the full test suite to confirm no regressions**

```bash
cd /Users/korzun/Code/HASS-ODPS && npx jest --no-coverage
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add app/public/index.html
git commit -m "feat: group books by series in library view with fanned cover stacks"
```

---

## Task 9: Implement `showSeriesPage()` and `showLibraryView()`

**Files:**
- Modify: `app/public/index.html` (JavaScript section)

- [ ] **Step 1: Add both functions after `renderStandaloneSection()`, before `loadBooks()`**

```js
    function showLibraryView() {
      currentSeriesName = null;
      seriesSection.style.display = 'none';
      librarySection.style.display = '';
    }

    function showSeriesPage(seriesName, books) {
      currentSeriesName = seriesName;
      const author = books[0] ? books[0].author : '';
      const count = books.length;
      const heroStack = buildCoverStack(books, 68, 86, 52, 72, HERO_STACK_OFFSETS);

      seriesSection.innerHTML =
        '<div class="series-hero">' +
          heroStack +
          '<div>' +
            '<div class="series-hero-badge">Series</div>' +
            '<div class="series-hero-title">' + esc(seriesName) + '</div>' +
            '<div class="series-hero-meta">' +
              (author ? esc(author) + ' · ' : '') +
              count + ' book' + (count !== 1 ? 's' : '') +
            '</div>' +
          '</div>' +
        '</div>' +
        '<button class="series-back" type="button">← Library</button>' +
        '<div class="series-order-label">Reading Order</div>' +
        '<ul id="series-book-list" style="list-style:none;padding:0;margin:0"></ul>';

      const seriesBookList = seriesSection.querySelector('#series-book-list');
      books.forEach(book => {
        const li = document.createElement('li');
        const coverHtml = book.hasCover
          ? '<img src="/api/books/' + esc(book.id) + '/cover" alt="' + esc(book.title) + '" style="width:32px;height:46px;object-fit:cover;border-radius:2px;display:block;">'
          : '<div style="width:32px;height:46px;background:#e0e0e0;border-radius:2px;"></div>';
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
            '<button class="delete-btn" type="button" title="Delete">🗑</button>' +
          '</div>';
        li.querySelector('.delete-btn').addEventListener('click', () => deleteBook(book.id, book.title));
        seriesBookList.appendChild(li);
      });

      seriesSection.querySelector('.series-back').addEventListener('click', showLibraryView);

      librarySection.style.display = 'none';
      seriesSection.style.display = '';
    }
```

---

## Task 10: Update `deleteBook()` to handle deletion from the series page

**Files:**
- Modify: `app/public/index.html` (JavaScript section)

- [ ] **Step 1: Replace the existing `deleteBook` function**

Find:
```js
    async function deleteBook(id, title) {
      if (!confirm(`Delete "${esc(title)}"?`)) return;
      const res = await fetch(`/api/books/${id}`, { method: 'DELETE' });
      if (res.status === 204) {
        await loadBooks();
      } else {
        alert('Failed to delete book.');
      }
    }
```

Replace with:
```js
    async function deleteBook(id, title) {
      if (!confirm(`Delete "${esc(title)}"?`)) return;
      const res = await fetch(`/api/books/${id}`, { method: 'DELETE' });
      if (res.status === 204) {
        if (currentSeriesName !== null) {
          await refreshSeriesPage();
        } else {
          await loadBooks();
        }
      } else {
        alert('Failed to delete book.');
      }
    }

    async function refreshSeriesPage() {
      try {
        const res = await fetch('/api/books');
        if (!res.ok) { await loadBooks(); showLibraryView(); return; }
        const allBooks = await res.json();
        const { series } = groupBooks(allBooks);
        const entry = series.find(([name]) => name === currentSeriesName);
        if (entry) {
          showSeriesPage(currentSeriesName, entry[1]);
        } else {
          await loadBooks();
          showLibraryView();
        }
      } catch {
        showLibraryView();
      }
    }
```

- [ ] **Step 2: Run the full test suite**

```bash
cd /Users/korzun/Code/HASS-ODPS && npx jest --no-coverage
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add app/public/index.html
git commit -m "feat: add series page navigation and delete-from-series support"
```

---

## Task 11: Manual smoke test

- [ ] **Step 1: Start the server**

```bash
cd /Users/korzun/Code/HASS-ODPS && node dist/index.js
```

If `dist/` is stale, build first: `npm run build && node dist/index.js` (check `package.json` for the build script name).

- [ ] **Step 2: Upload test EPUBs**

Upload at least:
- 2 books with the same `series` value
- 1 book with a different `series` value  
- 1 book with no series

Use the drop zone in the browser.

- [ ] **Step 3: Verify library view**

- Series groups appear at the top, sorted A–Z by series name
- Each series group shows fanned covers (or faded ghosts if < 3 books)
- "View series →" appears in each series row
- Standalone books appear below in a collapsible "Standalone Books" section, expanded by default
- Clicking the "Standalone Books" header collapses/expands it with chevron toggle

- [ ] **Step 4: Verify series page**

- Click a series group → series page appears
- Blue hero banner shows series name, author, book count, and fanned covers
- "← Library" button returns to the library view
- Books listed in reading order (`seriesIndex` ascending) with `#N` prefix in metadata
- Delete a book from the series page → page refreshes with updated list
- Delete the last book in a series → navigates back to the library

- [ ] **Step 5: Verify tab switching**

- While on series page, click the Users tab → series page disappears, users section appears
- Click Library tab → library list appears (not series page)

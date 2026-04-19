# Clear Button Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hide the "Clear" button on book rows where the current user has no synced reading progress.

**Architecture:** The client-side JS in `app/public/index.html` already computes `pct = progressMap.get(book.id)` before building each book row's HTML. The fix wraps the clear button HTML in a `pct != null` ternary in the two places it is rendered — no backend or API changes needed.

**Tech Stack:** Vanilla JS, HTML string concatenation inside a single-file frontend (`app/public/index.html`)

---

### Task 1: Hide Clear button in standalone books section

**Files:**
- Modify: `app/public/index.html` (around line 299)

- [ ] **Step 1: Locate the standalone section clear button**

Open `app/public/index.html`. Find the `renderStandaloneSection` function. The relevant block looks like this (around line 286–303):

```js
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
```

- [ ] **Step 2: Wrap the clear button in a conditional**

Replace the unconditional clear button line with a ternary:

```js
    pctHtml +
    (pct != null ? '<button class="clear-btn user-only" type="button" title="Clear reading status" style="background:transparent;border:none;cursor:pointer;color:#9ca3af;font-size:.75rem;padding:.25rem .5rem;border-radius:4px;font-family:inherit">Clear</button>' : '') +
    '<button class="delete-btn admin-only" type="button" title="Delete">🗑</button>' +
```

- [ ] **Step 3: Verify lint passes**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/public/index.html
git commit -m "feat: hide Clear button when no progress synced (standalone section)"
```

---

### Task 2: Hide Clear button in series page

**Files:**
- Modify: `app/public/index.html` (around line 367)

- [ ] **Step 1: Locate the series page clear button**

In the same file, find the `showSeriesPage` function. The relevant block (around line 352–371):

```js
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
```

- [ ] **Step 2: Wrap the clear button in a conditional**

Replace the unconditional clear button line with a ternary:

```js
    pctHtml +
    (pct != null ? '<button class="clear-btn user-only" type="button" title="Clear reading status" style="background:transparent;border:none;cursor:pointer;color:#9ca3af;font-size:.75rem;padding:.25rem .5rem;border-radius:4px;font-family:inherit">Clear</button>' : '') +
    '<button class="delete-btn admin-only" type="button" title="Delete">🗑</button>' +
```

- [ ] **Step 3: Verify lint passes**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/public/index.html
git commit -m "feat: hide Clear button when no progress synced (series page)"
```

---

### Task 3: Manual verification

- [ ] **Step 1: Start the server**

```bash
npm start
```

- [ ] **Step 2: Log in as a non-admin user and open the library**

Confirm that books with no KOReader progress have no "Clear" button visible. Confirm that books that have been opened in KOReader (and have progress synced) still show the "Clear" button.

- [ ] **Step 3: Run the full test suite to confirm no regressions**

```bash
npm test
```

Expected: all tests pass.

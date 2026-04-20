# Series Badge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `📚 N books` badge above the series title in the series detail hero card, replacing the "Books: N" stat.

**Architecture:** Single change to `showSeriesPage`'s `seriesSection.innerHTML` in `app/public/index.html`. The existing `.book-detail-series-badge` CSS class is reused — no new CSS needed.

**Tech Stack:** Vanilla HTML/CSS/JS (inline in `index.html`), Jest + Supertest for server-side tests.

---

### Task 1: Add series badge and remove Books stat

**Files:**
- Modify: `app/public/index.html:475-480` (`showSeriesPage` → `seriesSection.innerHTML` → `.book-detail-meta` inner content)

- [ ] **Step 1: Replace the `.book-detail-meta` inner content**

In `app/public/index.html`, find this block (lines 475–481):

```javascript
          '<div class="book-detail-meta">' +
            '<div class="book-detail-title">' + esc(seriesName) + '</div>' +
            (author ? '<div class="book-detail-author">' + esc(author) + '</div>' : '') +
            '<div class="book-detail-stats">' +
              '<div class="book-detail-stat">Books: <span>' + count + '</span></div>' +
            '</div>' +
          '</div>' +
```

Replace with:

```javascript
          '<div class="book-detail-meta">' +
            '<div class="book-detail-series-badge">📚 ' + count + ' book' + (count !== 1 ? 's' : '') + '</div>' +
            '<div class="book-detail-title">' + esc(seriesName) + '</div>' +
            (author ? '<div class="book-detail-author">' + esc(author) + '</div>' : '') +
          '</div>' +
```

- [ ] **Step 2: Run the full test suite**

```bash
npm test
```

Expected: ALL 214 tests pass.

- [ ] **Step 3: Run the linter**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/public/index.html
git commit -m "feat: add series count badge to series detail hero"
```

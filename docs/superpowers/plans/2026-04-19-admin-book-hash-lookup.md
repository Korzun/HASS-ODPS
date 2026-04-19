# Admin Book Hash Lookup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve the raw book hash shown in each user's progress record to a human-readable book title in the Admin Users tab.

**Architecture:** Pure frontend change to `app/public/index.html`. `cachedBooks` (already populated at init via `GET /api/books`) is queried by `book.id === progress.document` to get the title. Title shown as primary label; hash shown below in small muted monospace text. Raw hash shown alone when book not found.

**Tech Stack:** Vanilla JS, HTML — no build step for the frontend.

---

### Task 1: Update `toggleUser` to display book title with hash as secondary label

**Files:**
- Modify: `app/public/index.html:576-587`

- [ ] **Step 1: Replace the `prog-doc` span in `toggleUser`**

In `app/public/index.html`, locate the `forEach` loop inside `toggleUser` (around line 576). Replace the current progress item rendering:

```js
// BEFORE (line 576-587)
expandedData[username].forEach(p => {
  const item = document.createElement('li');
  item.className = 'progress-item';
  item.innerHTML = `
    <span class="prog-doc">${esc(p.document)}</span>
    <span class="prog-pct">${Math.round(p.percentage * 100)}%</span>
    <button class="delete-btn" type="button" title="Clear progress" style="grid-column:3;align-self:start">🗑</button>
    <span class="prog-meta">${esc(p.device)} · ${relativeTime(p.timestamp)}</span>
  `;
  item.querySelector('.delete-btn').addEventListener('click', () => clearAdminProgress(username, p.document, item, li));
  progressList.appendChild(item);
});
```

```js
// AFTER
expandedData[username].forEach(p => {
  const book = cachedBooks.find(b => b.id === p.document);
  const docLabel = book
    ? `${esc(book.title)}<small style="display:block;font-size:0.75em;opacity:0.5;font-family:monospace">${esc(p.document)}</small>`
    : esc(p.document);
  const item = document.createElement('li');
  item.className = 'progress-item';
  item.innerHTML = `
    <span class="prog-doc">${docLabel}</span>
    <span class="prog-pct">${Math.round(p.percentage * 100)}%</span>
    <button class="delete-btn" type="button" title="Clear progress" style="grid-column:3;align-self:start">🗑</button>
    <span class="prog-meta">${esc(p.device)} · ${relativeTime(p.timestamp)}</span>
  `;
  item.querySelector('.delete-btn').addEventListener('click', () => clearAdminProgress(username, p.document, item, li));
  progressList.appendChild(item);
});
```

- [ ] **Step 2: Update `clearAdminProgress` confirm dialog to use book title**

Locate `clearAdminProgress` (around line 604). Change the confirm message from using raw `docId` to using the book title when available:

```js
// BEFORE (line 604-605)
async function clearAdminProgress(username, docId, item, userLi) {
  if (!confirm(`Clear progress for "${docId}" for user "${username}"?`)) return;
```

```js
// AFTER
async function clearAdminProgress(username, docId, item, userLi) {
  const book = cachedBooks.find(b => b.id === docId);
  const label = book ? book.title : docId;
  if (!confirm(`Clear progress for "${label}" for user "${username}"?`)) return;
```

- [ ] **Step 3: Verify manually**

Build and run the app:
```bash
npm run build && npm start
```

1. Log in as admin
2. Go to the Users tab
3. Expand a user who has progress records for books present in the library
   - Each record should show the book title as the primary label
   - The 32-char hash should appear below it in small muted monospace text
4. Expand a user who has a progress record for a book no longer in the library (or test with a hash that doesn't match any book)
   - The record should show only the raw hash (no title, no `<small>` element)
5. Click the trash icon on a record for a known book
   - The confirm dialog should read: `Clear progress for "Book Title" for user "username"?`
6. Click the trash icon on an unknown-book record
   - The confirm dialog should read: `Clear progress for "a1b2c3...32chars" for user "username"?`

- [ ] **Step 4: Commit**

```bash
git add app/public/index.html
git commit -m "feat: show book title in admin user progress records"
```

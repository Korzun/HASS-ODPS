# Series View UI Changes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the series detail view with the book detail view by moving the breadcrumb nav above the hero and replacing the blue hero banner with the white card style.

**Architecture:** All changes are in `app/public/index.html` — the `showSeriesPage` JS function and the `<style>` block. The existing `.book-detail-*` CSS classes are reused; no new CSS is added. One existing test references `.series-hero` and must be updated.

**Tech Stack:** Vanilla HTML/CSS/JS (inline in `index.html`), Jest + Supertest for server-side tests.

---

### Task 1: Update the failing test

**Files:**
- Modify: `app/routes/ui.test.ts:654-659`

The `contains series UI CSS classes` test currently asserts `.series-hero` is present in the page. After this change that rule is gone; replace the assertion with `.series-order-label`, which remains.

- [ ] **Step 1: Update the test**

In `app/routes/ui.test.ts`, find this block (around line 654):

```typescript
  it('contains series UI CSS classes', async () => {
    const agent = await adminAgent();
    const res = await agent.get('/');
    expect(res.text).toContain('.series-row');
    expect(res.text).toContain('.series-hero');
  });
```

Replace with:

```typescript
  it('contains series UI CSS classes', async () => {
    const agent = await adminAgent();
    const res = await agent.get('/');
    expect(res.text).toContain('.series-row');
    expect(res.text).toContain('.series-order-label');
  });
```

- [ ] **Step 2: Run the test to verify it passes**

`.series-order-label` already exists in the CSS, so the updated assertion should pass immediately. This confirms the replacement assertion is valid before we delete `.series-hero` in the next task.

```bash
npm test -- --testPathPattern=ui.test
```

Expected: ALL tests pass (`.series-order-label` is already in the CSS).

- [ ] **Step 3: Commit the test change**

```bash
git add app/routes/ui.test.ts
git commit -m "test: update series UI CSS assertion for hero refactor"
```

---

### Task 2: Replace series-hero CSS with series-order-label

**Files:**
- Modify: `app/public/index.html` — `<style>` block, lines 69–76

Remove the five series-hero/series-back rules and add `.series-order-label` if not already present (it is already present at line 76—just verify). The goal is: after this step the test from Task 1 passes.

- [ ] **Step 1: Remove the series-hero and series-back CSS rules**

In `app/public/index.html`, find and delete these lines from the `<style>` block:

```css
    /* Series page */
    .series-hero{background:#1e40af;padding:1rem 1.5rem;display:flex;align-items:flex-end;gap:1rem;border-radius:6px;margin-bottom:.75rem}
    .series-hero-badge{font-size:.65rem;color:rgba(255,255,255,.65);text-transform:uppercase;letter-spacing:.07em;margin-bottom:.25rem}
    .series-hero-title{font-size:1.1rem;font-weight:700;color:#fff;line-height:1.2;margin-bottom:.2rem}
    .series-hero-meta{font-size:.75rem;color:rgba(255,255,255,.75)}
    .series-back{background:none;border:none;color:#1e40af;font-size:.8rem;font-weight:500;cursor:pointer;padding:0;font-family:inherit;display:inline-block;margin:.75rem 0}
    .series-back:hover{text-decoration:underline}
```

Leave the `/* Series page */` comment in place only if `.series-order-label` still follows it. The file should now have (around that area):

```css
    /* Series page */
    .series-order-label{font-size:.68rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin-bottom:.45rem}
```

- [ ] **Step 2: Run the test suite to verify the test now passes**

```bash
npm test -- --testPathPattern=ui.test
```

Expected: ALL tests pass, including `contains series UI CSS classes`.

- [ ] **Step 3: Commit**

```bash
git add app/public/index.html
git commit -m "style: remove series-hero and series-back CSS rules"
```

---

### Task 3: Rewrite showSeriesPage HTML

**Files:**
- Modify: `app/public/index.html` — `showSeriesPage` function, lines ~473–487 and ~524

Replace the `seriesSection.innerHTML` assignment and update the back-button event listener selector.

- [ ] **Step 1: Replace the seriesSection.innerHTML assignment**

Find this block in `showSeriesPage` (around line 473):

```javascript
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
```

Replace with:

```javascript
      seriesSection.innerHTML =
        '<div class="book-detail-nav">' +
          '<button class="book-back-btn" type="button">← Library</button>' +
          '<span class="sep">/</span>' +
          '<span class="crumb-current">' + esc(seriesName) + '</span>' +
        '</div>' +
        '<div class="book-detail-hero">' +
          '<div style="flex-shrink:0">' + heroStack + '</div>' +
          '<div class="book-detail-meta">' +
            '<div class="book-detail-title">' + esc(seriesName) + '</div>' +
            (author ? '<div class="book-detail-author">' + esc(author) + '</div>' : '') +
            '<div class="book-detail-stats">' +
              '<div class="book-detail-stat">Books: <span>' + count + '</span></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="series-order-label">Reading Order</div>' +
        '<ul id="series-book-list" style="list-style:none;padding:0;margin:0"></ul>';
```

- [ ] **Step 2: Update the event listener selector**

Still in `showSeriesPage`, find this line near the bottom of the function (around line 524):

```javascript
      seriesSection.querySelector('.series-back').addEventListener('click', showLibraryView);
```

Replace with:

```javascript
      seriesSection.querySelector('.book-back-btn').addEventListener('click', showLibraryView);
```

- [ ] **Step 3: Run the full test suite**

```bash
npm test
```

Expected: ALL tests pass.

- [ ] **Step 4: Run the linter**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 5: Manually verify in browser**

Start the server and open the app. Navigate to Library → click a series → confirm:
- Breadcrumb `← Library / Series Name` appears at the top
- White card hero with series name, author, and book count below the breadcrumb
- "Reading Order" label and book list follow
- Clicking `← Library` in the breadcrumb returns to the library view

- [ ] **Step 6: Commit**

```bash
git add app/public/index.html
git commit -m "feat: align series view nav and hero with book detail view"
```

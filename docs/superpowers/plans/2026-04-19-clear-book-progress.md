# Admin Clear Book Progress Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins clear a specific user's KOSync progress record for a single book from the Users tab.

**Architecture:** One new route handler in the existing admin-only users router calls the existing `UserStore.clearProgress` method. The Users tab UI gains a trash button per expanded progress item.

**Tech Stack:** TypeScript/Express backend, better-sqlite3, supertest for tests, vanilla JS + HTML frontend.

---

### Task 1: Add failing tests for `DELETE /api/users/:username/progress/:document`

**Files:**
- Modify: `app/routes/users.test.ts`

- [ ] **Step 1: Add the test suite**

  In `app/routes/users.test.ts`, add the following `describe` block **before** the existing `describe('RBAC — regular user is forbidden …')` block (after the `describe('POST /api/users', …)` block, around line 212):

  ```typescript
  describe('DELETE /api/users/:username/progress/:document', () => {
    it('redirects to /login without session', async () => {
      const res = await request(app).delete('/api/users/alice/progress/doc1');
      expect(res.status).toBe(302);
    });

    it('returns 404 when user does not exist', async () => {
      const agent = await adminAgent();
      const res = await agent.delete('/api/users/nobody/progress/doc1');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('User not found');
    });

    it('returns 404 when user exists but has no progress for that document', async () => {
      userStore.createUser('alice', 'pass');
      const agent = await adminAgent();
      const res = await agent.delete('/api/users/alice/progress/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Progress record not found');
    });

    it('clears the progress record and returns 204', async () => {
      userStore.createUser('alice', 'pass');
      userStore.saveProgress('alice', {
        document: 'dune.epub',
        progress: '/p[5]',
        percentage: 0.42,
        device: 'Kobo',
        device_id: 'd1',
      });
      const agent = await adminAgent();
      const res = await agent.delete('/api/users/alice/progress/dune.epub');
      expect(res.status).toBe(204);
      expect(userStore.getProgress('alice', 'dune.epub')).toBeNull();
    });
  });
  ```

  Also add one case to the existing `describe('RBAC — regular user is forbidden …')` block at the bottom of the file:

  ```typescript
  it('DELETE /api/users/:username/progress/:document returns 403 for regular user', async () => {
    const agent = await userAgent();
    const res = await agent.delete('/api/users/alice/progress/doc1');
    expect(res.status).toBe(403);
  });
  ```

- [ ] **Step 2: Run the new tests to verify they fail**

  ```bash
  npx jest app/routes/users.test.ts --no-coverage 2>&1 | tail -20
  ```

  Expected: several `FAIL` entries — the new tests should fail because the route does not exist yet (likely `404` or `302` mismatches).

---

### Task 2: Implement the endpoint

**Files:**
- Modify: `app/routes/users.ts`

- [ ] **Step 1: Add the route handler**

  In `app/routes/users.ts`, insert the following block **after** the `router.delete('/:username', …)` handler (after line 42, before the `router.post('/', …)` handler):

  ```typescript
  router.delete('/:username/progress/:document', (req: Request, res: Response) => {
    const { username, document } = req.params;
    if (!userStore.userExists(username)) {
      log.warn(`Progress clear attempted for unknown user "${username}"`);
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const cleared = userStore.clearProgress(username, document);
    if (!cleared) {
      log.warn(`Progress clear: no record for "${username}" document "${document}"`);
      res.status(404).json({ error: 'Progress record not found' });
      return;
    }
    log.info(`Progress cleared for "${username}" document "${document}"`);
    res.status(204).send();
  });
  ```

- [ ] **Step 2: Run the tests to verify they pass**

  ```bash
  npx jest app/routes/users.test.ts --no-coverage 2>&1 | tail -20
  ```

  Expected: all tests `PASS`.

- [ ] **Step 3: Commit**

  ```bash
  git add app/routes/users.ts app/routes/users.test.ts
  git commit -m "feat: add DELETE /api/users/:username/progress/:document admin endpoint"
  ```

---

### Task 3: Add clear button to the progress items in the Users tab

**Files:**
- Modify: `app/public/index.html`

- [ ] **Step 1: Update the CSS grid for progress items**

  In `app/public/index.html`, find this CSS rule (around line 49):

  ```css
  .progress-item{display:grid;grid-template-columns:1fr auto;gap:.25rem .75rem;padding:.5rem 1rem .5rem 2.25rem;border-bottom:1px solid #eef2f7}
  ```

  Replace it with:

  ```css
  .progress-item{display:grid;grid-template-columns:1fr auto auto;gap:.25rem .75rem;padding:.5rem 1rem .5rem 2.25rem;border-bottom:1px solid #eef2f7}
  ```

  Then find this rule (around line 53):

  ```css
  .prog-meta{font-size:.7rem;color:#9ca3af;grid-column:1/3}
  ```

  Replace it with:

  ```css
  .prog-meta{font-size:.7rem;color:#9ca3af;grid-column:1/4}
  ```

- [ ] **Step 2: Add the `clearAdminProgress` function**

  In the `<script>` block, find the `deleteUser` function (around line 589). Add the following function **directly after** `deleteUser`:

  ```javascript
  async function clearAdminProgress(username, document, item, userLi) {
    if (!confirm(`Clear progress for "${document}" for user "${username}"?`)) return;
    const res = await fetch(
      '/api/users/' + encodeURIComponent(username) + '/progress/' + encodeURIComponent(document),
      { method: 'DELETE' }
    );
    if (res.status === 204) {
      item.remove();
      delete expandedData[username];
      const remaining = userLi.querySelectorAll('.progress-item').length;
      const metaEl = userLi.querySelector('.user-meta');
      if (metaEl) metaEl.textContent = remaining + ' synced';
    } else {
      alert('Failed to clear progress.');
    }
  }
  ```

- [ ] **Step 3: Add the trash button to each rendered progress item**

  In the `toggleUser` function (around line 558), find the block that builds each progress item:

  ```javascript
  expandedData[username].forEach(p => {
    const item = document.createElement('li');
    item.className = 'progress-item';
    item.innerHTML = `
      <span class="prog-doc">${esc(p.document)}</span>
      <span class="prog-pct">${Math.round(p.percentage * 100)}%</span>
      <span class="prog-meta">${esc(p.device)} · ${relativeTime(p.timestamp)}</span>
    `;
    progressList.appendChild(item);
  });
  ```

  Replace it with:

  ```javascript
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

- [ ] **Step 4: Verify manually**

  Start the server with `npx ts-node app/index.ts` (or however you normally run locally), log in as admin, go to the Users tab, expand a user with progress records, and confirm:
  - Each record shows a `🗑` button on the right.
  - Clicking it shows `confirm("Clear progress for … for user …?")`.
  - Confirming removes the row and decrements the count in the user header.
  - Cancelling does nothing.

- [ ] **Step 5: Run the full test suite**

  ```bash
  npx jest --no-coverage 2>&1 | tail -20
  ```

  Expected: all tests `PASS`.

- [ ] **Step 6: Commit**

  ```bash
  git add app/public/index.html
  git commit -m "feat: add per-record clear button in admin Users tab"
  ```

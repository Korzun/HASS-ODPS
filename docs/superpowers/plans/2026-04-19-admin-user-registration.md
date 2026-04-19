# Admin User Registration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow the admin to create KOSync users through the web UI by adding a `POST /api/users` endpoint and an inline registration form in the Users tab.

**Architecture:** Add one route handler to the existing users router (already session-protected), then add a small form + JS block to the existing single-page HTML. No new files, no new services.

**Tech Stack:** TypeScript, Express, better-sqlite3, Jest + Supertest (tests), vanilla JS (UI)

---

## Files

- Modify: `app/routes/users.ts` — add `POST /` handler
- Modify: `app/routes/users.test.ts` — add tests for `POST /api/users`
- Modify: `app/public/index.html` — add registration form HTML and JS

---

## Task 1: Backend — `POST /api/users` with tests

**Files:**
- Modify: `app/routes/users.ts`
- Modify: `app/routes/users.test.ts`

- [ ] **Step 1: Write the failing tests**

Add this `describe` block at the end of `app/routes/users.test.ts`, after the existing `DELETE` describe block:

```typescript
describe('POST /api/users', () => {
  it('redirects to /login without session', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ username: 'bob', password: 'pass' });
    expect(res.status).toBe(302);
  });

  it('creates a user and returns 201', async () => {
    const agent = await authenticatedAgent();
    const res = await agent
      .post('/api/users')
      .send({ username: 'bob', password: 'secret' });
    expect(res.status).toBe(201);
    expect(res.body.username).toBe('bob');
    expect(userStore.userExists('bob')).toBe(true);
    expect(userStore.authenticate('bob', UserStore.hashPassword('secret'))).toBe(true);
  });

  it('returns 409 for duplicate username', async () => {
    userStore.createUser('bob', UserStore.hashPassword('pass'));
    const agent = await authenticatedAgent();
    const res = await agent
      .post('/api/users')
      .send({ username: 'bob', password: 'other' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Username already exists');
  });

  it('returns 400 when username is missing', async () => {
    const agent = await authenticatedAgent();
    const res = await agent
      .post('/api/users')
      .send({ password: 'pass' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Username and password are required');
  });

  it('returns 400 when password is missing', async () => {
    const agent = await authenticatedAgent();
    const res = await agent
      .post('/api/users')
      .send({ username: 'bob' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Username and password are required');
  });

  it('returns 400 when username is blank', async () => {
    const agent = await authenticatedAgent();
    const res = await agent
      .post('/api/users')
      .send({ username: '   ', password: 'pass' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Username and password are required');
  });
});
```

- [ ] **Step 2: Run the tests — confirm they fail**

```bash
npm test -- --testPathPattern=routes/users
```

Expected: 6 new failures — `Cannot POST /api/users` or similar.

- [ ] **Step 3: Implement `POST /` in `app/routes/users.ts`**

Add this handler inside `createUsersRouter`, after the existing `router.delete` block and before `return router`:

```typescript
router.post('/', (req: Request, res: Response) => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username?.trim() || !password?.trim()) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }
  const key = UserStore.hashPassword(password);
  const created = userStore.createUser(username.trim(), key);
  if (!created) {
    log.warn(`Registration failed — duplicate username "${username.trim()}"`);
    res.status(409).json({ error: 'Username already exists' });
    return;
  }
  log.info(`User "${username.trim()}" registered by admin`);
  res.status(201).json({ username: username.trim() });
});
```

- [ ] **Step 4: Run the tests — confirm they pass**

```bash
npm test -- --testPathPattern=routes/users
```

Expected: all tests in this file pass (including the 6 new ones).

- [ ] **Step 5: Commit**

```bash
git add app/routes/users.ts app/routes/users.test.ts
git commit -m "feat: add POST /api/users for admin user registration"
```

---

## Task 2: UI — Registration form in the Users tab

**Files:**
- Modify: `app/public/index.html`

- [ ] **Step 1: Add the form HTML**

Inside `app/public/index.html`, find the `#users-section` div:

```html
    <div id="users-section" style="display:none">
      <ul id="user-list"></ul>
      <p id="users-empty" style="display:none">No KOSync users registered yet.</p>
    </div>
```

Replace it with:

```html
    <div id="users-section" style="display:none">
      <div id="register-user-form" style="background:#fff;border-radius:6px;padding:.75rem 1rem;margin-bottom:1rem;box-shadow:0 1px 3px rgba(0,0,0,.07)">
        <div style="font-size:.8rem;font-weight:600;color:#374151;margin-bottom:.5rem;text-transform:uppercase;letter-spacing:.05em">Register User</div>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:flex-start">
          <input id="reg-username" type="text" placeholder="Username" autocomplete="off" style="flex:1;min-width:120px;padding:.4rem .6rem;border:1px solid #d1d5db;border-radius:4px;font-size:.875rem;font-family:inherit">
          <input id="reg-password" type="password" placeholder="Password" autocomplete="new-password" style="flex:1;min-width:120px;padding:.4rem .6rem;border:1px solid #d1d5db;border-radius:4px;font-size:.875rem;font-family:inherit">
          <button id="reg-btn" type="button" style="background:#1e40af;color:#fff;border:none;border-radius:4px;padding:.4rem .9rem;font-size:.875rem;cursor:pointer;font-family:inherit;white-space:nowrap">Register</button>
        </div>
        <div id="reg-status" style="margin-top:.4rem;font-size:.8rem;min-height:1rem"></div>
      </div>
      <ul id="user-list"></ul>
      <p id="users-empty" style="display:none">No KOSync users registered yet.</p>
    </div>
```

- [ ] **Step 2: Add the registration JS**

In `app/public/index.html`, find the comment `// ── Users ─────────────────────────────────────────────` in the `<script>` block. Add the following block immediately after the closing brace of the `deleteUser` function (after the `async function deleteUser` block), before `loadBooks();`:

```javascript
    // ── Register User ─────────────────────────────────────
    const regUsername = document.getElementById('reg-username');
    const regPassword = document.getElementById('reg-password');
    const regBtn = document.getElementById('reg-btn');
    const regStatus = document.getElementById('reg-status');

    regBtn.addEventListener('click', async () => {
      const username = regUsername.value.trim();
      const password = regPassword.value.trim();
      regStatus.textContent = '';
      regStatus.className = '';
      if (!username || !password) {
        regStatus.textContent = '✗ Username and password are required';
        regStatus.className = 'status-err';
        return;
      }
      regBtn.disabled = true;
      regBtn.textContent = 'Registering…';
      try {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (res.status === 201) {
          regStatus.textContent = '✓ User registered';
          regStatus.className = 'status-ok';
          regUsername.value = '';
          regPassword.value = '';
          usersLoaded = false;
          await loadUsers();
        } else if (res.status === 409) {
          regStatus.textContent = '✗ Username already taken';
          regStatus.className = 'status-err';
        } else {
          regStatus.textContent = `✗ ${data.error || 'Registration failed'}`;
          regStatus.className = 'status-err';
        }
      } catch {
        regStatus.textContent = '✗ Registration failed';
        regStatus.className = 'status-err';
      } finally {
        regBtn.disabled = false;
        regBtn.textContent = 'Register';
      }
    });
```

- [ ] **Step 3: Manually verify**

Build the project and spot-check in a browser:

```bash
npm run build
```

Open the app, navigate to the Users tab. Confirm:
- The "Register User" form appears at the top
- Submitting with valid unique credentials shows "✓ User registered", clears the inputs, and the new user appears in the list
- Submitting a duplicate username shows "✗ Username already taken"
- Submitting with empty fields shows "✗ Username and password are required"

- [ ] **Step 4: Commit**

```bash
git add app/public/index.html
git commit -m "feat: add admin user registration form to Users tab"
```

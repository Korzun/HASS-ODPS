# User Login & RBAC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow regular users from the SQLite users table to log into the web UI, and enforce role-based access control so only the config admin can delete books, scan the library, or access user management features.

**Architecture:** At login, the server checks admin credentials first, then falls back to the SQLite users table. The session stores `username` and `isAdmin`. A new `adminAuth` middleware gates admin-only routes. The frontend fetches `/api/me` on load and hides admin-only UI elements for regular users.

**Tech Stack:** TypeScript, Express, express-session, better-sqlite3, Supertest (tests), vanilla JS (frontend)

---

## File Map

| Action | File | Change |
|--------|------|--------|
| Modify | `app/global.d.ts` | Add `username` and `isAdmin` to SessionData |
| Modify | `app/services/user-store.ts` | Add `validateUser(username, password): boolean` |
| Modify | `app/middleware/auth.ts` | Add and export `adminAuth` middleware |
| Modify | `app/routes/ui.ts` | Add `userStore` param; update `POST /login`; add `GET /api/me`; add `adminAuth` to delete/scan |
| Modify | `app/routes/users.ts` | Add `adminAuth` to the router |
| Modify | `app/app.ts` | Pass `userStore` to `createUiRouter` |
| Modify | `app/public/index.html` | Add username display, `init()` function, role-based visibility |
| Modify | `app/services/user-store.test.ts` | Add `validateUser` tests |
| Modify | `app/routes/ui.test.ts` | Update setup; add user-session agent; add tests for login, `/api/me`, 403 on book routes |
| Modify | `app/routes/users.test.ts` | Update setup; add admin/user agents; add 403 tests |

---

### Task 1: Extend session type + add `UserStore.validateUser`

**Files:**
- Modify: `app/global.d.ts`
- Modify: `app/services/user-store.ts`
- Modify: `app/services/user-store.test.ts`

- [ ] **Step 1: Write the failing tests**

Add a new `describe` block at the bottom of `app/services/user-store.test.ts`:

```typescript
describe('UserStore.validateUser', () => {
  beforeEach(() => store.createUser('alice', UserStore.hashPassword('secret')));

  it('returns true with correct plaintext password', () => {
    expect(store.validateUser('alice', 'secret')).toBe(true);
  });

  it('returns false with wrong password', () => {
    expect(store.validateUser('alice', 'wrongpass')).toBe(false);
  });

  it('returns false for unknown user', () => {
    expect(store.validateUser('nobody', 'secret')).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/korzun/Code/HASS-ODPS && npx jest app/services/user-store.test.ts --no-coverage 2>&1 | tail -20
```

Expected: FAIL — `store.validateUser is not a function`

- [ ] **Step 3: Extend the session type in `app/global.d.ts`**

Replace the entire file with:

```typescript
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    authenticated?: boolean;
    username?: string;
    isAdmin?: boolean;
  }
}

declare global {
  namespace Express {
    interface Request {
      kosyncUser?: string;
    }
  }
}

export {};
```

- [ ] **Step 4: Add `validateUser` to `app/services/user-store.ts`**

Add this method after `authenticate` (line 50):

```typescript
validateUser(username: string, password: string): boolean {
  return this.authenticate(username, UserStore.hashPassword(password));
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd /Users/korzun/Code/HASS-ODPS && npx jest app/services/user-store.test.ts --no-coverage 2>&1 | tail -20
```

Expected: PASS — all tests green

- [ ] **Step 6: Commit**

```bash
cd /Users/korzun/Code/HASS-ODPS && git add app/global.d.ts app/services/user-store.ts app/services/user-store.test.ts && git commit -m "feat: add validateUser to UserStore and extend session type for RBAC"
```

---

### Task 2: Add `adminAuth` middleware

**Files:**
- Modify: `app/middleware/auth.ts`

- [ ] **Step 1: Add `adminAuth` to `app/middleware/auth.ts`**

Append after the `sessionAuth` function (at the end of the file, before the closing):

```typescript
/** Admin-only gate — must run after sessionAuth. Returns 403 for non-admin sessions. */
export function adminAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.isAdmin) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  next();
}
```

- [ ] **Step 2: Run the full test suite to confirm nothing broke**

```bash
cd /Users/korzun/Code/HASS-ODPS && npx jest --no-coverage 2>&1 | tail -20
```

Expected: all tests still pass

- [ ] **Step 3: Commit**

```bash
cd /Users/korzun/Code/HASS-ODPS && git add app/middleware/auth.ts && git commit -m "feat: add adminAuth middleware"
```

---

### Task 3: Update `POST /login`, add `GET /api/me`, wire `userStore` into the UI router

**Files:**
- Modify: `app/routes/ui.ts`
- Modify: `app/app.ts`
- Modify: `app/routes/ui.test.ts`

- [ ] **Step 1: Write failing tests**

In `app/routes/ui.test.ts`, make the following changes:

**a) Add `UserStore` import at the top:**
```typescript
import { UserStore } from '../services/user-store';
```

**b) Add `userStore` variable alongside the existing ones:**
```typescript
let userStore: UserStore;
```

**c) In `beforeEach`, create `userStore` and register a regular test user (add after `bookStore = new BookStore(booksDir, db)`):**
```typescript
userStore = new UserStore(db);
userStore.createUser('alice', UserStore.hashPassword('alicepass'));
```

**d) Update the router mounting line** (find `app.use('/', createUiRouter(bookStore, { ...config, booksDir }))` and replace with):
```typescript
app.use('/', createUiRouter(bookStore, userStore, { ...config, booksDir }));
```

**e) Rename the existing `authenticatedAgent` helper to `adminAgent`:**
```typescript
async function adminAgent() {
  const agent = request.agent(app);
  await agent
    .post('/login')
    .send('username=admin&password=pass')
    .set('Content-Type', 'application/x-www-form-urlencoded');
  return agent;
}
```

**f) Add a new `userAgent` helper after `adminAgent`:**
```typescript
async function userAgent() {
  const agent = request.agent(app);
  await agent
    .post('/login')
    .send('username=alice&password=alicepass')
    .set('Content-Type', 'application/x-www-form-urlencoded');
  return agent;
}
```

**g) Update the existing tests that call `authenticatedAgent()` to call `adminAgent()` instead** (there are several — do a find-replace within the file for `authenticatedAgent()` → `adminAgent()`).

**h) Update the existing `POST /login` describe block** to add new test cases, and add a new describe block for `/api/me`. Replace the existing `describe('POST /login', ...)` block with:

```typescript
describe('POST /login', () => {
  it('redirects to / on correct admin credentials', async () => {
    const res = await request(app)
      .post('/login')
      .send('username=admin&password=pass')
      .set('Content-Type', 'application/x-www-form-urlencoded');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/');
  });

  it('redirects to / on correct regular user credentials', async () => {
    const res = await request(app)
      .post('/login')
      .send('username=alice&password=alicepass')
      .set('Content-Type', 'application/x-www-form-urlencoded');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/');
  });

  it('returns 401 on wrong password', async () => {
    const res = await request(app)
      .post('/login')
      .send('username=admin&password=wrong')
      .set('Content-Type', 'application/x-www-form-urlencoded');
    expect(res.status).toBe(401);
  });

  it('returns 401 for unknown user', async () => {
    const res = await request(app)
      .post('/login')
      .send('username=nobody&password=pass')
      .set('Content-Type', 'application/x-www-form-urlencoded');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/me', () => {
  it('redirects to /login without session', async () => {
    const res = await request(app).get('/api/me');
    expect(res.status).toBe(302);
  });

  it('returns isAdmin true for admin session', async () => {
    const agent = await adminAgent();
    const res = await agent.get('/api/me');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ username: 'admin', isAdmin: true });
  });

  it('returns isAdmin false for regular user session', async () => {
    const agent = await userAgent();
    const res = await agent.get('/api/me');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ username: 'alice', isAdmin: false });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/korzun/Code/HASS-ODPS && npx jest app/routes/ui.test.ts --no-coverage 2>&1 | tail -30
```

Expected: FAIL — `createUiRouter` wrong arity, `GET /api/me` 404

- [ ] **Step 3: Update `app/routes/ui.ts`**

**a) Add `UserStore` and `adminAuth` imports** (add to the existing import block at the top):
```typescript
import { UserStore } from '../services/user-store';
import { sessionAuth, adminAuth } from '../middleware/auth';
```
(Replace the existing `import { sessionAuth } from '../middleware/auth';` line.)

**b) Update the `createUiRouter` function signature** (find the line `export function createUiRouter(bookStore: BookStore, config: AppConfig): Router` and replace with):
```typescript
export function createUiRouter(bookStore: BookStore, userStore: UserStore, config: AppConfig): Router {
```

**c) Replace the entire `router.post('/login', ...)` handler** with:
```typescript
router.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (typeof username !== 'string' || typeof password !== 'string') {
    res.status(401).send(loginPage('Invalid credentials'));
    return;
  }
  if (username === config.username && password === config.password) {
    req.session.authenticated = true;
    req.session.isAdmin = true;
    req.session.username = config.username;
    log.info(`Admin "${username}" logged in`);
    res.redirect('/');
    return;
  }
  if (userStore.validateUser(username, password)) {
    req.session.authenticated = true;
    req.session.isAdmin = false;
    req.session.username = username;
    log.info(`User "${username}" logged in`);
    res.redirect('/');
    return;
  }
  log.warn(`Login failed for username "${username ?? ''}"`);
  res.status(401).send(loginPage('Invalid credentials'));
});
```

**d) Add `GET /api/me`** after the `router.post('/logout', ...)` handler and before the `// ── Protected ─` comment:
```typescript
router.get('/api/me', sessionAuth, (req: Request, res: Response) => {
  res.json({ username: req.session.username, isAdmin: req.session.isAdmin });
});
```

- [ ] **Step 4: Update `app/app.ts`**

Find the line:
```typescript
app.use('/', createUiRouter(bookStore, config));
```
Replace it with:
```typescript
app.use('/', createUiRouter(bookStore, userStore, config));
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd /Users/korzun/Code/HASS-ODPS && npx jest app/routes/ui.test.ts --no-coverage 2>&1 | tail -30
```

Expected: PASS — all tests green

- [ ] **Step 6: Run full test suite**

```bash
cd /Users/korzun/Code/HASS-ODPS && npx jest --no-coverage 2>&1 | tail -20
```

Expected: all tests pass

- [ ] **Step 7: Commit**

```bash
cd /Users/korzun/Code/HASS-ODPS && git add app/routes/ui.ts app/app.ts app/routes/ui.test.ts && git commit -m "feat: allow regular users to log in; add GET /api/me"
```

---

### Task 4: Protect admin-only book routes and users router

**Files:**
- Modify: `app/routes/ui.ts`
- Modify: `app/routes/users.ts`
- Modify: `app/routes/ui.test.ts`
- Modify: `app/routes/users.test.ts`

- [ ] **Step 1: Write failing tests for admin-only book routes**

In `app/routes/ui.test.ts`, add a new describe block after the `/api/me` tests:

```typescript
describe('DELETE /api/books/:id (admin-only)', () => {
  beforeEach(() => {
    bookStore.addBook('b1', 'book.epub', path.join(booksDir, 'book.epub'), 100, new Date(), FAKE_META);
  });

  it('returns 204 for admin', async () => {
    const agent = await adminAgent();
    const res = await agent.delete('/api/books/b1');
    expect(res.status).toBe(204);
  });

  it('returns 403 for regular user', async () => {
    const agent = await userAgent();
    const res = await agent.delete('/api/books/b1');
    expect(res.status).toBe(403);
  });
});

describe('POST /api/books/scan (admin-only)', () => {
  it('returns 200 for admin', async () => {
    const agent = await adminAgent();
    const res = await agent.post('/api/books/scan');
    expect(res.status).toBe(200);
  });

  it('returns 403 for regular user', async () => {
    const agent = await userAgent();
    const res = await agent.post('/api/books/scan');
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 2: Write failing tests for users router**

In `app/routes/users.test.ts`, make the following changes:

**a) Update the `beforeEach` fake login** — replace the single `/login` endpoint with two:

```typescript
app.post('/login/admin', (req, res) => {
  req.session.authenticated = true;
  (req.session as any).isAdmin = true;
  res.status(200).send('ok');
});
app.post('/login/user', (req, res) => {
  req.session.authenticated = true;
  (req.session as any).isAdmin = false;
  res.status(200).send('ok');
});
```

**b) Replace the existing `authenticatedAgent` helper** with two helpers:

```typescript
async function adminAgent() {
  const agent = request.agent(app);
  await agent.post('/login/admin');
  return agent;
}

async function userAgent() {
  const agent = request.agent(app);
  await agent.post('/login/user');
  return agent;
}
```

**c) Update all existing calls** to `authenticatedAgent()` → `adminAgent()` in the file.

**d) Add a new describe block** for RBAC at the bottom of the file:

```typescript
describe('RBAC — regular user is forbidden from all /api/users routes', () => {
  it('GET /api/users returns 403 for regular user', async () => {
    const agent = await userAgent();
    const res = await agent.get('/api/users');
    expect(res.status).toBe(403);
  });

  it('POST /api/users returns 403 for regular user', async () => {
    const agent = await userAgent();
    const res = await agent.post('/api/users').send({ username: 'bob', password: 'pass' });
    expect(res.status).toBe(403);
  });

  it('DELETE /api/users/:username returns 403 for regular user', async () => {
    userStore.createUser('victim', 'pass');
    const agent = await userAgent();
    const res = await agent.delete('/api/users/victim');
    expect(res.status).toBe(403);
  });

  it('GET /api/users/:username/progress returns 403 for regular user', async () => {
    userStore.createUser('alice', 'pass');
    const agent = await userAgent();
    const res = await agent.get('/api/users/alice/progress');
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd /Users/korzun/Code/HASS-ODPS && npx jest app/routes/ui.test.ts app/routes/users.test.ts --no-coverage 2>&1 | tail -30
```

Expected: FAIL — regular user gets 204/200/302 instead of 403

- [ ] **Step 4: Apply `adminAuth` to book routes in `app/routes/ui.ts`**

Find:
```typescript
router.delete('/api/books/:id', sessionAuth, (req: Request, res: Response) => {
```
Replace with:
```typescript
router.delete('/api/books/:id', sessionAuth, adminAuth, (req: Request, res: Response) => {
```

Find:
```typescript
router.post('/api/books/scan', sessionAuth, (_req: Request, res: Response) => {
```
Replace with:
```typescript
router.post('/api/books/scan', sessionAuth, adminAuth, (_req: Request, res: Response) => {
```

- [ ] **Step 5: Apply `adminAuth` to the users router in `app/routes/users.ts`**

Add the import for `adminAuth` (update the existing auth import line):
```typescript
import { sessionAuth, adminAuth } from '../middleware/auth';
```

Find:
```typescript
router.use(sessionAuth);
```
Replace with:
```typescript
router.use(sessionAuth);
router.use(adminAuth);
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd /Users/korzun/Code/HASS-ODPS && npx jest app/routes/ui.test.ts app/routes/users.test.ts --no-coverage 2>&1 | tail -30
```

Expected: PASS — all tests green

- [ ] **Step 7: Run full test suite**

```bash
cd /Users/korzun/Code/HASS-ODPS && npx jest --no-coverage 2>&1 | tail -20
```

Expected: all tests pass

- [ ] **Step 8: Commit**

```bash
cd /Users/korzun/Code/HASS-ODPS && git add app/routes/ui.ts app/routes/users.ts app/routes/ui.test.ts app/routes/users.test.ts && git commit -m "feat: restrict book delete/scan and all user management to admin"
```

---

### Task 5: Frontend — username display and role-based visibility

**Files:**
- Modify: `app/public/index.html`

- [ ] **Step 1: Add username placeholder to the header**

In `app/public/index.html`, find:
```html
  <header>
    <h1>📚 HASS-ODPS Library</h1>
    <form method="POST" action="/logout" style="margin:0">
      <button class="signout">Sign Out</button>
    </form>
  </header>
```
Replace with:
```html
  <header>
    <h1>📚 HASS-ODPS Library</h1>
    <div style="display:flex;align-items:center;gap:.75rem">
      <span id="current-username" style="font-size:.875rem;opacity:.85"></span>
      <form method="POST" action="/logout" style="margin:0">
        <button class="signout">Sign Out</button>
      </form>
    </div>
  </header>
```

- [ ] **Step 2: Add a CSS rule for hiding admin-only elements in user mode**

In the `<style>` block, add this rule after the existing `.series-back:hover` rule (before the closing `</style>` tag):
```css
    body.user-mode .admin-only{display:none!important}
```

- [ ] **Step 3: Mark admin-only elements with the `admin-only` class**

**a) Scan button** — find:
```html
        <button id="scan-btn" type="button" style="background:#1e40af;color:#fff;border:none;border-radius:4px;padding:.5rem 1rem;font-size:.875rem;cursor:pointer;font-family:inherit">Scan Library</button>
```
Replace with:
```html
        <button id="scan-btn" type="button" class="admin-only" style="background:#1e40af;color:#fff;border:none;border-radius:4px;padding:.5rem 1rem;font-size:.875rem;cursor:pointer;font-family:inherit">Scan Library</button>
```

**b) Users tab button** — find:
```html
    <button class="tab" data-tab="users">Users</button>
```
Replace with:
```html
    <button class="tab admin-only" data-tab="users">Users</button>
```

**c) Users section** — find:
```html
    <div id="users-section" style="display:none">
```
Replace with:
```html
    <div id="users-section" class="admin-only" style="display:none">
```

**d) Delete buttons in `renderStandaloneSection`** — find the delete button HTML inside `renderStandaloneSection` (the `li.innerHTML` string, within the `books.forEach` loop):
```javascript
            '<button class="delete-btn" type="button" title="Delete">🗑</button>' +
```
Replace with:
```javascript
            '<button class="delete-btn admin-only" type="button" title="Delete">🗑</button>' +
```

**e) Delete buttons in `showSeriesPage`** — find the delete button HTML inside `showSeriesPage` (within `books.forEach`):
```javascript
            '<button class="delete-btn" type="button" title="Delete">🗑</button>' +
```
Replace with:
```javascript
            '<button class="delete-btn admin-only" type="button" title="Delete">🗑</button>' +
```

- [ ] **Step 4: Add the `init` function and replace the bare `loadBooks()` call**

Find this line near the bottom of the `<script>` block (just before `// ── Scan`):
```javascript
    loadBooks();
```
Replace with:
```javascript
    let currentUser = { username: '', isAdmin: false };

    async function init() {
      try {
        const res = await fetch('/api/me');
        if (res.ok) currentUser = await res.json();
      } catch { /* keep defaults */ }

      document.getElementById('current-username').textContent = currentUser.username;

      if (!currentUser.isAdmin) {
        document.body.classList.add('user-mode');
      }

      await loadBooks();
    }

    init();
```

- [ ] **Step 5: Manual verification**

Start the server with a test user in the database. Log in as a regular user and confirm:
- Username appears in the header
- Users tab is not visible
- Scan button is not visible
- Delete buttons on books are not visible
- Upload still works

Log in as admin and confirm all features are visible and functional.

```bash
cd /Users/korzun/Code/HASS-ODPS && npm run build && node dist/index.js
```

- [ ] **Step 6: Commit**

```bash
cd /Users/korzun/Code/HASS-ODPS && git add app/public/index.html && git commit -m "feat: show username in header and hide admin-only UI for regular users"
```

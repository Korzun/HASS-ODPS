# Kebab-case File Naming & Co-located Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename PascalCase service files to kebab-case and move all tests from `tests/` into `app/` alongside the source files they test.

**Architecture:** Use `git mv` for all renames and moves to preserve git history. Fix import paths in source files first, then migrate test files with updated imports, and finally clean up config and the now-empty `tests/` directory.

**Tech Stack:** TypeScript, Jest, ts-jest, Node.js

---

## Files Modified

| File | Change |
|------|--------|
| `app/services/BookStore.ts` | Renamed to `app/services/book-store.ts` |
| `app/services/EpubParser.ts` | Renamed to `app/services/epub-parser.ts` |
| `app/services/UserStore.ts` | Renamed to `app/services/user-store.ts` |
| `app/services/book-store.ts` | Import of `EpubParser` → `epub-parser` |
| `app/middleware/auth.ts` | Import of `UserStore` → `user-store` |
| `app/app.ts` | Imports of `BookStore`, `UserStore` → kebab-case |
| `app/index.ts` | Imports of `UserStore`, `BookStore` → kebab-case |
| `app/routes/opds.ts` | Imports of `BookStore`, `UserStore` → kebab-case |
| `app/routes/kosync.ts` | Import of `UserStore` → `user-store` |
| `app/routes/ui.ts` | Imports of `BookStore`, `EpubParser` → kebab-case |
| `app/routes/users.ts` | Import of `UserStore` → `user-store` |
| `tsconfig.json` | Exclude `*.test.ts` from build output |
| `tests/BookStore.test.ts` | Moved to `app/services/book-store.test.ts`, imports updated |
| `tests/EpubParser.test.ts` | Moved to `app/services/epub-parser.test.ts`, imports updated |
| `tests/UserStore.test.ts` | Moved to `app/services/user-store.test.ts`, imports updated |
| `tests/kosync.test.ts` | Moved to `app/routes/kosync.test.ts`, imports updated |
| `tests/opds.test.ts` | Moved to `app/routes/opds.test.ts`, imports updated |
| `tests/ui.test.ts` | Moved to `app/routes/ui.test.ts`, imports updated |
| `tests/users.test.ts` | Moved to `app/routes/users.test.ts`, imports updated |
| `tests/logger.test.ts` | Moved to `app/logger.test.ts`, imports updated |
| `jest.config.js` | `roots` updated to `app/`, ts-jest override removed |
| `tests/` directory | Deleted after all files moved |

---

## Task 1: Rename service source files

**Files:**
- Rename: `app/services/BookStore.ts` → `app/services/book-store.ts`
- Rename: `app/services/EpubParser.ts` → `app/services/epub-parser.ts`
- Rename: `app/services/UserStore.ts` → `app/services/user-store.ts`
- Modify: `app/services/book-store.ts` (fix internal import)
- Modify: `tsconfig.json` (exclude test files from build)

- [ ] **Step 1: Rename the three service files with git mv**

```bash
git mv app/services/BookStore.ts app/services/book-store.ts
git mv app/services/EpubParser.ts app/services/epub-parser.ts
git mv app/services/UserStore.ts app/services/user-store.ts
```

- [ ] **Step 2: Fix the internal import inside book-store.ts**

In `app/services/book-store.ts`, line 5 currently reads:
```ts
import { parseEpub, partialMD5 } from './EpubParser';
```
Change to:
```ts
import { parseEpub, partialMD5 } from './epub-parser';
```

- [ ] **Step 3: Exclude test files from TypeScript build output**

In `tsconfig.json`, update `exclude` so test files don't get compiled to `dist/`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./app",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["app/**/*"],
  "exclude": ["node_modules", "dist", "app/**/*.test.ts"]
}
```

- [ ] **Step 4: Confirm only expected errors remain (stale imports in other files)**

Other source files still import `BookStore`, `UserStore` using the old path — those get fixed in Task 2. Run a type-check now to verify the renamed files themselves are clean and only the stale imports in other files show errors:

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: errors mentioning `Cannot find module './BookStore'` or similar in `auth.ts`, `app.ts`, `index.ts`, `routes/*.ts` — nothing inside `book-store.ts`, `epub-parser.ts`, or `user-store.ts` themselves.

- [ ] **Step 5: Commit**

```bash
git add app/services/book-store.ts app/services/epub-parser.ts app/services/user-store.ts tsconfig.json
git commit -m "refactor: rename service files to kebab-case"
```

---

## Task 2: Update import paths in source files

**Files:**
- Modify: `app/services/book-store.ts` *(already fixed in Task 1)*
- Modify: `app/middleware/auth.ts`
- Modify: `app/app.ts`
- Modify: `app/index.ts`
- Modify: `app/routes/opds.ts`
- Modify: `app/routes/kosync.ts`
- Modify: `app/routes/ui.ts`
- Modify: `app/routes/users.ts`

- [ ] **Step 1: Update app/middleware/auth.ts**

Line 3, change:
```ts
import { UserStore } from '../services/UserStore';
```
To:
```ts
import { UserStore } from '../services/user-store';
```

- [ ] **Step 2: Update app/app.ts**

Lines 4–5, change:
```ts
import { BookStore } from './services/BookStore';
import { UserStore } from './services/UserStore';
```
To:
```ts
import { BookStore } from './services/book-store';
import { UserStore } from './services/user-store';
```

- [ ] **Step 3: Update app/index.ts**

Lines 5–6, change:
```ts
import { UserStore } from './services/UserStore';
import { BookStore } from './services/BookStore';
```
To:
```ts
import { UserStore } from './services/user-store';
import { BookStore } from './services/book-store';
```

- [ ] **Step 4: Update app/routes/opds.ts**

Lines 3–4, change:
```ts
import { BookStore } from '../services/BookStore';
import { UserStore } from '../services/UserStore';
```
To:
```ts
import { BookStore } from '../services/book-store';
import { UserStore } from '../services/user-store';
```

- [ ] **Step 5: Update app/routes/kosync.ts**

Line 3, change:
```ts
import { UserStore } from '../services/UserStore';
```
To:
```ts
import { UserStore } from '../services/user-store';
```

- [ ] **Step 6: Update app/routes/ui.ts**

Lines 5 and 9, change:
```ts
import { BookStore } from '../services/BookStore';
```
To:
```ts
import { BookStore } from '../services/book-store';
```
And:
```ts
import { parseEpub, partialMD5 } from '../services/EpubParser';
```
To:
```ts
import { parseEpub, partialMD5 } from '../services/epub-parser';
```

- [ ] **Step 7: Update app/routes/users.ts**

Line 3, change:
```ts
import { UserStore } from '../services/UserStore';
```
To:
```ts
import { UserStore } from '../services/user-store';
```

- [ ] **Step 8: Verify TypeScript build passes**

```bash
npm run build
```

Expected: exits 0, no errors.

- [ ] **Step 9: Commit**

```bash
git add app/middleware/auth.ts app/app.ts app/index.ts app/routes/opds.ts app/routes/kosync.ts app/routes/ui.ts app/routes/users.ts
git commit -m "refactor: update import paths to use kebab-case service names"
```

---

## Task 3: Move service test files and update their imports

**Files:**
- Move: `tests/BookStore.test.ts` → `app/services/book-store.test.ts`
- Move: `tests/EpubParser.test.ts` → `app/services/epub-parser.test.ts`
- Move: `tests/UserStore.test.ts` → `app/services/user-store.test.ts`

- [ ] **Step 1: Move the three service test files**

```bash
git mv tests/BookStore.test.ts app/services/book-store.test.ts
git mv tests/EpubParser.test.ts app/services/epub-parser.test.ts
git mv tests/UserStore.test.ts app/services/user-store.test.ts
```

- [ ] **Step 2: Update imports in app/services/book-store.test.ts**

Find and replace these two imports (the file is now in `app/services/` — paths change accordingly):

```ts
// before
import { BookStore, ScanImporter } from '../app/services/BookStore';
import { EpubMeta } from '../app/types';
```
```ts
// after
import { BookStore, ScanImporter } from './book-store';
import { EpubMeta } from '../types';
```

- [ ] **Step 3: Update imports in app/services/epub-parser.test.ts**

```ts
// before
import { partialMD5, parseEpub } from '../app/services/EpubParser';
```
```ts
// after
import { partialMD5, parseEpub } from './epub-parser';
```

- [ ] **Step 4: Update imports in app/services/user-store.test.ts**

```ts
// before
import { UserStore } from '../app/services/UserStore';
```
```ts
// after
import { UserStore } from './user-store';
```

- [ ] **Step 5: Commit**

```bash
git add app/services/book-store.test.ts app/services/epub-parser.test.ts app/services/user-store.test.ts
git commit -m "refactor: move service tests alongside source files"
```

---

## Task 4: Move route and utility test files and update their imports

**Files:**
- Move: `tests/kosync.test.ts` → `app/routes/kosync.test.ts`
- Move: `tests/opds.test.ts` → `app/routes/opds.test.ts`
- Move: `tests/ui.test.ts` → `app/routes/ui.test.ts`
- Move: `tests/users.test.ts` → `app/routes/users.test.ts`
- Move: `tests/logger.test.ts` → `app/logger.test.ts`

- [ ] **Step 1: Move the five test files**

```bash
git mv tests/kosync.test.ts app/routes/kosync.test.ts
git mv tests/opds.test.ts app/routes/opds.test.ts
git mv tests/ui.test.ts app/routes/ui.test.ts
git mv tests/users.test.ts app/routes/users.test.ts
git mv tests/logger.test.ts app/logger.test.ts
```

- [ ] **Step 2: Update imports in app/routes/kosync.test.ts**

```ts
// before
import { UserStore } from '../app/services/UserStore';
import { createKosyncRouter } from '../app/routes/kosync';
```
```ts
// after
import { UserStore } from '../services/user-store';
import { createKosyncRouter } from './kosync';
```

- [ ] **Step 3: Update imports in app/routes/opds.test.ts**

```ts
// before
import { BookStore } from '../app/services/BookStore';
import { UserStore } from '../app/services/UserStore';
import { createOpdsRouter } from '../app/routes/opds';
import { EpubMeta } from '../app/types';
```
```ts
// after
import { BookStore } from '../services/book-store';
import { UserStore } from '../services/user-store';
import { createOpdsRouter } from './opds';
import { EpubMeta } from '../types';
```

- [ ] **Step 4: Update imports in app/routes/ui.test.ts**

```ts
// before
import { BookStore } from '../app/services/BookStore';
import { createUiRouter } from '../app/routes/ui';
import { AppConfig, EpubMeta } from '../app/types';
```
```ts
// after
import { BookStore } from '../services/book-store';
import { createUiRouter } from './ui';
import { AppConfig, EpubMeta } from '../types';
```

- [ ] **Step 5: Update imports in app/routes/users.test.ts**

```ts
// before
import { UserStore } from '../app/services/UserStore';
import { createUsersRouter } from '../app/routes/users';
```
```ts
// after
import { UserStore } from '../services/user-store';
import { createUsersRouter } from './users';
```

- [ ] **Step 6: Update imports in app/logger.test.ts**

```ts
// before
import { logger } from '../app/logger';
```
```ts
// after
import { logger } from './logger';
```

- [ ] **Step 7: Commit**

```bash
git add app/routes/kosync.test.ts app/routes/opds.test.ts app/routes/ui.test.ts app/routes/users.test.ts app/logger.test.ts
git commit -m "refactor: move route and utility tests alongside source files"
```

---

## Task 5: Update jest config, verify all tests pass, delete tests/

**Files:**
- Modify: `jest.config.js`
- Delete: `tests/` directory

- [ ] **Step 1: Update jest.config.js**

Replace the full file content with:

```js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/app'],
  testMatch: ['**/*.test.ts'],
};
```

(The ts-jest `globals` override of `rootDir: '.'` was only needed because tests were outside `app/`. It is no longer needed.)

- [ ] **Step 2: Run the full test suite**

```bash
npm test
```

Expected: all 8 test suites pass, 0 failures. If any tests fail, check that import paths in the failing test file were updated correctly (Task 3 or Task 4).

- [ ] **Step 3: Delete the now-empty tests/ directory**

```bash
git rm -r tests/
```

Expected: `tests/` directory is gone. (It should be empty at this point — if git rm reports files still present, a test file was missed in Tasks 3–4.)

- [ ] **Step 4: Run the full test suite once more to confirm clean state**

```bash
npm test
```

Expected: all 8 test suites pass, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add jest.config.js
git commit -m "refactor: update jest config and remove empty tests/ directory"
```

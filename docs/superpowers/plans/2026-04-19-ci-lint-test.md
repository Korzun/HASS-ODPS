# CI: Testing & Linting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add ESLint (TypeScript + Prettier via eslint-plugin-prettier), lint scripts, and a GitHub Actions CI workflow that runs lint and tests in parallel on PRs and pushes to `main`.

**Architecture:** Install ESLint with `typescript-eslint` and `eslint-plugin-prettier`, configure via ESLint 9 flat config, add `lint`/`lint:fix` scripts to `package.json`, then create a single CI workflow file with two independent parallel jobs. Branch protection (required checks) is a manual GitHub UI step at the end.

**Tech Stack:** ESLint 9 flat config, typescript-eslint, eslint-plugin-prettier, prettier, GitHub Actions

---

## Files

| Action | Path | Purpose |
|---|---|---|
| Create | `eslint.config.js` | ESLint flat config — TypeScript rules + Prettier enforcement |
| Create | `.prettierrc` | Prettier formatting preferences |
| Modify | `package.json` | Add `lint` and `lint:fix` scripts |
| Create | `.github/workflows/ci.yml` | Parallel lint + test CI jobs |

---

### Task 1: Install ESLint and Prettier devDependencies

**Files:**
- Modify: `package.json` (devDependencies section)
- Modify: `package-lock.json`

- [ ] **Step 1: Install packages**

```bash
npm install --save-dev eslint typescript-eslint eslint-config-prettier eslint-plugin-prettier prettier
```

Expected: packages appear in `devDependencies` in `package.json`, no errors.

- [ ] **Step 2: Verify tools are available**

```bash
npx eslint --version && npx prettier --version
```

Expected: two version strings printed (e.g. `9.x.x` then `3.x.x`).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install eslint, typescript-eslint, prettier"
```

---

### Task 2: Create Prettier config

**Files:**
- Create: `.prettierrc`

- [ ] **Step 1: Create `.prettierrc`**

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2
}
```

- [ ] **Step 2: Verify Prettier reads the config**

```bash
npx prettier --check app/index.ts
```

Expected: either `All matched files use Prettier code style!` or a list of files needing reformatting — but no configuration error.

- [ ] **Step 3: Commit**

```bash
git add .prettierrc
git commit -m "chore: add prettier config"
```

---

### Task 3: Create ESLint flat config

**Files:**
- Create: `eslint.config.js`

- [ ] **Step 1: Verify ESLint has no config yet**

```bash
npx eslint app/index.ts 2>&1 | head -5
```

Expected: error about no config file found — confirms we're starting fresh.

- [ ] **Step 2: Create `eslint.config.js`**

```js
// @ts-check
const tseslint = require('typescript-eslint');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = tseslint.config(
  { ignores: ['dist/**', 'node_modules/**'] },
  tseslint.configs.recommended,
  eslintPluginPrettierRecommended,
);
```

**What each piece does:**
- `tseslint.configs.recommended` — TypeScript-aware lint rules, applied to `**/*.ts` files only
- `eslintPluginPrettierRecommended` — runs Prettier as an ESLint rule (`prettier/prettier: error`) and disables any ESLint rules that conflict with Prettier formatting
- `ignores` — keeps ESLint out of build output and dependencies

- [ ] **Step 3: Verify config loads without errors**

```bash
npx eslint app/index.ts
```

Expected: either no output (no violations) or lint/prettier violation lines — but no "configuration error" or "cannot find module" messages.

- [ ] **Step 4: Commit**

```bash
git add eslint.config.js
git commit -m "chore: add eslint flat config with typescript-eslint and prettier"
```

---

### Task 4: Add lint scripts and fix all violations

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Verify the lint script is missing**

```bash
npm run lint 2>&1 | head -3
```

Expected: `missing script: lint`

- [ ] **Step 2: Add scripts to `package.json`**

Replace the existing `"scripts"` block with:

```json
"scripts": {
  "build": "tsc && node -e \"const fs=require('fs');if(fs.existsSync('app/public'))fs.cpSync('app/public','dist/public',{recursive:true})\"",
  "start": "node dist/index.js",
  "test": "jest",
  "test:watch": "jest --watch",
  "lint": "eslint . && tsc --noEmit",
  "lint:fix": "eslint . --fix"
}
```

**What the two scripts do:**
- `lint` — runs ESLint (style + Prettier checks) across the whole project, then runs the TypeScript compiler in type-check-only mode (no files emitted). Both must pass for CI to succeed.
- `lint:fix` — auto-fixes all ESLint and Prettier violations that can be fixed automatically. Run this locally before pushing.

- [ ] **Step 3: Auto-fix existing violations**

```bash
npm run lint:fix
```

Expected: ESLint rewrites files to fix formatting and auto-fixable rule violations.

- [ ] **Step 4: Run full lint and fix remaining issues manually**

```bash
npm run lint
```

If there are remaining errors (non-auto-fixable), fix each one manually. Common ones:
- `@typescript-eslint/no-explicit-any` — replace `any` with a specific type or `unknown`
- `@typescript-eslint/no-unused-vars` — remove or prefix unused vars with `_`

Re-run `npm run lint` after each fix until it exits with code 0.

- [ ] **Step 5: Verify tests still pass after any code changes**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: add lint scripts and fix all lint violations"
```

---

### Task 5: Create GitHub Actions CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4.2.2
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint

  test:
    name: Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4.2.2
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'
      - run: npm ci
      - run: npm test
```

**Key design notes:**
- No `needs:` between jobs — they run in parallel.
- `cache: 'npm'` caches `~/.npm` between runs using `package-lock.json` as the cache key.
- Job `name:` values (`Lint` and `Test`) are the strings GitHub uses for required status checks in branch protection.

- [ ] **Step 2: Validate YAML syntax**

```bash
yq '.' .github/workflows/ci.yml > /dev/null && echo "Valid YAML"
```

Expected: `Valid YAML`

- [ ] **Step 3: Commit and push**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add parallel lint and test workflow"
git push
```

---

### Task 6: Configure required branch protection (manual — GitHub UI)

> This cannot be done via files. It requires the workflow to have run at least once so that GitHub recognises the check names.

- [ ] **Step 1: Wait for the first CI run to complete**

After pushing, go to the repository on GitHub → **Actions** tab and confirm both `Lint` and `Test` jobs appear and complete (green or red — they just need to have run once).

- [ ] **Step 2: Add branch protection rule**

1. **Settings → Branches → Add branch protection rule**
2. Branch name pattern: `main`
3. Enable **"Require status checks to pass before merging"**
4. In the search box, add both:
   - `Lint`
   - `Test`
5. Enable **"Require branches to be up to date before merging"**
6. Click **Save changes**

Expected result: PRs targeting `main` will be blocked from merging until both `Lint` and `Test` checks pass.

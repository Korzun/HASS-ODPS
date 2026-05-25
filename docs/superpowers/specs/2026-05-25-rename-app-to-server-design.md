# Rename `app/` to `server/` and Restructure as npm Workspaces

**Date:** 2026-05-25

## Summary

Rename the backend source directory from `app/` to `server/`, restructure the project as an npm workspaces monorepo with `server/` and `client/` as the two workspaces, and dissolve the root-level config files (`tsconfig.json`, `jest.config.js`, `eslint.config.mjs`) into workspace-specific equivalents.

## Scope

### In scope
- Rename `app/` → `server/` via `git mv`
- Convert root `package.json` to a workspace root (orchestration only, no deps)
- Create `server/package.json` with all current root dependencies and server scripts
- Move `tsconfig.json` → `server/tsconfig.json`
- Move `jest.config.js` → `server/jest.config.js`
- Split root `eslint.config.mjs` into `server/eslint.config.mjs` and `client/eslint.config.mjs`
- Update `client/package.json` to add eslint/prettier and `eslint-plugin-react-hooks`
- Delete `client/package-lock.json` (replaced by single root lockfile)
- Update `Dockerfile`, `docker-compose.yml`, and `run.sh` for new paths

### Out of scope
- Historical spec/plan docs under `docs/superpowers/` — kept as frozen artifacts
- CI workflow files — no references to the source directory
- TypeScript imports inside `server/` — all relative, unaffected by rename

---

## Directory Layout After

```
/
├── package.json          ← workspace root (orchestration scripts, no deps)
├── package-lock.json     ← single lockfile for all workspaces
├── eslint.config.mjs     ← DELETED
├── tsconfig.json         ← DELETED
├── jest.config.js        ← DELETED
├── server/               ← renamed from app/
│   ├── package.json      ← NEW
│   ├── tsconfig.json     ← moved from root
│   ├── jest.config.js    ← moved from root
│   ├── eslint.config.mjs ← NEW (server rules from root)
│   └── ... (all existing .ts source files)
└── client/
    ├── package.json      ← gains eslint, prettier, eslint-plugin-react-hooks
    ├── package-lock.json ← DELETED (merged into root lockfile)
    ├── eslint.config.mjs ← NEW (client rules from root)
    └── ... (unchanged)
```

---

## File-by-File Changes

### Root `package.json`
Becomes a workspace root. No `dependencies` or `devDependencies`. Declares workspaces and orchestration scripts only:

```json
{
  "name": "hass-odps",
  "version": "1.1.1",
  "private": true,
  "workspaces": ["server", "client"],
  "scripts": {
    "build": "npm run build -w server && npm run build -w client",
    "start": "node server/dist/index.js",
    "dev": "npm run dev -w server",
    "dev:client": "npm run dev -w client",
    "test": "npm test -w server",
    "test:watch": "npm run test:watch -w server",
    "lint": "npm run lint -w server && npm run lint -w client",
    "lint:fix": "npm run lint:fix -w server && npm run lint:fix -w client"
  }
}
```

### `server/package.json` (new)
All current root `dependencies` (express, better-sqlite3, sharp, etc.). `devDependencies`: all current root devDeps **except** the following, which are only used by the client eslint config and move to `client/package.json`:
- `eslint-plugin-react-hooks`
- `eslint-plugin-import-x`
- `eslint-import-resolver-typescript`
- `@eslint/js`

Scripts:
- `build`: `tsc`
- `dev`: `nodemon --watch . --ext ts,json --exec 'ts-node --project tsconfig.json' index.ts`
- `test`: `jest`
- `test:watch`: `jest --watch`
- `lint`: `eslint .`
- `lint:fix`: `eslint . --fix`

### `server/tsconfig.json` (moved from root)
Two path changes from the root version:
- `"rootDir": "."` (was `"./app"`)
- `"outDir": "./dist"` (resolves to `server/dist/`)
- `"include": ["./**/*"]` (was `"app/**/*"`)
- `"exclude"`: remove `app/**/*.test.ts` prefix → `"**/*.test.ts"`

`import packageJson from '../package.json'` in `server/index.ts` continues to resolve to the root `package.json` — no change needed.

### `server/jest.config.js` (moved from root)
One change:
- `roots: ['<rootDir>']` (was `['<rootDir>/app']`)

### `server/eslint.config.mjs` (new)
Extracted from the server section of the current root `eslint.config.mjs`. Key differences from root:
- `files: ["**/*.ts"]` (was `"app/**/*.ts"`)
- `ignores: ["dist/**", "node_modules/**"]`
- Plugins: `typescript-eslint`, `eslint-plugin-prettier`
- No `import-x` (not used in the current server section)

### `client/eslint.config.mjs` (new)
Extracted from the client section of the current root `eslint.config.mjs`. Key differences from root:
- `files: ["src/**/*.{ts,tsx}"]` (was `"client/src/**/*.{ts,tsx}"`)
- `settings["import-x/resolver"].typescript.project`: `"./tsconfig.json"` (was `"./client/tsconfig.json"`)
- `ignores: ["dist/**", "node_modules/**"]`
- Client currently has no eslint config — this is a new file.

### `client/package.json` (updated)
Adds to `devDependencies`: `@eslint/js`, `eslint`, `eslint-config-prettier`, `eslint-plugin-import-x`, `eslint-import-resolver-typescript`, `eslint-plugin-prettier`, `eslint-plugin-react-hooks`, `prettier`, `typescript-eslint`. Adds `lint` and `lint:fix` scripts targeting `eslint .`.

### `client/package-lock.json`
Deleted. npm workspaces produces a single root `package-lock.json` covering all workspaces.

### `Dockerfile`
Install stage — copy all three `package*.json` sets before `npm ci`:
```dockerfile
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/
RUN npm ci
```
Build stage — `COPY server/ ./server/` (was `app/`).

Production stage — copy all `package*.json` sets, `npm ci --omit=dev`, then:
```dockerfile
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist
```

`WORKDIR /app` is unchanged — it is the container's working directory, not a reference to the source folder.

### `docker-compose.yml`
Volume mount: `./server:/app/server` (was `./app:/app/app`).

### `run.sh`
Entry point: `node server/dist/index.js` (was `node dist/index.js`).

---

## What Does NOT Change

- `WORKDIR /app` in Dockerfiles — container working directory, unrelated to source folder name
- All TypeScript imports inside `server/` — all relative paths
- CI workflow files — no references to the source directory
- `Dockerfile.dev` — references `WORKDIR /app` only (no source path references)
- `Makefile` — no references to the source directory

---

## Verification

After all changes, regenerate the root lockfile (`npm install`) and run:
```
npm run lint
npm test
npm run build
```

# HASS-ODPS Design Spec

**Date:** 2026-04-16  
**Status:** Approved

## Overview

A Home Assistant Add-On that runs a TypeScript/Express server providing:
- An **OPDS 1.2 catalog** so KoReader can browse and download books
- A **KOSync API** so KoReader can sync reading progress
- A **web UI** for managing the book library (upload, browse, delete)

The add-on runs as a background service (no HA sidebar entry). Users access the web UI directly via `http://homeassistant.local:3000`.

---

## Architecture

Single Express process on port 3000. Layered module structure with strict separation between routes, services, and middleware.

```
app/
├── index.ts                  # Express app setup, mounts all routers
├── routes/
│   ├── opds.ts               # OPDS catalog endpoints
│   ├── kosync.ts             # KOSync progress sync endpoints
│   └── ui.ts                 # Web UI + file upload endpoints
├── services/
│   ├── BookStore.ts          # Book file discovery and serving
│   └── UserStore.ts          # User accounts and reading progress (SQLite)
└── middleware/
    └── auth.ts               # Basic Auth (OPDS/KOSync) + Session Auth (UI)
```

**Storage:**
- `/media/books/` — book files (volume-mounted from HA host)
- `/data/db.sqlite` — users table, reading progress table
- `/data/options.json` — HA add-on config (admin credentials)

---

## OPDS Catalog

**Protocol:** OPDS 1.2 (Atom XML feeds)  
**Base path:** `/opds/`  
**Auth:** HTTP Basic on all routes

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/opds/` | Root navigation feed |
| GET | `/opds/books` | Acquisition feed — lists all books with download links |
| GET | `/opds/books/:id/download` | Serves the book file |

### Book Discovery

`BookStore` scans `/media/books/` for files with supported extensions: `.epub`, `.pdf`, `.mobi`, `.cbz`, `.cbr`. Metadata (title, author, size, MIME type) is derived from filenames and file stats. No separate metadata database — the feed is generated on demand from the filesystem.

Book IDs are stable hashes of the relative file path.

---

## KOSync API

**Protocol:** [KOSync open-source spec](https://github.com/koreader/koreader-sync-server)  
**Base path:** `/kosync/`  
**Auth:** HTTP Basic on all routes

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/kosync/users/create` | Register a new user (username + password in query params per spec) |
| GET | `/kosync/users/auth` | Verify credentials |
| PUT | `/kosync/syncs/progress` | Save reading progress for a document |
| GET | `/kosync/syncs/progress/:document` | Retrieve progress for a document |

### Progress Storage

SQLite table: `progress(username TEXT, document TEXT, progress TEXT, percentage REAL, device TEXT, device_id TEXT, timestamp INTEGER)`. Keyed by `(username, document)` — upsert on each PUT.

---

## Web UI

**Base path:** `/`  
**Auth:** Session-based (express-session + cookie). Login page at `/login`. All other routes redirect to `/login` if unauthenticated.

### Layout — Single Page

```
┌─────────────────────────────────────┐
│  📚 HASS-ODPS Library               │
├─────────────────────────────────────┤
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  │
│    ⬆️  Drop books here or click     │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘  │
│                                     │
│  Book Title · Author · EPUB · 2MB 🗑 │
│  Another Book · Author · PDF · 6MB 🗑│
│  ...                                │
└─────────────────────────────────────┘
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Serves the single-page library UI |
| GET | `/login` | Login form |
| POST | `/login` | Authenticate, set session cookie |
| POST | `/logout` | Destroy session |
| GET | `/api/books` | JSON list of all books |
| POST | `/api/books/upload` | Multipart file upload (one or more files) |
| DELETE | `/api/books/:id` | Delete a book file |

---

## Authentication

### Admin Credentials

A single admin username and password are set in the HA add-on config (`/data/options.json`). These same credentials are used for:
- Web UI login (session auth)
- OPDS HTTP Basic Auth
- KOSync admin account (auto-created on startup)

KOSync users can self-register via `GET /kosync/users/create` with any username/password — these are stored in SQLite and are separate from the admin account.

### Middleware

- `basicAuth` middleware applied to all `/opds/*` and `/kosync/*` routes — validates against admin credentials (for OPDS) or SQLite users table (for KOSync)
- `sessionAuth` middleware applied to all `/api/*` and `/` routes — redirects to `/login` if no valid session

---

## Home Assistant Add-On Packaging

```
hass-odps/
├── config.yaml          # Add-on manifest
├── Dockerfile           # Node 24 Alpine
├── run.sh               # Reads /data/options.json, exec node dist/index.js
└── app/                 # TypeScript source
```

### config.yaml (key fields)

```yaml
name: "HASS-ODPS Book Server"
version: "1.0.0"
slug: hass-odps
ports:
  3000/tcp: 3000
map:
  - media:rw
  - data:rw
options:
  username: admin
  password: changeme
schema:
  username: str
  password: str
```

### Dockerfile

Base image: `node:24-alpine`. Build step compiles TypeScript; production image copies `dist/` only. `better-sqlite3` is compiled at build time (native module).

---

## Error Handling

- OPDS and KOSync return appropriate HTTP status codes per their specs (401 for auth failures, 404 for missing documents, 409 for duplicate users)
- Web UI shows inline error messages for upload failures (unsupported format, file too large)
- Unhandled errors caught by Express error middleware — logged to stdout (visible in HA add-on logs), 500 returned to client

---

## Testing

- Unit tests for `BookStore` (file discovery, metadata extraction) and `UserStore` (CRUD, progress upsert)
- Integration tests for OPDS feed shape (valid Atom XML) and KOSync endpoint contracts
- No E2E browser tests — web UI is simple enough to verify manually

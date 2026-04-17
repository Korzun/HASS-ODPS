# HASS-ODPS Logging Design Spec

**Date:** 2026-04-17  
**Status:** Approved

## Overview

Add structured, level-aware business-event logging to the HASS-ODPS add-on so users can observe what the server is doing from the Home Assistant add-on log tab. Logging targets stdout (HA captures this automatically). No external logging libraries — a thin internal module only.

---

## Logger Module

**File:** `app/logger.ts`

A `logger(namespace: string)` factory returns a bound object `{ debug, info, warn, error }`. Each method prepends a timestamp and the namespace to the message before writing to stdout/stderr.

### Log Levels

Four levels in ascending severity: `debug < info < warn < error`.

`LOG_LEVEL` environment variable sets the minimum level to emit (case-insensitive). Default: `info`. Messages below the threshold are silent no-ops.

Valid values: `debug`, `info`, `warn`, `error`.

### Output Format

```
[<ISO8601 timestamp>] <LEVEL padded to 5 chars>  [<NAMESPACE>] <message>
```

Examples:
```
[2026-04-17T10:23:01Z] INFO  [OPDS] User "admin" downloaded "Dune.epub"
[2026-04-17T10:23:05Z] WARN  [Auth] Basic auth failed for user "bob"
[2026-04-17T10:24:00Z] DEBUG [KOSync] Progress retrieved for "admin" — "dune.epub"
```

- `info` and below → `process.stdout`
- `warn` and `error` → `process.stderr`

### Usage Pattern

```typescript
import { logger } from '../logger';
const log = logger('OPDS');
log.info('User "admin" downloaded "Dune.epub"');
log.warn('Download requested for unknown book ID: abc123');
```

---

## AppConfig Extension

Add `logLevel: string` to the `AppConfig` interface and populate it from `LOG_LEVEL` env var (default `'info'`) in `loadConfig()`. The logger module reads this env var directly at startup (not passed per-call).

---

## Business Events

### `app/index.ts` — namespace `Server`

| Level | Event |
|-------|-------|
| info | `HASS-ODPS starting on port <N> — booksDir: <path>, dataDir: <path>` |
| info | `Admin KOSync user "<username>" ensured` |

### `app/config.ts` — namespace `Config`

| Level | Event |
|-------|-------|
| warn | `Could not parse options.json, using defaults` |

### `app/middleware/auth.ts` — namespace `Auth`

| Level | Event |
|-------|-------|
| warn | `Basic auth failed for user "<username>"` |
| warn | `Basic auth failed — missing or malformed Authorization header` |
| warn | `KOSync auth failed for user "<username>"` |
| warn | `KOSync auth failed — missing headers` |
| debug | `Session auth rejected — redirecting to /login` |

### `app/routes/kosync.ts` — namespace `KOSync`

| Level | Event |
|-------|-------|
| info | `User "<username>" registered` |
| warn | `Registration rejected — username "<username>" already exists` |
| warn | `Registration rejected — missing username or password` |
| info | `Progress saved for "<username>" — "<document>" at <percentage>%` |
| debug | `Progress retrieved for "<username>" — "<document>"` |
| warn | `Progress not found for "<username>" — "<document>"` |

### `app/routes/opds.ts` — namespace `OPDS`

| Level | Event |
|-------|-------|
| debug | `Root catalog served` |
| debug | `Books feed served (<N> books)` |
| info | `User "<username>" downloaded "<filename>"` |
| warn | `Download requested for unknown book ID: <id>` |

### `app/routes/ui.ts` — namespace `UI`

| Level | Event |
|-------|-------|
| info | `User "<username>" logged in` |
| warn | `Login failed for username "<username>"` |
| info | `User logged out` |
| info | `Books uploaded: <filename1>, <filename2>, ...` |
| warn | `Upload rejected — no valid files (supported: epub, pdf, mobi, cbz, cbr)` |
| info | `Book deleted: "<filename>"` |
| warn | `Delete attempted for unknown book ID: <id>` |

---

## Files Changed

| File | Change |
|------|--------|
| `app/logger.ts` | New — logger factory |
| `app/types.ts` | Add `logLevel: string` to `AppConfig` |
| `app/config.ts` | Populate `logLevel` from `LOG_LEVEL` env var; use logger for warn |
| `app/index.ts` | Use logger for startup messages |
| `app/middleware/auth.ts` | Use logger for auth failures |
| `app/routes/kosync.ts` | Use logger for all business events |
| `app/routes/opds.ts` | Use logger for all business events |
| `app/routes/ui.ts` | Use logger for all business events |

---

## Testing

- Unit tests for `logger.ts`: verify level filtering (messages below threshold are not written), format (timestamp + namespace in output), and that `warn`/`error` go to stderr.
- No new integration tests required for the routes — existing tests cover behaviour; logging is a side effect that doesn't affect responses.

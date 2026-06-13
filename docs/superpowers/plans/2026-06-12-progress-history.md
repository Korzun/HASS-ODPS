# Progress History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record every KOSync progress sync as a time-series "dwell event" in a new `progress_history` table, grouping same-position/same-device syncs within 10 minutes into a single row with start and end timestamps.

**Architecture:** A new `ProgressHistory` Prisma model is added alongside the existing `Progress` model. `UserStore.saveProgress` is extended with a non-fatal history write: it looks for an open dwell row matching `(userId, document, progress, deviceId)` within the last 600 seconds and extends its `endTimestamp`, or inserts a new row. The existing `progress` table and all KOSync protocol endpoints are untouched.

**Tech Stack:** SQLite via Prisma ORM + better-sqlite3 adapter, TypeScript, Jest (real SQLite in tests — no mocks).

---

## File Map

| File | Change |
|---|---|
| `app/server/prisma/schema.prisma` | Add `ProgressHistory` model; add `progressHistories` relation to `User` |
| `app/server/prisma/migrations/<ts>_add_progress_history/migration.sql` | Prisma-generated DDL |
| `app/server/services/user-store.ts` | Extend `saveProgress` with history upsert wrapped in try/catch |
| `app/server/services/user-store.test.ts` | New `describe` block: 8 history scenarios including error path |
| `app/server/routes/kosync.test.ts` | New `describe` block: 2 end-to-end history assertions |

---

### Task 1: Add ProgressHistory to schema and generate migration

**Files:**
- Modify: `app/server/prisma/schema.prisma`
- Create: `app/server/prisma/migrations/<timestamp>_add_progress_history/migration.sql` (Prisma-generated)

- [ ] **Step 1: Add the relation to the User model in schema.prisma**

Open `app/server/prisma/schema.prisma`. Find the `User` model and add one line — `progressHistories ProgressHistory[]`:

```prisma
model User {
  id                 String            @id
  username           String            @unique
  passwordHash       String?           @map("password_hash")
  syncPassword       String?           @map("sync_password")
  mustChangePassword Boolean           @default(false) @map("must_change_password")
  progresses         Progress[]
  progressHistories  ProgressHistory[]
  refreshTokens      RefreshToken[]
  books              Book[]

  @@map("users")
}
```

- [ ] **Step 2: Add the ProgressHistory model at the end of schema.prisma**

Append after the `Setting` model:

```prisma
model ProgressHistory {
  id             Int    @id @default(autoincrement())
  userId         String @map("user_id")
  document       String
  progress       String
  percentage     Float
  device         String
  deviceId       String @map("device_id")
  startTimestamp Int    @map("start_timestamp")
  endTimestamp   Int    @map("end_timestamp")
  user           User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, document])
  @@map("progress_history")
}
```

- [ ] **Step 3: Generate the migration and regenerate the Prisma client**

Run from `app/server/`:
```bash
npx prisma migrate dev --name add_progress_history
```

Expected output includes:
```
migrations/
  └─ <timestamp>_add_progress_history/
    └─ migration.sql

Your database is now in sync with your schema.
Generated Prisma Client
```

- [ ] **Step 4: Verify the migration SQL was created**

```bash
cat app/server/prisma/migrations/*add_progress_history/migration.sql
```

Expected to contain both `CREATE TABLE "progress_history"` and `CREATE INDEX "progress_history_user_id_document_idx"`.

- [ ] **Step 5: Run existing tests to verify no regressions**

```bash
cd app/server && npm test
```

Expected: all pre-existing tests pass.

- [ ] **Step 6: Run lint**

From the project root:
```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add app/server/prisma/schema.prisma app/server/prisma/migrations/
git commit -m "feat: add ProgressHistory schema and migration"
```

---

### Task 2: History write in UserStore.saveProgress — unit tests (TDD)

**Files:**
- Modify: `app/server/services/user-store.test.ts`
- Modify: `app/server/services/user-store.ts`

- [ ] **Step 1: Write all 8 failing history tests**

Add a new `describe` block at the very end of `app/server/services/user-store.test.ts`:

```typescript
describe('UserStore.saveProgress — history', () => {
  let aliceId: string;

  beforeEach(async () => {
    await store.createUser('alice', null);
    aliceId = (await store.getUserIdByUsername('alice'))!;
  });

  it('inserts a new history row with matching start and end timestamps on first sync', async () => {
    await store.saveProgress(aliceId, {
      document: 'doc1',
      progress: '/body/DocFragment[5]',
      percentage: 0.42,
      device: 'Kobo',
      device_id: 'dev-1',
      timestamp: 1000,
    });
    const rows = await prisma.progressHistory.findMany({ where: { userId: aliceId } });
    expect(rows).toHaveLength(1);
    expect(rows[0].startTimestamp).toBe(1000);
    expect(rows[0].endTimestamp).toBe(1000);
  });

  it('extends endTimestamp when same position + device syncs within 10 minutes', async () => {
    await store.saveProgress(aliceId, {
      document: 'doc1',
      progress: '/body/DocFragment[5]',
      percentage: 0.42,
      device: 'Kobo',
      device_id: 'dev-1',
      timestamp: 1000,
    });
    await store.saveProgress(aliceId, {
      document: 'doc1',
      progress: '/body/DocFragment[5]',
      percentage: 0.42,
      device: 'Kobo',
      device_id: 'dev-1',
      timestamp: 1599, // 599 s later — within 10 min
    });
    const rows = await prisma.progressHistory.findMany({ where: { userId: aliceId } });
    expect(rows).toHaveLength(1);
    expect(rows[0].startTimestamp).toBe(1000);
    expect(rows[0].endTimestamp).toBe(1599);
  });

  it('inserts a new row when same position + device syncs after 10 minutes', async () => {
    await store.saveProgress(aliceId, {
      document: 'doc1',
      progress: '/body/DocFragment[5]',
      percentage: 0.42,
      device: 'Kobo',
      device_id: 'dev-1',
      timestamp: 1000,
    });
    await store.saveProgress(aliceId, {
      document: 'doc1',
      progress: '/body/DocFragment[5]',
      percentage: 0.42,
      device: 'Kobo',
      device_id: 'dev-1',
      timestamp: 1601, // 601 s later — past 10 min
    });
    const rows = await prisma.progressHistory.findMany({
      where: { userId: aliceId },
      orderBy: { startTimestamp: 'asc' },
    });
    expect(rows).toHaveLength(2);
    expect(rows[0].endTimestamp).toBe(1000);
    expect(rows[1].startTimestamp).toBe(1601);
    expect(rows[1].endTimestamp).toBe(1601);
  });

  it('inserts a new row when position changes', async () => {
    await store.saveProgress(aliceId, {
      document: 'doc1',
      progress: '/body/DocFragment[5]',
      percentage: 0.42,
      device: 'Kobo',
      device_id: 'dev-1',
      timestamp: 1000,
    });
    await store.saveProgress(aliceId, {
      document: 'doc1',
      progress: '/body/DocFragment[6]',
      percentage: 0.45,
      device: 'Kobo',
      device_id: 'dev-1',
      timestamp: 1100,
    });
    const rows = await prisma.progressHistory.findMany({
      where: { userId: aliceId },
      orderBy: { startTimestamp: 'asc' },
    });
    expect(rows).toHaveLength(2);
    expect(rows[0].progress).toBe('/body/DocFragment[5]');
    expect(rows[1].progress).toBe('/body/DocFragment[6]');
  });

  it('inserts a new row when same position is synced from a different device', async () => {
    await store.saveProgress(aliceId, {
      document: 'doc1',
      progress: '/body/DocFragment[5]',
      percentage: 0.42,
      device: 'Kobo',
      device_id: 'dev-1',
      timestamp: 1000,
    });
    await store.saveProgress(aliceId, {
      document: 'doc1',
      progress: '/body/DocFragment[5]',
      percentage: 0.42,
      device: 'Kindle',
      device_id: 'dev-2',
      timestamp: 1100,
    });
    const rows = await prisma.progressHistory.findMany({ where: { userId: aliceId } });
    expect(rows).toHaveLength(2);
  });

  it('does not delete history when clearProgress is called', async () => {
    await store.saveProgress(aliceId, {
      document: 'doc1',
      progress: '/body/DocFragment[5]',
      percentage: 0.42,
      device: 'Kobo',
      device_id: 'dev-1',
      timestamp: 1000,
    });
    await store.clearProgress(aliceId, 'doc1');
    const rows = await prisma.progressHistory.findMany({ where: { userId: aliceId } });
    expect(rows).toHaveLength(1);
  });

  it('cascades to delete history when user is deleted', async () => {
    await store.saveProgress(aliceId, {
      document: 'doc1',
      progress: '/body/DocFragment[5]',
      percentage: 0.42,
      device: 'Kobo',
      device_id: 'dev-1',
      timestamp: 1000,
    });
    await store.deleteUser('alice');
    const rows = await prisma.progressHistory.findMany({ where: { userId: aliceId } });
    expect(rows).toHaveLength(0);
  });

  it('does not throw and still saves current progress when history write fails', async () => {
    jest
      .spyOn(prisma.progressHistory, 'findFirst')
      .mockRejectedValueOnce(new Error('simulated DB failure'));

    const result = await store.saveProgress(aliceId, {
      document: 'doc1',
      progress: '/body/DocFragment[5]',
      percentage: 0.42,
      device: 'Kobo',
      device_id: 'dev-1',
      timestamp: 1000,
    });

    expect(result.percentage).toBeCloseTo(0.42);
    const current = await store.getProgress(aliceId, 'doc1');
    expect(current).not.toBeNull();
    expect(current!.percentage).toBeCloseTo(0.42);
  });
});
```

- [ ] **Step 2: Run the new tests to confirm they fail**

```bash
cd app/server && npm test -- --testPathPattern=user-store --verbose
```

Expected: 8 failures in `UserStore.saveProgress — history` (the history logic doesn't exist yet).

- [ ] **Step 3: Implement the history write in saveProgress**

Replace the `saveProgress` method in `app/server/services/user-store.ts` with this version. The progress upsert is unchanged; the history block is added after it, wrapped in try/catch:

```typescript
async saveProgress(
  userId: string,
  p: Omit<Progress, 'timestamp'> & { timestamp?: number }
): Promise<Progress> {
  const timestamp = p.timestamp ?? Math.floor(Date.now() / 1000);
  await this.prisma.progress.upsert({
    where: { userId_document: { userId, document: p.document } },
    create: {
      userId,
      document: p.document,
      progress: p.progress,
      percentage: p.percentage,
      device: p.device,
      deviceId: p.device_id,
      timestamp,
    },
    update: {
      progress: p.progress,
      percentage: p.percentage,
      device: p.device,
      deviceId: p.device_id,
      timestamp,
    },
  });
  try {
    const recent = await this.prisma.progressHistory.findFirst({
      where: { userId, document: p.document, progress: p.progress, deviceId: p.device_id },
      orderBy: { endTimestamp: 'desc' },
    });
    if (recent && timestamp - recent.endTimestamp <= 600) {
      await this.prisma.progressHistory.update({
        where: { id: recent.id },
        data: { endTimestamp: timestamp },
      });
    } else {
      await this.prisma.progressHistory.create({
        data: {
          userId,
          document: p.document,
          progress: p.progress,
          percentage: p.percentage,
          device: p.device,
          deviceId: p.device_id,
          startTimestamp: timestamp,
          endTimestamp: timestamp,
        },
      });
    }
  } catch (err) {
    log.warn(`Progress history write failed for user ${userId}: ${String(err)}`);
  }
  return { ...p, timestamp };
}
```

- [ ] **Step 4: Run all user-store tests to confirm they pass**

```bash
cd app/server && npm test -- --testPathPattern=user-store --verbose
```

Expected: all tests pass, including all 8 new history tests.

- [ ] **Step 5: Run lint**

From the project root:
```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/server/services/user-store.ts app/server/services/user-store.test.ts
git commit -m "feat: record progress history on every sync with 10-minute dwell grouping"
```

---

### Task 3: Integration tests in kosync.test.ts

**Files:**
- Modify: `app/server/routes/kosync.test.ts`

These tests verify history is written through the full HTTP → route → store path. No new implementation is required — the implementation is already in `saveProgress`.

- [ ] **Step 1: Add the history integration describe block**

Add this at the very end of `app/server/routes/kosync.test.ts`:

```typescript
describe('PUT /kosync/syncs/progress — history', () => {
  beforeEach(async () => {
    await userStore.createUser('alice', null, ALICE_SYNC_PASSWORD);
  });

  it('creates a history row on first sync', async () => {
    await request(app)
      .put('/kosync/syncs/progress')
      .set(authHeaders('alice', ALICE_SYNC_PASSWORD))
      .send({
        document: 'docHash123',
        progress: '/body/DocFragment[5]',
        percentage: 0.42,
        device: 'Kobo',
        device_id: 'dev-1',
      });

    const alice = await prisma.user.findUnique({ where: { username: 'alice' } });
    const rows = await prisma.progressHistory.findMany({ where: { userId: alice!.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0].progress).toBe('/body/DocFragment[5]');
    expect(rows[0].startTimestamp).toBe(rows[0].endTimestamp);
  });

  it('collapses two immediate syncs of the same position into one dwell row', async () => {
    const body = {
      document: 'docHash123',
      progress: '/body/DocFragment[5]',
      percentage: 0.42,
      device: 'Kobo',
      device_id: 'dev-1',
    };
    await request(app)
      .put('/kosync/syncs/progress')
      .set(authHeaders('alice', ALICE_SYNC_PASSWORD))
      .send(body);
    await request(app)
      .put('/kosync/syncs/progress')
      .set(authHeaders('alice', ALICE_SYNC_PASSWORD))
      .send(body);

    const alice = await prisma.user.findUnique({ where: { username: 'alice' } });
    const rows = await prisma.progressHistory.findMany({ where: { userId: alice!.id } });
    expect(rows).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run the kosync tests to confirm they pass**

```bash
cd app/server && npm test -- --testPathPattern=kosync --verbose
```

Expected: all tests pass including the 2 new history tests.

- [ ] **Step 3: Run lint**

From the project root:
```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/server/routes/kosync.test.ts
git commit -m "test: add integration tests for progress history via KOSync endpoint"
```

---

### Task 4: Full test suite verification

**Files:** none

- [ ] **Step 1: Run the full test suite**

```bash
cd app/server && npm test
```

Expected: all tests pass with no failures.

- [ ] **Step 2: Run lint**

From the project root:
```bash
npm run lint
```

Expected: no errors or warnings.

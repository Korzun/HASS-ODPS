# User-Linkable Orphaned Synced Progress Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a regular user link their own orphaned synced reading progress to a book from their own progress view, just as an admin can from the Users page.

**Architecture:** Frontend-only. The backend route (`POST /api/books/:id/link`) and the three link hooks (`useLinkProgress`, `useUserBookList`, and the shared username-keyed progress store) already support a non-admin acting on their own library. This plan surfaces that in the UI: it adds a Link button + orphan hint to `MyProgressRow`, and improves the shared title display (prefer the sort title, truncate with ellipsis) on both the user and admin progress rows.

**Tech Stack:** React, TypeScript, JSS (`createUseStyles`), Vitest + Testing Library.

## Global Constraints

- React component files are kebab-case (already satisfied; no new files).
- Do not add eslint-disable suppressions; keep react-hooks rules at error.
- Lint must be run from the repo root (`npm run lint`) — two workspaces.
- `Button` (from `~/control`) renders a `<div>`, not a `<button>` — query it in tests by text (`screen.getByText('Link')`), not by role.
- Icons take `width`/`height` (default fill `currentColor`) and a `className` — color them via CSS `color`, not a `size` prop.
- Display rule for a progress row's title, used verbatim in both rows:
  `book ? book.titleSort || book.title : progress.document`

---

## Task 1: Admin progress row — prefer sort title + truncate

Bring the shared title display up to spec on the admin row: show the calibre sort
title when present (front-loads meaningful words so ellipsis keeps them), and
truncate long titles / raw fingerprint ids with an ellipsis on narrow viewports.

**Files:**
- Modify: `app/client/src/component/user-progress-row/index.tsx:54`
- Modify: `app/client/src/component/user-progress-row/style.ts:21-24`
- Test: `app/client/src/component/user-progress-row/index.test.tsx`

**Interfaces:**
- Consumes: `Book.titleSort: string` and `Book.title: string` (from `~/provider/book`), `progress.document: string`.
- Produces: no new exported symbols; `UserProgressRow` keeps its `{ bookId, username }` props.

- [ ] **Step 1: Write the failing tests**

Append this block to `app/client/src/component/user-progress-row/index.test.tsx` (the file already imports `screen`, `useIsAdmin`, `useBook`, `type Book`, `useUserProgress`, `useDeleteUserProgress`, `renderWithProviders`, `UserProgressRow`, and stubs `LinkProgressModal`):

```tsx
describe('UserProgressRow — title display', () => {
  afterEach(() => vi.clearAllMocks());

  const setupWithBook = (book: Book) => {
    vi.mocked(useIsAdmin).mockReturnValue([false, false] as ReturnType<typeof useIsAdmin>);
    vi.mocked(useBook).mockReturnValue([book, false, false, undefined] as ReturnType<
      typeof useBook
    >);
    vi.mocked(useUserProgress).mockReturnValue([
      { document: book.id, percentage: 0.5, device: 'Kobo', timestamp: 1000 },
      false,
      false,
      undefined,
    ] as ReturnType<typeof useUserProgress>);
    vi.mocked(useDeleteUserProgress).mockReturnValue([
      vi.fn<(bookId: string) => Promise<boolean>>().mockResolvedValue(true),
      false,
      false,
      undefined,
    ] as unknown as ReturnType<typeof useDeleteUserProgress>);
  };

  it('prefers titleSort over title', () => {
    setupWithBook({
      id: 'book-1',
      title: 'The Great Gatsby',
      titleSort: 'Great Gatsby, The',
    } as unknown as Book);
    renderWithProviders(<UserProgressRow bookId="book-1" username="alice" />);
    expect(screen.getByText('Great Gatsby, The')).toBeDefined();
    expect(screen.queryByText('The Great Gatsby')).toBeNull();
  });

  it('falls back to title when titleSort is empty', () => {
    setupWithBook({ id: 'book-1', title: 'Foundation', titleSort: '' } as unknown as Book);
    renderWithProviders(<UserProgressRow bookId="book-1" username="alice" />);
    expect(screen.getByText('Foundation')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd app/client && npx vitest run src/component/user-progress-row/index.test.tsx`
Expected: FAIL — "prefers titleSort over title" fails because the current code renders `book.title` ("The Great Gatsby"), so `getByText('Great Gatsby, The')` throws.

- [ ] **Step 3: Update the title expression**

In `app/client/src/component/user-progress-row/index.tsx`, change line 54 from:

```tsx
  const bookTitle = book?.title ?? progress.document;
```

to:

```tsx
  const bookTitle = book ? book.titleSort || book.title : progress.document;
```

- [ ] **Step 4: Add truncation styles**

In `app/client/src/component/user-progress-row/style.ts`, replace the `book` rule:

```ts
  book: {
    fontSize: theme.fontSize.md,
    flexGrow: 1,
  },
```

with:

```ts
  book: {
    fontSize: theme.fontSize.md,
    flexGrow: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
```

(`minWidth: 0` is required — flex children default to `min-width: auto` and won't shrink below their content width, so ellipsis never engages without it.)

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd app/client && npx vitest run src/component/user-progress-row/index.test.tsx`
Expected: PASS (all describes, including the pre-existing Link-visibility and Clear tests).

- [ ] **Step 6: Commit**

```bash
git add app/client/src/component/user-progress-row/index.tsx app/client/src/component/user-progress-row/style.ts app/client/src/component/user-progress-row/index.test.tsx
git commit -m "feat(progress): prefer sort title and truncate in admin progress row"
```

---

## Task 2: User progress row — sort title, truncation, orphan hint + Link

Give `MyProgressRow` the same title treatment as Task 1, plus the new capability:
an orphan hint (alert icon + muted title) and a Link button on unresolved rows that
opens the existing `LinkProgressModal` scoped to the current user. The modal, its
book-list fetch, and the optimistic row removal already work for non-admins — this
task only wires the UI.

**Files:**
- Modify: `app/client/src/component/my-progress-row/index.tsx`
- Modify: `app/client/src/component/my-progress-row/style.ts`
- Test: `app/client/src/component/my-progress-row/index.test.tsx`

**Interfaces:**
- Consumes:
  - `useUsername(): [string | undefined, boolean]` from `~/provider/auth`
  - `useBook(bookId): [Book | undefined, boolean, ...]` — second tuple element is `bookLoading`
  - `LinkProgressModal` from `~/control` with props `{ isOpen: boolean; documentId: string; username: string; onClose: () => void }`
  - `AlertOctagonIcon` from `~/icon` (props `width`, `height`, `className`, `aria-label`)
- Produces: no new exported symbols; `MyProgressRow` keeps its `{ bookId }` prop.

- [ ] **Step 1: Write the failing tests**

Rewrite the top-of-file mocks/imports and add new tests in
`app/client/src/component/my-progress-row/index.test.tsx`.

First, update the imports + mocks at the top of the file so they read:

```tsx
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { useUsername } from '~/provider/auth';
import { useBook, type Book } from '~/provider/book';
import { useDeleteMyProgress, useMyProgress } from '~/provider/progress';
import { renderWithProviders } from '~/test-utils';

import { MyProgressRow } from './index';

// vi.mock is hoisted by Vitest regardless of position in file
vi.mock('~/provider/auth', () => ({
  useUsername: vi.fn(),
}));
vi.mock('~/provider/book');
vi.mock('~/provider/progress');
vi.mock('~/control', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/control')>();
  return {
    ...actual,
    LinkProgressModal: ({ isOpen }: { isOpen: boolean }) =>
      isOpen ? <div>link-progress-modal</div> : null,
  };
});
```

Then, in the existing `beforeEach`, add the username mock (keep the three existing mock lines):

```tsx
  beforeEach(() => {
    mockDelete = vi.fn<(bookId: string) => Promise<boolean>>().mockResolvedValue(true);
    vi.mocked(useUsername).mockReturnValue(['alice', false]);
    vi.mocked(useBook).mockReturnValue([mockBook, false, false, undefined]);
    vi.mocked(useMyProgress).mockReturnValue([mockProgress, false, false, undefined]);
    vi.mocked(useDeleteMyProgress).mockReturnValue([mockDelete, false, false, undefined]);
  });
```

Then add these tests inside the `describe('MyProgressRow', ...)` block:

```tsx
  it('prefers titleSort over title for a resolved book', () => {
    vi.mocked(useBook).mockReturnValue([
      { id: 'book-1', title: 'The Great Gatsby', titleSort: 'Great Gatsby, The' } as unknown as Book,
      false,
      false,
      undefined,
    ]);
    renderWithProviders(<MyProgressRow bookId="book-1" />);
    expect(screen.getByText('Great Gatsby, The')).toBeInTheDocument();
    expect(screen.queryByText('The Great Gatsby')).not.toBeInTheDocument();
  });

  it('does not show a Link button for a resolved book', () => {
    renderWithProviders(<MyProgressRow bookId="book-1" />);
    expect(screen.queryByText('Link')).not.toBeInTheDocument();
  });

  it('shows a Link button when the progress is unresolved', () => {
    vi.mocked(useBook).mockReturnValue([undefined, false, false, undefined] as unknown as ReturnType<
      typeof useBook
    >);
    vi.mocked(useMyProgress).mockReturnValue([
      { document: 'orphan-id', percentage: 0.5, device: 'Kobo', timestamp: 1000 },
      false,
      false,
      undefined,
    ]);
    renderWithProviders(<MyProgressRow bookId="orphan-id" />);
    expect(screen.getByText('Link')).toBeInTheDocument();
  });

  it('does not show a Link button while the book is loading', () => {
    vi.mocked(useBook).mockReturnValue([undefined, true, false, undefined] as unknown as ReturnType<
      typeof useBook
    >);
    vi.mocked(useMyProgress).mockReturnValue([
      { document: 'orphan-id', percentage: 0.5, device: 'Kobo', timestamp: 1000 },
      false,
      false,
      undefined,
    ]);
    renderWithProviders(<MyProgressRow bookId="orphan-id" />);
    expect(screen.queryByText('Link')).not.toBeInTheDocument();
  });

  it('opens the link modal when Link is clicked', async () => {
    vi.mocked(useBook).mockReturnValue([undefined, false, false, undefined] as unknown as ReturnType<
      typeof useBook
    >);
    vi.mocked(useMyProgress).mockReturnValue([
      { document: 'orphan-id', percentage: 0.5, device: 'Kobo', timestamp: 1000 },
      false,
      false,
      undefined,
    ]);
    const user = userEvent.setup();
    renderWithProviders(<MyProgressRow bookId="orphan-id" />);
    expect(screen.queryByText('link-progress-modal')).not.toBeInTheDocument();
    await user.click(screen.getByText('Link'));
    expect(screen.getByText('link-progress-modal')).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd app/client && npx vitest run src/component/my-progress-row/index.test.tsx`
Expected: FAIL — the new tests fail (no "Link" text is rendered; `link-progress-modal` never appears). Some pre-existing tests may also error now that `useUsername` is mocked and `~/control` is partially mocked — that is expected until Step 3/4 land.

- [ ] **Step 3: Update the component**

Replace the entire contents of `app/client/src/component/my-progress-row/index.tsx` with:

```tsx
import cx from 'classnames';
import { Fragment, useCallback, useState } from 'react';

import { Button, ConfirmModal, LinkProgressModal } from '~/control';
import { AlertOctagonIcon } from '~/icon';
import { useUsername } from '~/provider/auth';
import { useBook } from '~/provider/book';
import { useDeleteMyProgress, useMyProgress } from '~/provider/progress';
import { useToast } from '~/provider/toast';
import { relativeTime } from '~/utils';

import { ProgressIndicator } from '../progress-indicator';

import { useStyle } from './style';

interface MyProgressRowProps {
  bookId: string;
}

export const MyProgressRow = ({ bookId }: MyProgressRowProps) => {
  const styles = useStyle();

  const [username] = useUsername();
  const [book, bookLoading] = useBook(bookId);
  const [progress, progressLoading, progressError] = useMyProgress(bookId);
  const [deleteMyProgress, deleting] = useDeleteMyProgress();
  const showToast = useToast();

  const [showClearModal, setShowClearModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);

  const handleClear = useCallback(() => setShowClearModal(true), []);
  const handleCancelClear = useCallback(() => setShowClearModal(false), []);
  const handleConfirmClear = useCallback(async () => {
    setShowClearModal(false);
    const ok = await deleteMyProgress(bookId);
    if (ok) {
      showToast('Progress cleared', 'success');
    } else {
      showToast('Failed to clear progress', 'error');
    }
  }, [deleteMyProgress, bookId, showToast]);

  if (progressLoading) {
    return <div className={styles.loading}>Loading…</div>;
  }
  if (progressError) {
    return <div className={styles.error}>Error loading progress</div>;
  }
  if (progress === undefined) {
    return null;
  }

  const bookTitle = book ? book.titleSort || book.title : progress.document;
  const isUnresolved = book === undefined && !bookLoading;

  const metadataList: string[] = [];
  if (progress.device) metadataList.push(progress.device);
  if (progress.timestamp != null) metadataList.push(relativeTime(progress.timestamp));

  return (
    <Fragment>
      <div className={styles.root}>
        <div className={styles.progress}>
          <ProgressIndicator value={progress.percentage} size={14} />
        </div>
        <div className={cx(styles.book, { [styles.bookUnresolved]: isUnresolved })}>
          {isUnresolved && (
            <AlertOctagonIcon
              width={14}
              height={14}
              className={styles.orphanIcon}
              aria-label="Unlinked progress"
            />
          )}
          <span className={styles.title}>{bookTitle}</span>
        </div>
        <div className={styles.metadata}>{metadataList.join(' · ')}</div>
        {isUnresolved && (
          <Button type="link" onClick={() => setShowLinkModal(true)}>
            Link
          </Button>
        )}
        <Button type="link" danger onClick={handleClear} loading={deleting}>
          Clear
        </Button>
      </div>
      {showClearModal && (
        <ConfirmModal
          isOpen
          onCancel={handleCancelClear}
          onConfirm={handleConfirmClear}
          icon={AlertOctagonIcon}
          danger
          title="Clear reading progress?"
          confirmText="Clear"
          loading={deleting}
        >
          This will remove your synced reading progress for <strong>{bookTitle}</strong>.
        </ConfirmModal>
      )}
      {showLinkModal && username !== undefined && (
        <LinkProgressModal
          isOpen
          documentId={bookId}
          username={username}
          onClose={() => setShowLinkModal(false)}
        />
      )}
    </Fragment>
  );
};
```

(Note: the clear-modal state was renamed `showModal` → `showClearModal` and its handlers to `handleCancelClear` / `handleConfirmClear` to disambiguate from the link modal, mirroring `UserProgressRow`.)

- [ ] **Step 4: Update the styles**

Replace the entire contents of `app/client/src/component/my-progress-row/style.ts` with:

```ts
import { createUseStyles, type Theme } from '~/provider/theme';

export const useStyle = createUseStyles((theme: Theme) => ({
  loading: {
    fontSize: theme.fontSize.md,
    color: theme.color.text.muted,
  },
  error: {
    fontSize: theme.fontSize.md,
    color: theme.color.danger.default,
  },
  root: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.space.md,
  },
  progress: {
    display: 'flex',
    alignItems: 'center',
  },
  book: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.space.sm,
    flexGrow: 1,
    minWidth: 0,
    fontSize: theme.fontSize.md,
  },
  bookUnresolved: {
    color: theme.color.text.muted,
  },
  orphanIcon: {
    flexShrink: 0,
    color: theme.color.danger.default,
  },
  title: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  metadata: {
    fontSize: theme.fontSize.md,
  },
}));
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd app/client && npx vitest run src/component/my-progress-row/index.test.tsx`
Expected: PASS — all new tests plus the pre-existing Clear-flow tests.

- [ ] **Step 6: Commit**

```bash
git add app/client/src/component/my-progress-row/index.tsx app/client/src/component/my-progress-row/style.ts app/client/src/component/my-progress-row/index.test.tsx
git commit -m "feat(progress): let users link their own orphaned synced progress"
```

---

## Task 3: Full verification

Run the whole client suite and lint both workspaces to confirm nothing regressed.

**Files:** none (verification only).

- [ ] **Step 1: Run the full client test suite**

Run: `cd app/client && npm test`
Expected: PASS — all client tests green.

- [ ] **Step 2: Run lint from the repo root**

Run: `cd "$(git rev-parse --show-toplevel)" && npm run lint`
Expected: PASS — no ESLint or Prettier errors in either workspace.

- [ ] **Step 3: If lint reports formatting issues, auto-fix and re-verify**

Run: `cd "$(git rev-parse --show-toplevel)" && npm run lint:fix && npm run lint`
Expected: PASS. If files changed, amend the relevant commit:
`git add -A && git commit --amend --no-edit`

---

## Self-Review Notes

- **Spec coverage:** Link button on user's own unresolved rows (Task 2, Steps 1/3) ✓; orphan hint = alert icon + muted title (Task 2, Steps 3/4) ✓; reuse of `LinkProgressModal` scoped to current user (Task 2, Step 3) ✓; prefer sort title on both rows (Task 1 Step 3, Task 2 Step 3) ✓; ellipsis truncation on both rows (Task 1 Step 4, Task 2 Step 4) ✓; no backend/auth changes ✓.
- **Type consistency:** title expression `book ? book.titleSort || book.title : progress.document` is identical in both rows; `LinkProgressModal` props match its definition (`isOpen`, `documentId`, `username`, `onClose`); `useUsername` destructured as `[username]` (string | undefined) and guarded before use.
- **Guard rationale:** `showLinkModal && username !== undefined` — a logged-in user always has a username, so the modal always renders when opened; the guard just satisfies the `username: string` prop type without a non-null assertion.

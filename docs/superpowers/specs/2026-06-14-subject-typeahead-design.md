# Subject Tag/Chip Typeahead — Design Spec

**Date:** 2026-06-14
**Status:** Approved

## Overview

Replace the subject metadata editor in `BookEditForm` with a chip-style tag input that offers typeahead suggestions drawn from all subjects across the user's library. The current implementation uses a generic `FieldList` of plain text inputs; the new one is a purpose-built `SubjectChips` control backed by a new `GET /api/subjects` endpoint.

---

## Backend

### `GET /api/subjects`

New route in `app/server/routes/ui.ts`, placed alongside the other `/api/books` routes, behind `requireAuth`.

Uses a raw SQLite `json_each` query via Prisma's `$queryRaw` to extract, flatten, deduplicate, and sort all subjects for the requesting user entirely inside the database:

```ts
// Prisma tagged-template raw query — interpolation is parameterised, not string-concatenated
const rows = await prisma.$queryRaw<Array<{ value: string }>>`
  SELECT DISTINCT value
  FROM books, json_each(books.subjects)
  WHERE user_id = ${userId}
  ORDER BY value
`;
```

This avoids pulling book rows into Node, which matters on HA-class hardware (Raspberry Pi etc.).

The route respects the existing admin/target-user pattern: if an admin passes a `?target=<username>` query param, the query filters on that user's `user_id` instead. This mirrors how `/api/books` and `/api/books/:id` work.

**Response shape:**
```json
{ "subjects": ["Fiction", "History", "Science Fiction"] }
```

---

## Client — Hook

### `useLibrarySubjects`

New file: `app/client/src/provider/book/hook/use-library-subjects.ts`

**Return type:** `[string[], boolean, string | undefined]` — (subjects, loading, error)

Fetches `GET /api/subjects` on mount using `apiFetch` and the `withTargetUser` wrapper, consistent with `useFetchBook` and other hooks in the same directory. No caching: it's only consumed by the edit form, which isn't open in multiple places simultaneously.

Exported from `app/client/src/provider/book/hook/index.ts` and re-exported from `app/client/src/provider/book/index.ts`.

---

## Client — Control

### `SubjectChips`

New control at `app/client/src/control/subject-chips/index.tsx`, with `style.ts` alongside it. Exported from `app/client/src/control/index.ts`.

**Props:**
```ts
type Props = {
  value: string[];
  suggestions: string[];
  onChange: (subjects: string[]) => void;
};
```

**Behaviour:**

- Renders each current subject as a chip with an `×` remove button
- A text input follows the chips; as the user types, a dropdown filters `suggestions` by case-insensitive substring match
- Already-added subjects are excluded from the suggestion list
- Selecting a suggestion (click, or Enter/Tab when the item is highlighted) adds the chip and clears the input
- Typing a free-form value not in the suggestions and pressing Enter/Tab also adds it as a chip
- Pressing Backspace on an empty input removes the last chip
- Arrow keys navigate the dropdown
- Duplicate subjects are silently ignored

The control is purely presentational — no fetching, no side effects.

---

## Client — `BookEditForm` changes

File: `app/client/src/component/book-edit-form/index.tsx`

- Call `useLibrarySubjects()` at the top of the component
- Change the `subjects` local state from `SubjectRow[]` to `string[]` — the chip control works directly with `string[]`
- Remove the `SubjectRow` type and the `generateUUID` calls that were used to generate FieldList row keys for subjects
- Replace the subjects `<Card>` content:
  ```tsx
  // Before
  <FieldList
    addLabel="Add subject"
    columns={[{ type: 'text', key: 'value', placeholder: 'Subject' }]}
    rows={subjects as FieldRow[]}
    onAdd={...}
    onRemove={...}
    onChange={...}
  />

  // After
  <SubjectChips
    value={subjects}
    suggestions={librarySubjects}
    onChange={setSubjects}
  />
  ```
- Simplify the save logic: `subjects.map((r) => r.value).filter(Boolean)` becomes just `subjects`
- The `IdentifierRow` type, `FieldList` for identifiers, and `generateUUID` for identifiers are untouched

---

## Files Changed

| File | Change |
|------|--------|
| `app/server/routes/ui.ts` | Add `GET /api/subjects` route |
| `app/client/src/provider/book/hook/use-library-subjects.ts` | New hook |
| `app/client/src/provider/book/hook/index.ts` | Export new hook |
| `app/client/src/provider/book/index.ts` | Re-export new hook |
| `app/client/src/control/subject-chips/index.tsx` | New control |
| `app/client/src/control/subject-chips/style.ts` | New control styles |
| `app/client/src/control/index.ts` | Export new control |
| `app/client/src/component/book-edit-form/index.tsx` | Use new control + hook |

---

## Out of Scope

- Persisting or caching the subject list beyond the edit form session
- Any changes to how subjects are stored (still `string[]` in JSON)
- Typeahead for any other field (identifiers, series, etc.)

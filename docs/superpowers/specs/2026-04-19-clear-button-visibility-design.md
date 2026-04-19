# Design: Hide Clear Button When No Progress Synced

**Date:** 2026-04-19  
**Status:** Approved

## Problem

The "Clear" button currently appears for every book in the library view and series page, regardless of whether the user has any synced reading progress for that book. Clicking it on a book with no progress would result in a 404 from the API. More importantly, showing it at all is misleading — there is nothing to clear.

## Goal

Only show the "Clear" button for non-admin users when the book has a progress entry in `progressMap` (i.e., `pct != null`).

## Scope

- `app/public/index.html` only — no backend changes required.
- Two rendering sites affected:
  1. `renderStandaloneSection` (~line 299): standalone books in the library view.
  2. `showSeriesPage` (~line 367): books in a series page.

## Design

In both rendering sites, `pct = progressMap.get(book.id)` is already computed before the button HTML is built. `pct` is `undefined` when no progress record exists for the book.

Change the clear button from unconditional to conditional on `pct != null`:

```js
// Before
'<button class="clear-btn user-only" ...>Clear</button>'

// After
(pct != null ? '<button class="clear-btn user-only" ...>Clear</button>' : '')
```

No new data fetching, no new state, no backend changes.

## Test Coverage

The existing test for the UI route (`app/routes/ui.test.ts`) does not test the rendered HTML of the client-side JS. A unit test for the conditional rendering is not practical without a DOM testing framework. Manual verification suffices: log in as a non-admin user and confirm the Clear button is absent for books with no progress and present for books that have been opened in KOReader.

# Series Stack UI — Design Spec

**Date:** 2026-04-18  
**Status:** Approved

---

## Overview

Redesign the Library tab to group books by series. Each series is presented as a visual stack of fanned book covers. Clicking a series opens a dedicated series detail page. Books with no series are collected at the bottom in a collapsible "Standalone Books" section.

---

## Main Library View

### Series Groups

- Books that share a `series` value are grouped into a single series row, sorted alphabetically by series name.
- A series group is shown even when it contains only one book.
- Each series row displays:
  - **Fanned cover stack:** up to 3 book covers rendered with diagonal offset (rotate –6°, –2°, 0°), drawn back-to-front by series index. When a series has fewer than 3 books, ghost/faded placeholder layers fill the back positions to maintain the stack shape.
  - **Series name** (bold)
  - **Author name · N books** (secondary text)
  - **"View series →"** (tertiary link text in blue)
- Clicking anywhere on the row navigates to the Series Page (in-page navigation, no URL change).
- No delete button on the series row itself; deletion happens from the Series Page.

### Standalone Books Section

- Books with an empty `series` field appear in a collapsible "Standalone Books" section below all series groups.
- The section header shows a chevron, the label "Standalone Books", and the book count.
- Expanded by default.
- Clicking the header toggles collapse/expand.
- When expanded, each book is displayed as a standard book row (same as current: cover thumbnail, title, author, format/size, delete button).

### Sorting

- Series groups: A–Z by series name.
- Within a series: ascending by `seriesIndex`.
- Standalone books: A–Z by title.

---

## Series Page

Replaces the library content area (same `main` element); no new browser page or URL change.

### Hero Header

- Blue banner (`#1e40af`) matching the app header color.
- Fanned cover stack (same rendering as the list row, slightly larger).
- "Series" label in small uppercase above the series name.
- Series name (large, bold, white).
- Author name and book count (muted white).

### Back Navigation

- "← Library" text link below the hero header returns to the library view.

### Book List

- Section label: "Reading Order" in small caps.
- Books listed in ascending `seriesIndex` order.
- Each row: cover thumbnail, book title, `#N · EPUB · X MB`, delete button.
- Deleting a book calls `DELETE /api/books/:id` and refreshes the series page.
- If the deleted book was the last in the series, navigate back to the library view automatically.

---

## Data & API

No new API endpoints required. The existing `GET /api/books` response already includes `series` and `seriesIndex` per book. The frontend groups and sorts client-side.

---

## Edge Cases

| Scenario | Behaviour |
|---|---|
| Series with 1 book | Shown as a series group with faded ghost covers behind the real cover |
| Series with 2 books | Two real covers + one ghost layer |
| Series with 3+ books | Three real covers (front 3 by index), no ghosts |
| Book has no series | Appears in Standalone Books section |
| All books have series | Standalone Books section is hidden entirely |
| All books are standalone | No series groups shown; Standalone Books section is always expanded (no point collapsing) |
| Last book in series deleted | Navigate back to library; series group disappears |

---

## Out of Scope

- Progress indicators on the series page (deferred).
- URL routing / deep linking to series pages.
- Editing series metadata.
- Series cover art beyond individual book covers.

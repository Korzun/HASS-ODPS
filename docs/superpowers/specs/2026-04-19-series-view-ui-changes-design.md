# Series View UI Changes Design

**Date:** 2026-04-19  
**Branch:** fix/epub-entity-decoding (or new feature branch)

## Overview

Two visual changes to the series detail view (`showSeriesPage`) to align it with the book detail view (`renderBookDetail`):

1. Move navigation to the top (breadcrumb style)
2. Change header styling to match the book detail hero card

## Change 1: Navigation

**Current behaviour:** A plain `← Library` back button (`.series-back`) rendered *after* the hero banner.

**New behaviour:** A breadcrumb nav rendered *before* the hero, identical in structure to the book detail nav:

```
← Library / Series Name
```

**Implementation:**
- Render a `<div class="book-detail-nav">` as the first element inside `seriesSection.innerHTML`, before the hero.
- `← Library` uses `<button class="book-back-btn">`.
- The separator uses `<span class="sep">/</span>`.
- The series name uses `<span class="crumb-current">`.
- Remove the `.series-back` button from the HTML string and its CSS rule.

## Change 2: Header Styling

**Current behaviour:** `.series-hero` — a blue (`#1e40af`) banner with white text, cover stack on the left, series name/author/count on the right.

**New behaviour:** `.book-detail-hero` — a white card (`background:#fff`, `border-radius:6px`, `padding:1.25rem`, `box-shadow:0 1px 3px rgba(0,0,0,.07)`, `display:flex`, `gap:1.25rem`, `align-items:flex-start`) with dark text.

**Inner layout (right column):**
- `.book-detail-meta` wrapper div
- `.book-detail-title` — series name
- `.book-detail-author` — author (omitted if absent)
- `.book-detail-stats` / `.book-detail-stat` — book count (e.g. `Books: 4`)

**Cover stack:** unchanged — same `buildCoverStack(books, 68, 86, 52, 72, HERO_STACK_OFFSETS)` call, wrapped in a `flex-shrink:0` div.

**CSS removed:** `.series-hero`, `.series-hero-badge`, `.series-hero-title`, `.series-hero-meta`, `.series-back`

**CSS added:** none (reuses existing `.book-detail-*` rules)

## Files Affected

- `app/public/index.html` — only file changed

## What Does Not Change

- Cover stack dimensions and offsets
- `.series-order-label` ("Reading Order") and its CSS
- The book list rendering inside the series page
- All book detail view code

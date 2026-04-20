# Series Badge Design

**Date:** 2026-04-19

## Overview

Add a `📚 N books` badge above the series title in the series detail view hero card to distinguish it from a single-book detail view.

## Context

After aligning the series hero with `.book-detail-hero`, the series and book detail views share the same white card layout. A user landing on the series page could mistake it for a single-book detail. This badge resolves that ambiguity.

## Design

In the `showSeriesPage` function's `seriesSection.innerHTML`, the right column (`.book-detail-meta`) is updated:

**Before:**
```
.book-detail-title      ← series name
.book-detail-author     ← author (conditional)
.book-detail-stats
  .book-detail-stat     ← "Books: N"
```

**After:**
```
.book-detail-series-badge  ← "📚 N books" (singular: "📚 1 book")
.book-detail-title          ← series name
.book-detail-author         ← author (conditional)
```

## Implementation Details

- Use the existing `.book-detail-series-badge` CSS class (already defined; used in book detail view)
- Badge text: `'📚 ' + count + ' book' + (count !== 1 ? 's' : '')`
- Remove the `.book-detail-stats` wrapper div and its `.book-detail-stat` child ("Books: N") — the badge replaces this information
- No new CSS required

## Files Affected

- `app/public/index.html` — only file changed (the `showSeriesPage` function, `seriesSection.innerHTML` assignment)

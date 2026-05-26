# Chapter Parsing Improvement Design

**Date:** 2026-05-26  
**File:** `app/server/services/epub-parser.ts`

## Problem

Chapter parsing produces unreliable counts — sometimes too high, sometimes too low — depending on the epub. Two root causes were identified by running the current parser against a corpus of 23 real epub files:

1. **Front matter without `epub:type`:** Many publishers list "Cover", "Title Page", "Copyright", "Dedication" etc. in the TOC nav without setting `epub:type` on those documents. The existing `epub:type` filter never sees them, so they pass through as chapters.

2. **Hierarchical TOC inflation:** When a nav `<li>` has both its own `<a>` link (a part/section title page) and a nested `<ol>` of children (the actual chapters), the current `flattenNavOl` collects the parent entry alongside the children. "Part I: Wallfacers", "The River" (part page), "PART 1: THE FIRST AGE" etc. all get counted as chapters.

Observed examples of inflated counts: Tiamat's Wrath (60 chapters, starting with "Title Page", "Copyright"); macmillan epub (135 chapters); Kindred (56 chapters, duplicate "The River" entries).

## Approach: Leaf-Only Flattening + Title Deny List

Two targeted changes to `parseNavChapters`, layered on top of the existing `epub:type` filter.

### 1. Leaf-Only Nav Flattening

**EPUB 3 nav (`flattenNavOl`):** When a `<li>` contains both an `<a>` and a nested `<ol>`, skip the `<a>` and recurse only into the `<ol>`. Leaf entries (no `<ol>` sibling) are collected as before.

**EPUB 2 NCX (`flattenNcxNavPoints`):** Same principle — when a `navPoint` has nested `navPoint` children, skip the parent's `<content src>` and recurse only into children.

**Fallback:** If leaf-only flattening produces zero entries for a given nav source (edge case where every top-level entry has children), fall back to the current full-flatten behavior for that source so no book silently loses all chapters.

### 2. Title Deny List

After flattening, filter out entries whose trimmed titles match the following patterns (all case-insensitive):

**Exact matches:**
- `cover`, `title page`, `titlepage`
- `copyright`, `copyright page`
- `dedication`
- `contents`, `table of contents`, `toc`
- `acknowledgements`, `acknowledgments`
- `epigraph`
- `map`, `maps`
- `halftitle`, `half title`
- `also by`, `colophon`
- `dramatis personae`, `cast of characters`, `list of characters`
- `what has gone before`

**Prefix matches** (title starts with, case-insensitive):
- `about the` — catches "About the Author", "About the Translator", "About the Publisher"
- `by the same` — catches "By the Same Author"
- `books by` — catches "Books by [Author]"

The deny list is applied after leaf-only flattening. If filtering leaves zero entries that is a valid result — no fallback is applied at this stage.

### 3. Existing `epub:type` Filter (unchanged)

The existing check that reads each document's `<body>` or `<section>` `epub:type` attribute and excludes known types (`cover`, `frontmatter`, `titlepage`, `backmatter`, etc.) is retained as a third layer. It continues to catch well-typed EPUBs where the publisher correctly annotates documents.

## Output Contract (unchanged)

`parseEpub` returns the same `EpubMeta` shape. Only the values of `chapterCount`, `chapterSpineMap`, and `chapterNames` become more accurate. No schema or API changes.

## Testing

Changes to existing tests:
- Update expected counts/maps in tests that will be affected by the new filtering.

New test cases to add (all using the existing `makeEpubWithNav` / `makeEpubWithNcx` helpers):

| Scenario | What it verifies |
|---|---|
| Hierarchical nav (parts with chapter children) | Parent part entries excluded; only leaf chapters returned |
| Hierarchical NCX (navPoints with navPoint children) | Same for NCX source |
| Title deny list — exact matches | "Cover", "Title Page", "Copyright", "Dedication", "Map" entries excluded |
| Title deny list — prefix matches | "About the Author", "By the Same Author" entries excluded |
| Title deny list — case insensitivity | "COVER", "Title Page", "copyright" all excluded |
| Deny list does not over-filter | "Prologue", "Epilogue", "Chapter 1" are kept |
| All-parent nav fallback | When every nav entry has children, chapters are still returned (full-flatten fallback) |
| Mixed flat + hierarchical nav | Flat chapters kept, parent-with-children entries excluded |

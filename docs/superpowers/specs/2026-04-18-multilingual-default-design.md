# Multilingual Default to English — Design Spec

**Date:** 2026-04-18
**Status:** Approved

---

## Problem

EPUB3 books can contain multiple language variants of the same metadata field using `xml:lang` attributes:

```xml
<dc:title xml:lang="en">Death's End</dc:title>
<dc:title xml:lang="zh">死亡终结</dc:title>

<meta id="collection-en" property="belongs-to-collection" xml:lang="en">Remembrance of Earth's Past</meta>
<meta id="collection-zh" property="belongs-to-collection" xml:lang="zh-Hans">地球往事</meta>
```

The current parser blindly takes the **first** element with no language awareness. If a non-English variant appears first, the wrong value is stored.

---

## Scope

Changes are limited to `app/services/EpubParser.ts` and `tests/EpubParser.test.ts`. No schema changes, no new files.

Fields in scope: `dc:title`, `dc:creator`, `dc:description`, `belongs-to-collection`.
Not in scope: `calibre:series` (Calibre metadata has no language variants).

---

## Design

### Language selection priority

For any multi-valued field, select in this order:

1. Element whose `xml:lang` starts with `"en"` (case-insensitive: covers `en`, `en-US`, `en-GB`, etc.)
2. Element with no `xml:lang` attribute
3. First element (last-resort fallback)

### `pickLang` helper

A module-private function added to `EpubParser.ts`:

```typescript
function pickLang(items: Array<string | Record<string, string>>): string {
  const candidates = items.map(item =>
    typeof item === 'string'
      ? { text: item, lang: '' }
      : { text: item['#text'] ?? '', lang: item['@_xml:lang'] ?? '' }
  );
  return (
    candidates.find(c => c.lang.toLowerCase().startsWith('en'))?.text ??
    candidates.find(c => c.lang === '')?.text ??
    candidates[0]?.text ??
    ''
  );
}
```

### XMLParser config update

Add `dc:title` and `dc:creator` to the `isArray` callback so they are always arrays regardless of how many elements appear in the OPF. This eliminates the "string vs. array" branching in extraction logic.

```typescript
isArray: (name) => ['item', 'meta', 'dc:title', 'dc:creator'].includes(name),
```

### Metadata extraction changes

**Title** (line 55-56): Replace multi-condition ternary with:
```typescript
const title = pickLang(metadata['dc:title'] ?? []) || path.basename(filePath, path.extname(filePath));
```

**Author** (line 58-59): Replace with:
```typescript
const author = pickLang(metadata['dc:creator'] ?? []);
```

**Description** (line 61-62): Extend to handle array case:
```typescript
const rawDesc = metadata['dc:description'];
const description = Array.isArray(rawDesc) ? pickLang(rawDesc) : (typeof rawDesc === 'string' ? rawDesc : '');
```

### Series handling

Current code has a "last wins" issue: `belongs-to-collection` can silently overwrite `calibre:series` depending on element order in the OPF.

Replace the single-pass loop with a two-phase approach:

**Phase 1 — collect:**
```typescript
let calibreSeries = '';
let calibreSeriesIndex = 0;
let groupPosition = 0;
const collectionCandidates: Array<Record<string, string>> = [];

for (const m of metas) {
  if (m['@_name'] === 'calibre:series')       calibreSeries = m['@_content'] ?? '';
  if (m['@_name'] === 'calibre:series_index')  calibreSeriesIndex = parseFloat(m['@_content'] ?? '0') || 0;
  if (m['@_property'] === 'belongs-to-collection') collectionCandidates.push(m);
  if (m['@_property'] === 'group-position')    groupPosition = parseFloat(m['#text'] ?? '0') || 0;
}
```

**Phase 2 — resolve:**
```typescript
const series = calibreSeries || pickLang(collectionCandidates);
const seriesIndex = calibreSeriesIndex || groupPosition;
```

`calibre:series` takes explicit precedence over `belongs-to-collection`.

---

## Tests

All new cases added to `tests/EpubParser.test.ts`.

### Title language selection

| Case | Elements | Expected |
|------|----------|----------|
| English last | `zh` first, `en` second | English text |
| No-lang fallback | no-lang first, `zh` second | no-lang text |
| All-foreign fallback | `de` only, `zh` only | first element |

### Author language selection

Same three cases mirrored for `dc:creator`.

### Series language selection

| Case | Expected |
|------|----------|
| `belongs-to-collection` with `en` and `zh` variants | English text |
| `belongs-to-collection` with only `zh` | Chinese text (first/only) |
| `calibre:series` + multilingual `belongs-to-collection` | `calibre:series` value wins |

### Existing tests

The existing test "parses title as string when dc:title elements have xml attributes" (line 160) continues to pass unchanged — it has English first and English is also the preferred language.

---

## Out of Scope

- UI language switching
- Per-user language preferences
- Storing multiple language variants in the database
- Any changes to `BookStore.ts`, `types.ts`, routes, or the web UI

# Multilingual Default to English — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the EPUB parser to select English metadata (title, author, description, series) when multiple language variants are present, falling back to no-lang then first element.

**Architecture:** Add a `pickLang` helper inside `EpubParser.ts` that implements language-priority selection. Update the XMLParser `isArray` config so `dc:title` and `dc:creator` are always arrays. Replace the current first-element-only extraction for title, author, description, and series with `pickLang` calls. No schema changes.

**Tech Stack:** TypeScript, fast-xml-parser, adm-zip, Jest

---

## File Map

| File | Change |
|------|--------|
| `app/services/EpubParser.ts` | Add `pickLang`, update `isArray` config, replace title/author/description extraction, rewrite series handling |
| `tests/EpubParser.test.ts` | Add 6 new test cases for language selection |

---

### Task 1: Write failing tests for title and author language selection

**Files:**
- Modify: `tests/EpubParser.test.ts`

- [ ] **Step 1: Add three title language-selection tests**

Append these three `it` blocks inside the existing `describe` block in `tests/EpubParser.test.ts`, just before the closing `});` of the describe block:

```typescript
  it('picks english title when non-english variant appears first', () => {
    const zip = new AdmZip();
    zip.addFile('META-INF/container.xml', Buffer.from(`<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`));
    zip.addFile('OEBPS/content.opf', Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title xml:lang="zh">死亡终结</dc:title>
    <dc:title xml:lang="en">Death's End</dc:title>
  </metadata>
  <manifest/><spine/>
</package>`));
    const filePath = path.join(tmpDir, 'lang-title-en-last.epub');
    fs.writeFileSync(filePath, zip.toBuffer());
    const meta = parseEpub(filePath);
    expect(meta.title).toBe("Death's End");
  });

  it('falls back to no-lang title when english is absent', () => {
    const zip = new AdmZip();
    zip.addFile('META-INF/container.xml', Buffer.from(`<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`));
    zip.addFile('OEBPS/content.opf', Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Untranslated Title</dc:title>
    <dc:title xml:lang="zh">中文标题</dc:title>
  </metadata>
  <manifest/><spine/>
</package>`));
    const filePath = path.join(tmpDir, 'lang-title-nolang.epub');
    fs.writeFileSync(filePath, zip.toBuffer());
    const meta = parseEpub(filePath);
    expect(meta.title).toBe('Untranslated Title');
  });

  it('falls back to first title when no english or no-lang variant exists', () => {
    const zip = new AdmZip();
    zip.addFile('META-INF/container.xml', Buffer.from(`<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`));
    zip.addFile('OEBPS/content.opf', Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title xml:lang="de">Der Dunkle Wald</dc:title>
    <dc:title xml:lang="zh">黑暗森林</dc:title>
  </metadata>
  <manifest/><spine/>
</package>`));
    const filePath = path.join(tmpDir, 'lang-title-allforeignt.epub');
    fs.writeFileSync(filePath, zip.toBuffer());
    const meta = parseEpub(filePath);
    expect(meta.title).toBe('Der Dunkle Wald');
  });
```

- [ ] **Step 2: Add three author language-selection tests**

Append these three `it` blocks immediately after the title tests added above:

```typescript
  it('picks english author when non-english variant appears first', () => {
    const zip = new AdmZip();
    zip.addFile('META-INF/container.xml', Buffer.from(`<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`));
    zip.addFile('OEBPS/content.opf', Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Test</dc:title>
    <dc:creator xml:lang="zh">刘慈欣</dc:creator>
    <dc:creator xml:lang="en">Liu Cixin</dc:creator>
  </metadata>
  <manifest/><spine/>
</package>`));
    const filePath = path.join(tmpDir, 'lang-author-en-last.epub');
    fs.writeFileSync(filePath, zip.toBuffer());
    const meta = parseEpub(filePath);
    expect(meta.author).toBe('Liu Cixin');
  });

  it('falls back to no-lang author when english is absent', () => {
    const zip = new AdmZip();
    zip.addFile('META-INF/container.xml', Buffer.from(`<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`));
    zip.addFile('OEBPS/content.opf', Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Test</dc:title>
    <dc:creator>Liu Cixin</dc:creator>
    <dc:creator xml:lang="zh">刘慈欣</dc:creator>
  </metadata>
  <manifest/><spine/>
</package>`));
    const filePath = path.join(tmpDir, 'lang-author-nolang.epub');
    fs.writeFileSync(filePath, zip.toBuffer());
    const meta = parseEpub(filePath);
    expect(meta.author).toBe('Liu Cixin');
  });

  it('falls back to first author when no english or no-lang variant exists', () => {
    const zip = new AdmZip();
    zip.addFile('META-INF/container.xml', Buffer.from(`<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`));
    zip.addFile('OEBPS/content.opf', Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Test</dc:title>
    <dc:creator xml:lang="zh">刘慈欣</dc:creator>
    <dc:creator xml:lang="ja">劉慈欣</dc:creator>
  </metadata>
  <manifest/><spine/>
</package>`));
    const filePath = path.join(tmpDir, 'lang-author-allforeignt.epub');
    fs.writeFileSync(filePath, zip.toBuffer());
    const meta = parseEpub(filePath);
    expect(meta.author).toBe('刘慈欣');
  });
```

- [ ] **Step 3: Run the new tests and confirm they fail**

```bash
npm test -- --testPathPattern=EpubParser --verbose 2>&1 | grep -E "(PASS|FAIL|✓|✕|×|●|picks|falls back)"
```

Expected: the 6 new tests FAIL (the existing tests still pass).

---

### Task 2: Implement `pickLang`, update `isArray`, and fix title/author/description extraction

**Files:**
- Modify: `app/services/EpubParser.ts`

- [ ] **Step 1: Add the `pickLang` helper function**

Insert this function immediately before the `parseEpub` function (at line 29, before `export function parseEpub`):

```typescript
type MetaLike = string | { [key: string]: string | undefined };

function pickLang(items: MetaLike[]): string {
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

- [ ] **Step 2: Update `isArray` in the XMLParser config**

Find this block (lines 31–35):

```typescript
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: (name) => ['item', 'meta'].includes(name),
  });
```

Replace with:

```typescript
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: (name) => ['item', 'meta', 'dc:title', 'dc:creator'].includes(name),
  });
```

- [ ] **Step 3: Replace title, author, and description extraction**

Find these lines (54–62):

```typescript
  const rawTitle = metadata['dc:title'];
  const title = (typeof rawTitle === 'string' ? rawTitle : Array.isArray(rawTitle) ? (typeof rawTitle[0] === 'string' ? rawTitle[0] : rawTitle[0]?.['#text'] ?? '') : '') || path.basename(filePath, path.extname(filePath));

  const rawCreator = metadata['dc:creator'];
  const author = typeof rawCreator === 'string' ? rawCreator : Array.isArray(rawCreator) ? (typeof rawCreator[0] === 'string' ? rawCreator[0] : rawCreator[0]?.['#text'] ?? '') : '';

  const rawDesc = metadata['dc:description'];
  const description = typeof rawDesc === 'string' ? rawDesc : '';
```

Replace with:

```typescript
  const title = pickLang(metadata['dc:title'] ?? []) || path.basename(filePath, path.extname(filePath));
  const author = pickLang(metadata['dc:creator'] ?? []);

  const rawDesc = metadata['dc:description'];
  const description = Array.isArray(rawDesc) ? pickLang(rawDesc) : (typeof rawDesc === 'string' ? rawDesc : '');
```

- [ ] **Step 4: Run the title/author tests and confirm they pass**

```bash
npm test -- --testPathPattern=EpubParser --verbose 2>&1 | grep -E "(PASS|FAIL|✓|✕|×|●|picks|falls back|parses)"
```

Expected: all title and author tests pass. Series tests added in Task 3 don't exist yet — that's fine.

- [ ] **Step 5: Commit**

```bash
git add app/services/EpubParser.ts tests/EpubParser.test.ts
git commit -m "feat: pick english title/author/description from multilingual EPUB metadata"
```

---

### Task 3: Write failing tests for series language selection

**Files:**
- Modify: `tests/EpubParser.test.ts`

- [ ] **Step 1: Add three series language-selection tests**

Append these three `it` blocks after the author tests added in Task 1:

```typescript
  it('picks english series from multilingual belongs-to-collection', () => {
    const zip = new AdmZip();
    zip.addFile('META-INF/container.xml', Buffer.from(`<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`));
    zip.addFile('OEBPS/content.opf', Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Test</dc:title>
    <meta id="collection-en" property="belongs-to-collection" xml:lang="en">Remembrance of Earth's Past</meta>
    <meta id="collection-zh" property="belongs-to-collection" xml:lang="zh-Hans">地球往事</meta>
    <meta property="collection-type">series</meta>
  </metadata>
  <manifest/><spine/>
</package>`));
    const filePath = path.join(tmpDir, 'lang-series-en.epub');
    fs.writeFileSync(filePath, zip.toBuffer());
    const meta = parseEpub(filePath);
    expect(meta.series).toBe("Remembrance of Earth's Past");
  });

  it('falls back to only available series when no english belongs-to-collection exists', () => {
    const zip = new AdmZip();
    zip.addFile('META-INF/container.xml', Buffer.from(`<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`));
    zip.addFile('OEBPS/content.opf', Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Test</dc:title>
    <meta id="collection-zh" property="belongs-to-collection" xml:lang="zh-Hans">地球往事</meta>
    <meta property="collection-type">series</meta>
  </metadata>
  <manifest/><spine/>
</package>`));
    const filePath = path.join(tmpDir, 'lang-series-zh-only.epub');
    fs.writeFileSync(filePath, zip.toBuffer());
    const meta = parseEpub(filePath);
    expect(meta.series).toBe('地球往事');
  });

  it('prefers calibre:series over multilingual belongs-to-collection', () => {
    const zip = new AdmZip();
    zip.addFile('META-INF/container.xml', Buffer.from(`<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`));
    zip.addFile('OEBPS/content.opf', Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Test</dc:title>
    <meta name="calibre:series" content="Three Body"/>
    <meta name="calibre:series_index" content="1"/>
    <meta id="collection-en" property="belongs-to-collection" xml:lang="en">Remembrance of Earth's Past</meta>
    <meta id="collection-zh" property="belongs-to-collection" xml:lang="zh-Hans">地球往事</meta>
  </metadata>
  <manifest/><spine/>
</package>`));
    const filePath = path.join(tmpDir, 'lang-series-calibre-wins.epub');
    fs.writeFileSync(filePath, zip.toBuffer());
    const meta = parseEpub(filePath);
    expect(meta.series).toBe('Three Body');
    expect(meta.seriesIndex).toBe(1);
  });
```

- [ ] **Step 2: Run the new series tests and confirm they fail**

```bash
npm test -- --testPathPattern=EpubParser --verbose 2>&1 | grep -E "(PASS|FAIL|✓|✕|×|●|picks english series|falls back to only|prefers calibre)"
```

Expected: the 3 new series tests FAIL.

---

### Task 4: Implement two-phase series handling

**Files:**
- Modify: `app/services/EpubParser.ts`

- [ ] **Step 1: Replace the series loop with two-phase collection and resolution**

Find this block (lines 66–73):

```typescript
  let series = '';
  let seriesIndex = 0;
  for (const m of metas) {
    if (m['@_name'] === 'calibre:series') series = m['@_content'] ?? '';
    if (m['@_name'] === 'calibre:series_index') seriesIndex = parseFloat(m['@_content'] ?? '0') || 0;
    if (m['@_property'] === 'belongs-to-collection') series = m['#text'] ?? '';
    if (m['@_property'] === 'group-position') seriesIndex = parseFloat(m['#text'] ?? '0') || 0;
  }
```

Replace with:

```typescript
  let calibreSeries = '';
  let calibreSeriesIndex = 0;
  let groupPosition = 0;
  const collectionCandidates: MetaLike[] = [];

  for (const m of metas) {
    if (m['@_name'] === 'calibre:series')       calibreSeries = m['@_content'] ?? '';
    if (m['@_name'] === 'calibre:series_index')  calibreSeriesIndex = parseFloat(m['@_content'] ?? '0') || 0;
    if (m['@_property'] === 'belongs-to-collection') collectionCandidates.push(m);
    if (m['@_property'] === 'group-position')    groupPosition = parseFloat(m['#text'] ?? '0') || 0;
  }

  const series = calibreSeries || pickLang(collectionCandidates);
  const seriesIndex = calibreSeriesIndex || groupPosition;
```

- [ ] **Step 2: Run all tests and confirm they all pass**

```bash
npm test -- --testPathPattern=EpubParser --verbose
```

Expected output: all tests pass with no failures. The suite should show something like:

```
PASS tests/EpubParser.test.ts
  ✓ parses basic epub metadata ...
  ✓ parses title as string when dc:title elements have xml attributes ...
  ✓ picks english title when non-english variant appears first ...
  ✓ falls back to no-lang title when english is absent ...
  ✓ falls back to first title when no english or no-lang variant exists ...
  ✓ picks english author when non-english variant appears first ...
  ✓ falls back to no-lang author when english is absent ...
  ✓ falls back to first author when no english or no-lang variant exists ...
  ✓ picks english series from multilingual belongs-to-collection ...
  ✓ falls back to only available series when no english belongs-to-collection exists ...
  ✓ prefers calibre:series over multilingual belongs-to-collection ...
```

- [ ] **Step 3: Commit**

```bash
git add app/services/EpubParser.ts tests/EpubParser.test.ts
git commit -m "feat: pick english series from multilingual belongs-to-collection metadata"
```

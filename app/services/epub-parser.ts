import * as fs from 'fs';
import * as crypto from 'crypto';
import * as path from 'path';
import AdmZip from 'adm-zip';
import { XMLParser } from 'fast-xml-parser';
import { EpubMeta } from '../types';

const PARTIAL_MD5_OFFSETS = [
  0, 1024, 4096, 16384, 65536, 262144, 1048576, 4194304, 16777216, 67108864, 268435456, 1073741824,
];

export function partialMD5(filePath: string): string {
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const fd = fs.openSync(filePath, 'r');
  const chunks: Buffer[] = [];
  try {
    for (const offset of PARTIAL_MD5_OFFSETS) {
      if (offset >= fileSize) break;
      const len = Math.min(1024, fileSize - offset);
      const buf = Buffer.alloc(len);
      fs.readSync(fd, buf, 0, len, offset);
      chunks.push(buf);
    }
  } finally {
    fs.closeSync(fd);
  }
  return crypto.createHash('md5').update(Buffer.concat(chunks)).digest('hex');
}

function flattenNavOl(ol: unknown): string[] {
  if (!ol || typeof ol !== 'object') return [];
  const items = (ol as Record<string, unknown>).li;
  if (!items) return [];
  const result: string[] = [];
  for (const item of (Array.isArray(items) ? items : [items]) as Array<Record<string, unknown>>) {
    const aNode = item.a;
    if (aNode && typeof aNode === 'object') {
      const href = (aNode as Record<string, string>)['@_href'];
      if (href) result.push(href);
    }
    if (item.ol) result.push(...flattenNavOl(item.ol));
  }
  return result;
}

function flattenNcxNavPoints(navPoints: unknown[]): string[] {
  const result: string[] = [];
  for (const np of navPoints as Array<Record<string, unknown>>) {
    const src = (np.content as Record<string, string> | undefined)?.['@_src'];
    if (src) result.push(src);
    if (np.navPoint) {
      const nested = Array.isArray(np.navPoint) ? np.navPoint : [np.navPoint];
      result.push(...flattenNcxNavPoints(nested as unknown[]));
    }
  }
  return result;
}

function hrefsToSpineMap(
  hrefs: string[],
  fileDir: string,
  spineHrefToIndex: Map<string, number>
): number[] {
  const seen = new Set<number>();
  const result: number[] = [];
  for (const href of hrefs) {
    const rootRel = path.posix.join(fileDir, href.split('#')[0]);
    const idx = spineHrefToIndex.get(rootRel);
    if (idx !== undefined && !seen.has(idx)) {
      seen.add(idx);
      result.push(idx);
    }
  }
  return result;
}

function parseNavChapters(
  zip: AdmZip,
  opfDir: string,
  manifest: Array<{
    '@_id': string;
    '@_href': string;
    '@_media-type': string;
    '@_properties'?: string;
  }>,
  spineHrefToIndex: Map<string, number>
): { chapterCount: number; chapterSpineMap: number[] } {
  const navParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseTagValue: false,
    isArray: (name) => ['li', 'nav', 'navPoint'].includes(name),
  });

  // Try EPUB 3 nav document
  const navItem = manifest.find((i) => i['@_properties']?.split(' ').includes('nav'));
  if (navItem) {
    const navAbsHref = opfDir === '.' ? navItem['@_href'] : `${opfDir}/${navItem['@_href']}`;
    const navEntry = zip.getEntry(navAbsHref) ?? zip.getEntry(navItem['@_href']);
    if (navEntry) {
      const navDir = navAbsHref.includes('/')
        ? navAbsHref.substring(0, navAbsHref.lastIndexOf('/'))
        : '.';
      const doc = navParser.parse(navEntry.getData().toString('utf8')) as Record<string, unknown>;
      const navList = (doc?.html as Record<string, unknown>)?.body as { nav?: unknown } | undefined;
      const navArr = navList?.nav ? (Array.isArray(navList.nav) ? navList.nav : [navList.nav]) : [];
      const tocNav = (navArr as Array<Record<string, unknown>>).find((n) =>
        ((n['@_epub:type'] as string | undefined) ?? '').split(' ').includes('toc')
      );
      if (tocNav) {
        const hrefs = flattenNavOl(tocNav.ol);
        const spineMap = hrefsToSpineMap(hrefs, navDir, spineHrefToIndex);
        if (spineMap.length > 0)
          return { chapterCount: spineMap.length, chapterSpineMap: spineMap };
      }
    }
  }

  // Fall back to EPUB 2 NCX
  const ncxItem = manifest.find((i) => i['@_media-type'] === 'application/x-dtbncx+xml');
  if (ncxItem) {
    const ncxAbsHref = opfDir === '.' ? ncxItem['@_href'] : `${opfDir}/${ncxItem['@_href']}`;
    const ncxEntry = zip.getEntry(ncxAbsHref) ?? zip.getEntry(ncxItem['@_href']);
    if (ncxEntry) {
      const ncxDir = ncxAbsHref.includes('/')
        ? ncxAbsHref.substring(0, ncxAbsHref.lastIndexOf('/'))
        : '.';
      const doc = navParser.parse(ncxEntry.getData().toString('utf8')) as Record<string, unknown>;
      const navPoints: unknown[] =
        (((doc?.ncx as Record<string, unknown>)?.navMap as Record<string, unknown>)
          ?.navPoint as unknown[]) ?? [];
      const hrefs = flattenNcxNavPoints(navPoints);
      const spineMap = hrefsToSpineMap(hrefs, ncxDir, spineHrefToIndex);
      if (spineMap.length > 0) return { chapterCount: spineMap.length, chapterSpineMap: spineMap };
    }
  }

  return { chapterCount: 0, chapterSpineMap: [] };
}

type MetaLike = string | { [key: string]: string | undefined };

interface LocalizedValue {
  text: string;
  lang: string;
  fileAs: string;
  id: string;
}

function toLocalizedValue(item: MetaLike): LocalizedValue {
  return typeof item === 'string'
    ? { text: decodeEntities(item), lang: '', fileAs: '', id: '' }
    : {
        text: decodeEntities(item['#text'] ?? ''),
        lang: item['@_xml:lang'] ?? '',
        fileAs: decodeEntities((item['@_file-as'] ?? item['@_opf:file-as'] ?? '').trim()),
        id: item['@_id'] ?? '',
      };
}

function pickLocalized(items: MetaLike[]): LocalizedValue {
  const candidates = items.map(toLocalizedValue);
  return (
    candidates.find((c) => c.lang.toLowerCase().startsWith('en')) ??
    candidates.find((c) => c.lang === '') ??
    candidates[0] ?? { text: '', lang: '', fileAs: '', id: '' }
  );
}

function pickLang(items: MetaLike[]): string {
  return pickLocalized(items).text;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
}

function inferScheme(value: string): string {
  const lower = value.toLowerCase();
  if (lower.startsWith('urn:isbn:') || lower.startsWith('isbn:')) return 'ISBN';
  if (value.startsWith('978') || value.startsWith('979')) return 'ISBN';
  if (lower.startsWith('urn:uuid:')) return 'UUID';
  return '';
}

export function parseEpub(filePath: string): EpubMeta {
  const zip = new AdmZip(filePath);
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseTagValue: false,
    isArray: (name) =>
      ['item', 'meta', 'dc:title', 'dc:creator', 'dc:identifier', 'dc:subject'].includes(name),
  });

  // Step 1: container.xml → OPF path
  const containerEntry = zip.getEntry('META-INF/container.xml');
  if (!containerEntry) throw new Error('Missing META-INF/container.xml');
  const containerXml = parser.parse(containerEntry.getData().toString('utf8'));
  const rootfiles = containerXml?.container?.rootfiles?.rootfile;
  const rootfileArr = Array.isArray(rootfiles) ? rootfiles : [rootfiles];
  const opfRelPath: string = rootfileArr[0]?.['@_full-path'];
  if (!opfRelPath) throw new Error('Cannot find OPF rootfile path in container.xml');

  // Step 2: read OPF
  const opfEntry = zip.getEntry(opfRelPath);
  if (!opfEntry) throw new Error(`Cannot find OPF file: ${opfRelPath}`);
  const opf = parser.parse(opfEntry.getData().toString('utf8'));
  const pkg = opf?.package ?? opf;
  const metadata = pkg?.metadata ?? {};
  const manifest: Array<{
    '@_id': string;
    '@_href': string;
    '@_media-type': string;
    '@_properties'?: string;
  }> = pkg?.manifest?.item ?? [];
  const opfDir = path.dirname(opfRelPath);

  // Build spine href → 0-based spine index map (used for chapter detection)
  const rawSpineRefs = pkg?.spine?.itemref ?? [];
  const spineItemRefs: Array<{ '@_idref': string }> = Array.isArray(rawSpineRefs)
    ? (rawSpineRefs as Array<{ '@_idref': string }>)
    : [rawSpineRefs as { '@_idref': string }];
  const hrefByManifestId = new Map<string, string>();
  for (const item of manifest) {
    hrefByManifestId.set(item['@_id'], item['@_href']);
  }
  const spineHrefToIndex = new Map<string, number>();
  for (let i = 0; i < spineItemRefs.length; i++) {
    const href = hrefByManifestId.get(spineItemRefs[i]['@_idref']);
    if (href) {
      spineHrefToIndex.set(opfDir === '.' ? href : `${opfDir}/${href}`, i);
    }
  }
  const { chapterCount, chapterSpineMap } = parseNavChapters(
    zip,
    opfDir,
    manifest,
    spineHrefToIndex
  );

  // Step 3: extract metadata
  const titleCandidate = pickLocalized(metadata['dc:title'] ?? []);
  const fallbackTitle = path.basename(filePath, path.extname(filePath));
  const title = titleCandidate.text || fallbackTitle;
  const creatorCandidate = pickLocalized(metadata['dc:creator'] ?? []);
  const author = creatorCandidate.text;

  const rawDesc = metadata['dc:description'];
  const description = decodeEntities(
    Array.isArray(rawDesc) ? pickLang(rawDesc) : typeof rawDesc === 'string' ? rawDesc : ''
  );

  const rawPublisher = metadata['dc:publisher'];
  const publisher = decodeEntities(
    (typeof rawPublisher === 'string'
      ? rawPublisher
      : typeof rawPublisher === 'object' && rawPublisher !== null
        ? ((rawPublisher as { '#text'?: string })['#text'] ?? '')
        : ''
    ).trim()
  );

  const rawIdentifiers = (metadata['dc:identifier'] ?? []) as MetaLike[];
  const identifiers = rawIdentifiers
    .map((item) => {
      const value = (typeof item === 'string' ? item : (item['#text'] ?? '')).trim();
      const schemeAttr = typeof item === 'object' ? ((item['@_opf:scheme'] as string) ?? '') : '';
      const scheme = schemeAttr || inferScheme(value);
      return { scheme, value };
    })
    .filter(({ value }) => value !== '');

  const rawSubjects = (metadata['dc:subject'] ?? []) as MetaLike[];
  const subjects = rawSubjects
    .map((item) => decodeEntities((typeof item === 'string' ? item : (item['#text'] ?? '')).trim()))
    .filter(Boolean);

  const metas: Array<{
    '@_name'?: string;
    '@_content'?: string;
    '@_property'?: string;
    '@_refines'?: string;
    '#text'?: string;
  }> = metadata?.meta ?? [];

  let calibreSeries = '';
  let calibreSeriesIndex = 0;
  let groupPosition = 0;
  const collectionCandidates: MetaLike[] = [];

  for (const m of metas) {
    if (m['@_name'] === 'calibre:series') calibreSeries = decodeEntities(m['@_content'] ?? '');
    if (m['@_name'] === 'calibre:series_index')
      calibreSeriesIndex = parseFloat(m['@_content'] ?? '0') || 0;
    if (m['@_property'] === 'belongs-to-collection') collectionCandidates.push(m);
    if (m['@_property'] === 'group-position') groupPosition = parseFloat(m['#text'] ?? '0') || 0;
  }

  const series = calibreSeries || pickLang(collectionCandidates);
  const seriesIndex = calibreSeriesIndex || groupPosition;

  // file-as: prefer dc:title attribute (EPUB 2 / Calibre), fall back to dc:creator file-as, then EPUB 3 <meta refines>
  const attrFileAs = titleCandidate.text ? titleCandidate.fileAs : '';
  const creatorFileAs = creatorCandidate.fileAs;
  const refinesMeta =
    !attrFileAs && !creatorFileAs && titleCandidate.id
      ? metas.find(
          (m) => m['@_property'] === 'file-as' && m['@_refines'] === `#${titleCandidate.id}`
        )
      : undefined;
  const fileAs =
    attrFileAs ||
    creatorFileAs ||
    (refinesMeta ? decodeEntities((refinesMeta['#text'] ?? '').trim()) : '');

  // Step 4: cover image
  let coverData: Buffer | null = null;
  let coverMime: string | null = null;

  let coverHref: string | undefined;
  // strategy 1: <meta name="cover"> → item id → href
  const coverMeta = metas.find((m) => m['@_name'] === 'cover');
  if (coverMeta?.['@_content']) {
    const coverId = coverMeta['@_content'];
    const item = manifest.find((i) => i['@_id'] === coverId);
    if (item) coverHref = item['@_href'];
  }
  // strategy 2: properties="cover-image"
  if (!coverHref) {
    const item = manifest.find((i) => i['@_properties'] === 'cover-image');
    if (item) coverHref = item['@_href'];
  }
  // strategy 3: href contains "cover" and is image
  if (!coverHref) {
    const item = manifest.find(
      (i) => i['@_href']?.toLowerCase().includes('cover') && i['@_media-type']?.startsWith('image/')
    );
    if (item) coverHref = item['@_href'];
  }

  if (coverHref) {
    // resolve relative to OPF directory
    const coverPath = opfDir === '.' ? coverHref : `${opfDir}/${coverHref}`;
    const coverEntry = zip.getEntry(coverPath) ?? zip.getEntry(coverHref);
    if (coverEntry) {
      coverData = coverEntry.getData();
      coverMime = manifest.find((i) => i['@_href'] === coverHref)?.['@_media-type'] ?? 'image/jpeg';
    }
  }

  return {
    title,
    fileAs,
    author,
    description,
    publisher,
    identifiers,
    subjects,
    series,
    seriesIndex,
    coverData,
    coverMime,
    chapterCount,
    chapterSpineMap,
  };
}

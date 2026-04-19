import * as fs from 'fs';
import * as crypto from 'crypto';
import * as path from 'path';
import AdmZip from 'adm-zip';
import { XMLParser } from 'fast-xml-parser';
import { EpubMeta } from '../types';

const PARTIAL_MD5_OFFSETS = [
  256, 1024, 4096, 16384, 65536, 262144, 1048576, 4194304, 16777216, 67108864, 268435456,
  1073741824,
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

type MetaLike = string | { [key: string]: string | undefined };

interface LocalizedValue {
  text: string;
  lang: string;
  fileAs: string;
  id: string;
}

function toLocalizedValue(item: MetaLike): LocalizedValue {
  return typeof item === 'string'
    ? { text: item, lang: '', fileAs: '', id: '' }
    : {
        text: item['#text'] ?? '',
        lang: item['@_xml:lang'] ?? '',
        fileAs: (item['@_file-as'] ?? item['@_opf:file-as'] ?? '').trim(),
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

export function parseEpub(filePath: string): EpubMeta {
  const zip = new AdmZip(filePath);
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: (name) => ['item', 'meta', 'dc:title', 'dc:creator'].includes(name),
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

  // Step 3: extract metadata
  const titleCandidate = pickLocalized(metadata['dc:title'] ?? []);
  const fallbackTitle = path.basename(filePath, path.extname(filePath));
  const title = titleCandidate.text || fallbackTitle;
  const author = pickLang(metadata['dc:creator'] ?? []);

  const rawDesc = metadata['dc:description'];
  const description = Array.isArray(rawDesc)
    ? pickLang(rawDesc)
    : typeof rawDesc === 'string'
      ? rawDesc
      : '';

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
    if (m['@_name'] === 'calibre:series') calibreSeries = m['@_content'] ?? '';
    if (m['@_name'] === 'calibre:series_index')
      calibreSeriesIndex = parseFloat(m['@_content'] ?? '0') || 0;
    if (m['@_property'] === 'belongs-to-collection') collectionCandidates.push(m);
    if (m['@_property'] === 'group-position') groupPosition = parseFloat(m['#text'] ?? '0') || 0;
  }

  const series = calibreSeries || pickLang(collectionCandidates);
  const seriesIndex = calibreSeriesIndex || groupPosition;

  // file-as: prefer attribute form (EPUB 2 / Calibre), fall back to EPUB 3 <meta refines>
  const attrFileAs = titleCandidate.text ? titleCandidate.fileAs : '';
  const refinesMeta =
    !attrFileAs && titleCandidate.id
      ? metas.find(
          (m) => m['@_property'] === 'file-as' && m['@_refines'] === `#${titleCandidate.id}`
        )
      : undefined;
  const fileAs = attrFileAs || (refinesMeta ? (refinesMeta['#text'] ?? '').trim() : '');

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
    const opfDir = path.dirname(opfRelPath);
    const coverPath = opfDir === '.' ? coverHref : `${opfDir}/${coverHref}`;
    const coverEntry = zip.getEntry(coverPath) ?? zip.getEntry(coverHref);
    if (coverEntry) {
      coverData = coverEntry.getData();
      coverMime = manifest.find((i) => i['@_href'] === coverHref)?.['@_media-type'] ?? 'image/jpeg';
    }
  }

  return { title, fileAs, author, description, series, seriesIndex, coverData, coverMime };
}

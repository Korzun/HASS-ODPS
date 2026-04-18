import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import AdmZip from 'adm-zip';
import { partialMD5, parseEpub } from '../app/services/EpubParser';

// Helper: build a minimal EPUB zip as a Buffer
function makeEpub(opts: {
  title?: string;
  author?: string;
  description?: string;
  series?: string;
  seriesIndex?: number;
  coverData?: Buffer;
  coverMime?: string;
} = {}): Buffer {
  const zip = new AdmZip();

  const containerXml = `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
  zip.addFile('META-INF/container.xml', Buffer.from(containerXml));

  const coverItem = opts.coverData
    ? `<item id="cover-img" href="cover.jpg" media-type="${opts.coverMime ?? 'image/jpeg'}"/>`
    : '';
  const coverMeta = opts.coverData ? `<meta name="cover" content="cover-img"/>` : '';
  const seriesMeta = opts.series
    ? `<meta name="calibre:series" content="${opts.series}"/><meta name="calibre:series_index" content="${opts.seriesIndex ?? 1}"/>`
    : '';

  const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    ${opts.title !== undefined ? `<dc:title>${opts.title}</dc:title>` : ''}
    ${opts.author !== undefined ? `<dc:creator>${opts.author}</dc:creator>` : ''}
    ${opts.description !== undefined ? `<dc:description>${opts.description}</dc:description>` : ''}
    ${coverMeta}
    ${seriesMeta}
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    ${coverItem}
  </manifest>
  <spine toc="ncx"/>
</package>`;
  zip.addFile('OEBPS/content.opf', Buffer.from(opf));

  if (opts.coverData) {
    zip.addFile('OEBPS/cover.jpg', opts.coverData);
  }

  return zip.toBuffer();
}

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'epub-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true });
});

describe('partialMD5', () => {
  it('returns a 32-char hex string', () => {
    const filePath = path.join(tmpDir, 'test.epub');
    fs.writeFileSync(filePath, makeEpub({ title: 'Test' }));
    const result = partialMD5(filePath);
    expect(result).toMatch(/^[0-9a-f]{32}$/);
  });

  it('is deterministic for same file content', () => {
    const buf = makeEpub({ title: 'Same' });
    const f1 = path.join(tmpDir, 'a.epub');
    const f2 = path.join(tmpDir, 'b.epub');
    fs.writeFileSync(f1, buf);
    fs.writeFileSync(f2, buf);
    expect(partialMD5(f1)).toBe(partialMD5(f2));
  });

  it('differs for different file content', () => {
    const f1 = path.join(tmpDir, 'a.epub');
    const f2 = path.join(tmpDir, 'b.epub');
    fs.writeFileSync(f1, makeEpub({ title: 'Book A' }));
    fs.writeFileSync(f2, makeEpub({ title: 'Book B' }));
    expect(partialMD5(f1)).not.toBe(partialMD5(f2));
  });

  it('works on tiny files (< 256 bytes)', () => {
    const filePath = path.join(tmpDir, 'tiny.epub');
    fs.writeFileSync(filePath, Buffer.from('tiny'));
    // Should not throw, should return 32-char hex
    expect(partialMD5(filePath)).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe('parseEpub', () => {
  it('parses title and author', () => {
    const filePath = path.join(tmpDir, 'book.epub');
    fs.writeFileSync(filePath, makeEpub({ title: 'My Title', author: 'Jane Doe' }));
    const meta = parseEpub(filePath);
    expect(meta.title).toBe('My Title');
    expect(meta.author).toBe('Jane Doe');
  });

  it('parses description', () => {
    const filePath = path.join(tmpDir, 'book.epub');
    fs.writeFileSync(filePath, makeEpub({ title: 'T', description: 'A great book.' }));
    const meta = parseEpub(filePath);
    expect(meta.description).toBe('A great book.');
  });

  it('parses calibre series and series index', () => {
    const filePath = path.join(tmpDir, 'book.epub');
    fs.writeFileSync(filePath, makeEpub({ title: 'T', series: 'Discworld', seriesIndex: 3 }));
    const meta = parseEpub(filePath);
    expect(meta.series).toBe('Discworld');
    expect(meta.seriesIndex).toBe(3);
  });

  it('returns empty defaults when fields absent', () => {
    const filePath = path.join(tmpDir, 'bare.epub');
    fs.writeFileSync(filePath, makeEpub({ title: 'Bare' }));
    const meta = parseEpub(filePath);
    expect(meta.author).toBe('');
    expect(meta.description).toBe('');
    expect(meta.series).toBe('');
    expect(meta.seriesIndex).toBe(0);
    expect(meta.coverData).toBeNull();
    expect(meta.coverMime).toBeNull();
  });

  it('falls back to filename stem when title absent', () => {
    const filePath = path.join(tmpDir, 'my-book.epub');
    fs.writeFileSync(filePath, makeEpub({}));
    const meta = parseEpub(filePath);
    expect(meta.title).toBe('my-book');
  });

  it('parses cover image', () => {
    const coverBuf = Buffer.from('fake-jpeg-data');
    const filePath = path.join(tmpDir, 'book.epub');
    fs.writeFileSync(filePath, makeEpub({ title: 'T', coverData: coverBuf, coverMime: 'image/jpeg' }));
    const meta = parseEpub(filePath);
    expect(meta.coverData).toEqual(coverBuf);
    expect(meta.coverMime).toBe('image/jpeg');
  });

  it('throws on malformed ZIP', () => {
    const filePath = path.join(tmpDir, 'bad.epub');
    fs.writeFileSync(filePath, Buffer.from('not a zip file'));
    expect(() => parseEpub(filePath)).toThrow();
  });
});

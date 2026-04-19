import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import AdmZip from 'adm-zip';
import { partialMD5, parseEpub } from './epub-parser';

// Helper: build a minimal EPUB zip as a Buffer
function makeEpub(
  opts: {
    title?: string;
    author?: string;
    description?: string;
    series?: string;
    seriesIndex?: number;
    coverData?: Buffer;
    coverMime?: string;
  } = {}
): Buffer {
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

  it('works on tiny files (< 1024 bytes)', () => {
    const filePath = path.join(tmpDir, 'tiny.epub');
    fs.writeFileSync(filePath, Buffer.from('tiny'));
    // Should not throw, should return 32-char hex
    expect(partialMD5(filePath)).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe('parseEpub', () => {
  const sharedContainerXml = `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

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
    expect(meta.fileAs).toBe('');
  });

  it('falls back to filename stem when title absent', () => {
    const filePath = path.join(tmpDir, 'my-book.epub');
    fs.writeFileSync(filePath, makeEpub({}));
    const meta = parseEpub(filePath);
    expect(meta.title).toBe('my-book');
  });

  it('parses title-level file-as from an attributed dc:title', () => {
    const zip = new AdmZip();
    zip.addFile('META-INF/container.xml', Buffer.from(sharedContainerXml));
    zip.addFile(
      'OEBPS/content.opf',
      Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title id="t1" file-as="Asimov, Isaac">I, Robot</dc:title>
  </metadata>
  <manifest/><spine/>
</package>`)
    );
    const filePath = path.join(tmpDir, 'irobot.epub');
    fs.writeFileSync(filePath, zip.toBuffer());

    const meta = parseEpub(filePath);

    expect(meta.title).toBe('I, Robot');
    expect(meta.fileAs).toBe('Asimov, Isaac');
  });

  it('returns an empty fileAs when the chosen title has no file-as attribute', () => {
    const filePath = path.join(tmpDir, 'plain-title.epub');
    fs.writeFileSync(filePath, makeEpub({ title: 'Plain Title' }));

    const meta = parseEpub(filePath);

    expect(meta.title).toBe('Plain Title');
    expect(meta.fileAs).toBe('');
  });

  it('parses file-as from an opf namespace attribute', () => {
    const zip = new AdmZip();
    zip.addFile('META-INF/container.xml', Buffer.from(sharedContainerXml));
    zip.addFile(
      'OEBPS/content.opf',
      Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title id="t1" opf:file-as="Asimov, Isaac">I, Robot</dc:title>
  </metadata>
  <manifest/><spine/>
</package>`)
    );
    const filePath = path.join(tmpDir, 'irobot-opf.epub');
    fs.writeFileSync(filePath, zip.toBuffer());

    const meta = parseEpub(filePath);

    expect(meta.title).toBe('I, Robot');
    expect(meta.fileAs).toBe('Asimov, Isaac');
  });

  it('parses file-as from an EPUB 3 <meta refines> element', () => {
    const zip = new AdmZip();
    zip.addFile('META-INF/container.xml', Buffer.from(sharedContainerXml));
    zip.addFile(
      'OEBPS/content.opf',
      Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title id="t1">Foundation</dc:title>
    <meta refines="#t1" property="file-as">Asimov, Isaac</meta>
  </metadata>
  <manifest/><spine/>
</package>`)
    );
    const filePath = path.join(tmpDir, 'foundation-refines.epub');
    fs.writeFileSync(filePath, zip.toBuffer());

    const meta = parseEpub(filePath);

    expect(meta.title).toBe('Foundation');
    expect(meta.fileAs).toBe('Asimov, Isaac');
  });

  it('parses cover image', () => {
    const coverBuf = Buffer.from('fake-jpeg-data');
    const filePath = path.join(tmpDir, 'book.epub');
    fs.writeFileSync(
      filePath,
      makeEpub({ title: 'T', coverData: coverBuf, coverMime: 'image/jpeg' })
    );
    const meta = parseEpub(filePath);
    expect(meta.coverData).toEqual(coverBuf);
    expect(meta.coverMime).toBe('image/jpeg');
  });

  it('throws on malformed ZIP', () => {
    const filePath = path.join(tmpDir, 'bad.epub');
    fs.writeFileSync(filePath, Buffer.from('not a zip file'));
    expect(() => parseEpub(filePath)).toThrow();
  });

  it('parses title as string when dc:title elements have xml attributes', () => {
    // EPUB3 books often have multiple <dc:title id="..."> elements.
    // fast-xml-parser returns each attributed element as an object like
    // { "@_id": "t1", "#text": "Death's End" } — the title must still be a string.
    const zip = new AdmZip();
    zip.addFile('META-INF/container.xml', Buffer.from(sharedContainerXml));
    zip.addFile(
      'OEBPS/content.opf',
      Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title id="t1">Death's End</dc:title>
    <dc:title id="t2">死亡终结</dc:title>
  </metadata>
  <manifest/><spine/>
</package>`)
    );
    const filePath = path.join(tmpDir, 'deaths-end.epub');
    fs.writeFileSync(filePath, zip.toBuffer());
    const meta = parseEpub(filePath);
    expect(typeof meta.title).toBe('string');
    expect(meta.title).toBe("Death's End");
  });

  it('picks english title when non-english variant appears first', () => {
    const zip = new AdmZip();
    zip.addFile('META-INF/container.xml', Buffer.from(sharedContainerXml));
    zip.addFile(
      'OEBPS/content.opf',
      Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title xml:lang="zh">死亡终结</dc:title>
    <dc:title xml:lang="en">Death's End</dc:title>
  </metadata>
  <manifest/><spine/>
</package>`)
    );
    const filePath = path.join(tmpDir, 'lang-title-en-last.epub');
    fs.writeFileSync(filePath, zip.toBuffer());
    const meta = parseEpub(filePath);
    expect(meta.title).toBe("Death's End");
  });

  it('falls back to no-lang title when english is absent', () => {
    const zip = new AdmZip();
    zip.addFile('META-INF/container.xml', Buffer.from(sharedContainerXml));
    zip.addFile(
      'OEBPS/content.opf',
      Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Untranslated Title</dc:title>
    <dc:title xml:lang="zh">中文标题</dc:title>
  </metadata>
  <manifest/><spine/>
</package>`)
    );
    const filePath = path.join(tmpDir, 'lang-title-nolang.epub');
    fs.writeFileSync(filePath, zip.toBuffer());
    const meta = parseEpub(filePath);
    expect(meta.title).toBe('Untranslated Title');
  });

  it('falls back to first title when no english or no-lang variant exists', () => {
    const zip = new AdmZip();
    zip.addFile('META-INF/container.xml', Buffer.from(sharedContainerXml));
    zip.addFile(
      'OEBPS/content.opf',
      Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title xml:lang="de">Der Dunkle Wald</dc:title>
    <dc:title xml:lang="zh">黑暗森林</dc:title>
  </metadata>
  <manifest/><spine/>
</package>`)
    );
    const filePath = path.join(tmpDir, 'lang-title-allforeign.epub');
    fs.writeFileSync(filePath, zip.toBuffer());
    const meta = parseEpub(filePath);
    expect(meta.title).toBe('Der Dunkle Wald');
  });

  it('picks english author when non-english variant appears first', () => {
    const zip = new AdmZip();
    zip.addFile('META-INF/container.xml', Buffer.from(sharedContainerXml));
    zip.addFile(
      'OEBPS/content.opf',
      Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Test</dc:title>
    <dc:creator xml:lang="zh">刘慈欣</dc:creator>
    <dc:creator xml:lang="en">Liu Cixin</dc:creator>
  </metadata>
  <manifest/><spine/>
</package>`)
    );
    const filePath = path.join(tmpDir, 'lang-author-en-last.epub');
    fs.writeFileSync(filePath, zip.toBuffer());
    const meta = parseEpub(filePath);
    expect(meta.author).toBe('Liu Cixin');
  });

  it('falls back to no-lang author when english is absent', () => {
    const zip = new AdmZip();
    zip.addFile('META-INF/container.xml', Buffer.from(sharedContainerXml));
    zip.addFile(
      'OEBPS/content.opf',
      Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Test</dc:title>
    <dc:creator>Liu Cixin</dc:creator>
    <dc:creator xml:lang="zh">刘慈欣</dc:creator>
  </metadata>
  <manifest/><spine/>
</package>`)
    );
    const filePath = path.join(tmpDir, 'lang-author-nolang.epub');
    fs.writeFileSync(filePath, zip.toBuffer());
    const meta = parseEpub(filePath);
    expect(meta.author).toBe('Liu Cixin');
  });

  it('falls back to first author when no english or no-lang variant exists', () => {
    const zip = new AdmZip();
    zip.addFile('META-INF/container.xml', Buffer.from(sharedContainerXml));
    zip.addFile(
      'OEBPS/content.opf',
      Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Test</dc:title>
    <dc:creator xml:lang="zh">刘慈欣</dc:creator>
    <dc:creator xml:lang="ja">劉慈欣</dc:creator>
  </metadata>
  <manifest/><spine/>
</package>`)
    );
    const filePath = path.join(tmpDir, 'lang-author-allforeign.epub');
    fs.writeFileSync(filePath, zip.toBuffer());
    const meta = parseEpub(filePath);
    expect(meta.author).toBe('刘慈欣');
  });

  it('picks english series from multilingual belongs-to-collection', () => {
    const zip = new AdmZip();
    zip.addFile('META-INF/container.xml', Buffer.from(sharedContainerXml));
    zip.addFile(
      'OEBPS/content.opf',
      Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Test</dc:title>
    <meta id="collection-en" property="belongs-to-collection" xml:lang="en">Remembrance of Earth's Past</meta>
    <meta id="collection-zh" property="belongs-to-collection" xml:lang="zh-Hans">地球往事</meta>
    <meta property="collection-type">series</meta>
  </metadata>
  <manifest/><spine/>
</package>`)
    );
    const filePath = path.join(tmpDir, 'lang-series-en.epub');
    fs.writeFileSync(filePath, zip.toBuffer());
    const meta = parseEpub(filePath);
    expect(meta.series).toBe("Remembrance of Earth's Past");
  });

  it('falls back to only available series when no english belongs-to-collection exists', () => {
    const zip = new AdmZip();
    zip.addFile('META-INF/container.xml', Buffer.from(sharedContainerXml));
    zip.addFile(
      'OEBPS/content.opf',
      Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Test</dc:title>
    <meta id="collection-zh" property="belongs-to-collection" xml:lang="zh-Hans">地球往事</meta>
    <meta property="collection-type">series</meta>
  </metadata>
  <manifest/><spine/>
</package>`)
    );
    const filePath = path.join(tmpDir, 'lang-series-zh-only.epub');
    fs.writeFileSync(filePath, zip.toBuffer());
    const meta = parseEpub(filePath);
    expect(meta.series).toBe('地球往事');
  });

  it('prefers calibre:series over multilingual belongs-to-collection', () => {
    const zip = new AdmZip();
    zip.addFile('META-INF/container.xml', Buffer.from(sharedContainerXml));
    zip.addFile(
      'OEBPS/content.opf',
      Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Test</dc:title>
    <meta name="calibre:series" content="Three Body"/>
    <meta name="calibre:series_index" content="1"/>
    <meta id="collection-en" property="belongs-to-collection" xml:lang="en">Remembrance of Earth's Past</meta>
    <meta id="collection-zh" property="belongs-to-collection" xml:lang="zh-Hans">地球往事</meta>
  </metadata>
  <manifest/><spine/>
</package>`)
    );
    const filePath = path.join(tmpDir, 'lang-series-calibre-wins.epub');
    fs.writeFileSync(filePath, zip.toBuffer());
    const meta = parseEpub(filePath);
    expect(meta.series).toBe('Three Body');
    expect(meta.seriesIndex).toBe(1);
  });
});

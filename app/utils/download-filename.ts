const ILLEGAL_FS_CHARS = /[/\\:*?"<>|]/g;
// Excludes tab (\x09) and other common whitespace (\x0a\x0d) so they survive to WHITESPACE_RUN collapsing
const CONTROL_CHARS = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g;
const WHITESPACE_RUN = /\s+/g;
const LEADING_TRAILING = /^[_.]+|[_.]+$/g;

function sanitizeField(input: string): string {
  return input
    .replace(CONTROL_CHARS, '')
    .replace(ILLEGAL_FS_CHARS, '')
    .replace(WHITESPACE_RUN, ' ')
    .trim()
    .replace(/ /g, '_')
    .replace(LEADING_TRAILING, '');
}

function formatSeriesIndex(n: number): string {
  return Number(n).toString().replace('.', '_');
}

export function downloadFilename(book: {
  author: string;
  series: string;
  seriesIndex: number;
  title: string;
}): string {
  const author = sanitizeField(book.author.trim()) || 'Unknown';
  const title = sanitizeField(book.title.trim()) || 'Unknown';
  const series = sanitizeField(book.series.trim());

  if (series === '') {
    return `${author}-${title}.epub`;
  }

  const index = sanitizeField(formatSeriesIndex(book.seriesIndex));
  return `${author}-${series}-${index}-${title}.epub`;
}

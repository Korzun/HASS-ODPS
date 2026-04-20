import { formatSize, relativeTime } from './utils';

describe('formatSize', () => {
  it('formats bytes', () => expect(formatSize(500)).toBe('500 B'));
  it('formats kilobytes', () => expect(formatSize(1536)).toBe('1.5 KB'));
  it('formats megabytes', () => expect(formatSize(1_048_576)).toBe('1.0 MB'));
});

describe('relativeTime', () => {
  it('returns "just now" for less than 60 seconds', () => {
    const ts = Math.floor(Date.now() / 1000) - 30;
    expect(relativeTime(ts)).toBe('just now');
  });
  it('returns minutes ago', () => {
    const ts = Math.floor(Date.now() / 1000) - 120;
    expect(relativeTime(ts)).toBe('2m ago');
  });
  it('returns hours ago', () => {
    const ts = Math.floor(Date.now() / 1000) - 7200;
    expect(relativeTime(ts)).toBe('2h ago');
  });
  it('returns days ago', () => {
    const ts = Math.floor(Date.now() / 1000) - 172_800;
    expect(relativeTime(ts)).toBe('2d ago');
  });
});

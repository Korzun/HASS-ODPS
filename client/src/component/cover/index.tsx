import { useStyle } from './style';

interface CoverProps {
  bookId: string | null;
  title?: string;
  sequence: 1 | 2 | 3;
  width: number;
  height: number;
}

export function Cover({ bookId, title, sequence, width, height }: CoverProps) {
  const style = useStyle({ sequence, height, width, isGhost: !bookId });
  return bookId ? (
    <img
      src={`/api/books/${encodeURIComponent(bookId)}/cover`}
      alt={title ?? ''}
      className={`${style.layer} ${style.coverImg}`}
    />
  ) : (
    <div className={`${style.layer} ${style.ghost}`} />
  );
}

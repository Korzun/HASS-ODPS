import { useStyle } from './style';

const SEQUENCE_STYLES: Record<
  1 | 2 | 3,
  { left: number; top: number; rotate: string; zIndex: number; ghostOpacity: number }
> = {
  1: { left: 10, top: 5, rotate: '-6deg', zIndex: 1, ghostOpacity: 0.3 },
  2: { left: 5, top: 2, rotate: '-2deg', zIndex: 2, ghostOpacity: 0.45 },
  3: { left: 0, top: 0, rotate: '0deg', zIndex: 3, ghostOpacity: 0.45 },
};

interface CoverProps {
  bookId: string | null;
  title?: string;
  sequence: 1 | 2 | 3;
  width: number;
  height: number;
}

export function Cover({ bookId, title, sequence, width, height }: CoverProps) {
  const style = useStyle();
  const { left, top, rotate, zIndex, ghostOpacity } = SEQUENCE_STYLES[sequence];
  const dynamicStyle: React.CSSProperties = {
    position: 'absolute',
    left,
    top,
    width,
    height,
    transform: `rotate(${rotate})`,
    zIndex,
    opacity: bookId ? 1 : ghostOpacity,
  };

  if (bookId) {
    return (
      <img
        src={`/api/books/${encodeURIComponent(bookId)}/cover`}
        alt={title ?? ''}
        className={`${style.layer} ${style.coverImg}`}
        style={dynamicStyle}
      />
    );
  }
  return <div className={`${style.layer} ${style.ghost}`} style={dynamicStyle} />;
}

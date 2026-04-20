import type { Book } from '../../../types';

export interface StackOffset {
  left: number;
  top: number;
  rotate: string;
}

export const LIST_STACK_OFFSETS: StackOffset[] = [
  { left: 10, top: 5, rotate: '-6deg' },  // back
  { left: 5, top: 2, rotate: '-2deg' },   // middle
  { left: 0, top: 0, rotate: '0deg' },    // front
];

export const HERO_STACK_OFFSETS: StackOffset[] = [
  { left: 13, top: 6, rotate: '-6deg' },
  { left: 6, top: 3, rotate: '-2deg' },
  { left: 0, top: 0, rotate: '0deg' },
];

interface CoverStackProps {
  books: Book[];          // sorted ascending by seriesIndex; books[0] renders in front
  containerWidth: number;
  containerHeight: number;
  layerWidth: number;
  layerHeight: number;
  offsets: StackOffset[]; // [back, middle, front]
}

export function CoverStack({
  books,
  containerWidth,
  containerHeight,
  layerWidth,
  layerHeight,
  offsets,
}: CoverStackProps) {
  // offsets[0]=back → books[last], offsets[last]=front → books[0]
  const layers: (Book | null)[] = offsets.map((_, i) => books[offsets.length - 1 - i] ?? null);

  return (
    <figure style={{ position: 'relative', width: containerWidth, height: containerHeight, flexShrink: 0, margin: 0, padding: 0 }}>
      <div style={{ position: 'absolute', inset: 0 }}>
        {offsets.map((pos, i) => {
          const book = layers[i];
          const isGhost = !book;
          const opacity = isGhost ? (i === 0 ? 0.3 : 0.45) : 1;
          const base: React.CSSProperties = {
            position: 'absolute',
            left: pos.left,
            top: pos.top,
            width: layerWidth,
            height: layerHeight,
            borderRadius: 2,
            transform: `rotate(${pos.rotate})`,
            zIndex: i + 1,
            opacity,
            boxShadow: '1px 1px 3px rgba(0,0,0,.18)',
          };
          if (book?.hasCover) {
            return (
              <img
                key={book.id}
                src={`/api/books/${encodeURIComponent(book.id)}/cover`}
                alt={book.title}
                style={{ ...base, objectFit: 'cover', display: 'block' }}
              />
            );
          }
          return <div key={`ghost-${i}`} style={{ ...base, background: '#d1d5db' }} />;
        })}
      </div>
    </figure>
  );
}

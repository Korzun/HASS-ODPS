import { useStyle } from './style';
import { formatSize } from '../../../utils';
import type { Book } from '../../../types';

interface BookCardProps {
  book: Book;
  progress?: number;      // 0–1; undefined = no reading data
  isAdmin: boolean;
  compact?: boolean;      // true → 32×46px covers (series-page); false → 40×56px (standalone)
  onDelete: (id: string, title: string) => void;
  onClearProgress: (id: string) => void;
  onClick: (id: string) => void;
}

const COVER_W = { compact: 32, default: 40 } as const;
const COVER_H = { compact: 46, default: 56 } as const;

export function BookCard({
  book,
  progress,
  isAdmin,
  compact = false,
  onDelete,
  onClearProgress,
  onClick,
}: BookCardProps) {
  const styles = useStyle();
  const coverW = compact ? COVER_W.compact : COVER_W.default;
  const coverH = compact ? COVER_H.compact : COVER_H.default;

  return (
    <div
      className={styles.root}
      role="button"
      tabIndex={0}
      onClick={() => onClick(book.id)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick(book.id); }}
    >
      <div className={styles.cover}>
        {book.hasCover ? (
          <img
            src={`/api/books/${encodeURIComponent(book.id)}/cover`}
            alt={book.title}
            style={{ width: coverW, height: coverH, objectFit: 'cover', borderRadius: 2, display: 'block' }}
          />
        ) : (
          <div style={{ width: coverW, height: coverH, background: '#e0e0e0', borderRadius: 2 }} />
        )}
      </div>
      <div className={styles.info}>
        <div className={styles.title}>{book.title}</div>
        {book.author.length > 0 && <div className={styles.meta}>{book.author}</div>}
        <div className={styles.format}>
          {compact && book.series && book.seriesIndex > 0 ? `#${book.seriesIndex} · ` : ''}
          EPUB · {formatSize(book.size)}
        </div>
      </div>
      {progress != null && (
        <span className={styles.progress}>{Math.round(progress * 100)}%</span>
      )}
      {progress != null && !isAdmin && (
        <button
          type="button"
          className={styles.clearBtn}
          title="Clear reading status"
          onClick={e => { e.stopPropagation(); onClearProgress(book.id); }}
        >
          Clear
        </button>
      )}
      {isAdmin && (
        <button
          type="button"
          className={styles.deleteBtn}
          title="Delete"
          onClick={e => { e.stopPropagation(); onDelete(book.id, book.title); }}
        >
          🗑
        </button>
      )}
    </div>
  );
}

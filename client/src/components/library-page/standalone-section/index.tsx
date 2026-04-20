import { useState } from 'react';
import { BookCard } from '../../shared/book-card';
import { useStyle } from './style';
import type { Book } from '../../../types';

interface StandaloneSectionProps {
  books: Book[];
  progressMap: Map<string, number>;
  isAdmin: boolean;
  onDelete: (id: string, title: string) => void;
  onClearProgress: (id: string) => void;
  onBookClick: (id: string) => void;
}

export function StandaloneSection({
  books,
  progressMap,
  isAdmin,
  onDelete,
  onClearProgress,
  onBookClick,
}: StandaloneSectionProps) {
  const styles = useStyle();
  const [open, setOpen] = useState(true);

  return (
    <div className={styles.root}>
      <div
        className={styles.header}
        role="button"
        tabIndex={0}
        onClick={() => setOpen(o => !o)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o); } }}
      >
        <span className={styles.chevron}>{open ? '▼' : '▶'}</span>
        <span className={styles.label}>Standalone Books</span>
        <span className={styles.count}>{books.length} book{books.length !== 1 ? 's' : ''}</span>
      </div>
      {open && (
        <div>
          {books.map(book => (
            <BookCard
              key={book.id}
              book={book}
              progress={progressMap.get(book.id)}
              isAdmin={isAdmin}
              onDelete={onDelete}
              onClearProgress={onClearProgress}
              onClick={onBookClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

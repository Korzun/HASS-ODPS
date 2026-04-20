import { SeriesRow } from '../series-row';
import { StandaloneSection } from '../standalone-section';
import { useStyle } from './style';
import type { Book } from '../../../types';

interface GroupedBooks {
  series: [string, Book[]][];
  standalone: Book[];
}

function groupBooks(books: Book[]): GroupedBooks {
  const seriesMap = new Map<string, Book[]>();
  const standalone: Book[] = [];
  for (const book of books) {
    if (book.series.length > 0) {
      if (!seriesMap.has(book.series)) seriesMap.set(book.series, []);
      seriesMap.get(book.series)!.push(book);
    } else {
      standalone.push(book);
    }
  }
  for (const bks of seriesMap.values()) {
    bks.sort((a, b) => a.seriesIndex - b.seriesIndex);
  }
  const sortedSeries = [...seriesMap.entries()].sort(([a], [b]) => a.localeCompare(b));
  standalone.sort((a, b) => a.title.localeCompare(b.title));
  return { series: sortedSeries, standalone };
}

interface BookListProps {
  books: Book[];
  progressMap: Map<string, number>;
  isAdmin: boolean;
  onDelete: (id: string, title: string) => void;
  onClearProgress: (id: string) => void;
  onBookClick: (id: string) => void;
  onSeriesClick: (name: string) => void;
}

export function BookList({
  books,
  progressMap,
  isAdmin,
  onDelete,
  onClearProgress,
  onBookClick,
  onSeriesClick,
}: BookListProps) {
  const styles = useStyle();

  if (books.length === 0) {
    return <p className={styles.empty}>No books yet. Upload some above.</p>;
  }

  const { series, standalone } = groupBooks(books);

  return (
    <div>
      {series.map(([name, bks]) => (
        <SeriesRow
          key={name}
          seriesName={name}
          books={bks}
          progressMap={progressMap}
          onClick={onSeriesClick}
        />
      ))}
      {standalone.length > 0 && (
        <StandaloneSection
          books={standalone}
          progressMap={progressMap}
          isAdmin={isAdmin}
          onDelete={onDelete}
          onClearProgress={onClearProgress}
          onBookClick={onBookClick}
        />
      )}
    </div>
  );
}

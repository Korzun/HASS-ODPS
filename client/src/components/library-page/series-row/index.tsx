import { CoverStack, LIST_STACK_OFFSETS } from '../../series-page/cover-stack';
import { useStyle } from './style';
import type { Book } from '../../../types';

interface SeriesRowProps {
  seriesName: string;
  books: Book[];          // sorted ascending by seriesIndex; books[0] = front cover
  progressMap: Map<string, number>;
  onClick: (name: string) => void;
}

function seriesProgressPct(books: Book[], progressMap: Map<string, number>): number | null {
  if (!books.some(b => progressMap.has(b.id))) return null;
  const avg = books.reduce((sum, b) => sum + (progressMap.get(b.id) ?? 0), 0) / books.length;
  return Math.round(avg * 100);
}

export function SeriesRow({ seriesName, books, progressMap, onClick }: SeriesRowProps) {
  const styles = useStyle();
  const author = books[0]?.author ?? '';
  const count = books.length;
  const pct = seriesProgressPct(books, progressMap);

  return (
    <div
      className={styles.root}
      role="button"
      tabIndex={0}
      onClick={() => onClick(seriesName)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick(seriesName); }}
    >
      <CoverStack
        books={books}
        containerWidth={58}
        containerHeight={74}
        layerWidth={44}
        layerHeight={62}
        offsets={LIST_STACK_OFFSETS}
      />
      <div className={styles.info}>
        <div className={styles.name}>{seriesName}</div>
        <div className={styles.meta}>
          {author.length > 0 ? `${author} · ` : ''}
          {count} book{count !== 1 ? 's' : ''}
          {pct != null && <span className={styles.progress}> · {pct}%</span>}
        </div>
        <div className={styles.link}>View series →</div>
      </div>
    </div>
  );
}

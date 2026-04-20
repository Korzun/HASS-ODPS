import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBooks, deleteBook } from '../../api/books';
import { getMyProgress, deleteMyProgress } from '../../api/progress';
import { useAuth } from '../../auth/auth-provider';
import { CoverStack, HERO_STACK_OFFSETS } from './cover-stack';
import { BookCard } from '../shared/book-card';
import { useStyle } from './style';
import type { Book } from '../../types';

export function SeriesPage() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const styles = useStyle();
  const [books, setBooks] = useState<Book[]>([]);
  const [progressMap, setProgressMap] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [allBooks, progress] = await Promise.all([getBooks(), getMyProgress()]);
      const seriesBooks = allBooks
        .filter(b => b.series === name)
        .sort((a, b) => a.seriesIndex - b.seriesIndex);
      setBooks(seriesBooks);
      setProgressMap(new Map(progress.map(p => [p.document, p.percentage])));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [name]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <p className={styles.loading}>Loading…</p>;
  if (!name || books.length === 0) return <p className={styles.notFound}>Series not found.</p>;

  const author = books[0].author;

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"?`)) return;
    await deleteBook(id);
    void load();
  }

  async function handleClearProgress(id: string) {
    await deleteMyProgress(id);
    void load();
  }

  return (
    <div className={styles.root}>
      <button
        type="button"
        className={styles.backBtn}
        onClick={() => navigate('/')}
        aria-label="Back to Library"
      >
        ← Library
      </button>
      <div className={styles.hero}>
        <CoverStack
          books={books}
          containerWidth={68}
          containerHeight={86}
          layerWidth={52}
          layerHeight={72}
          offsets={HERO_STACK_OFFSETS}
        />
        <div className={styles.heroInfo}>
          <h1 className={styles.title}>{name}</h1>
          <div className={styles.meta}>
            {author} · {books.length} book{books.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
      <h2 className={styles.readingOrderLabel}>Reading Order</h2>
      <div className={styles.bookList}>
        {books.map(book => (
          <BookCard
            key={book.id}
            book={book}
            progress={progressMap.get(book.id)}
            isAdmin={isAdmin}
            compact
            onDelete={(id, title) => void handleDelete(id, title)}
            onClearProgress={(id) => void handleClearProgress(id)}
            onClick={(id) => navigate(`/books/${encodeURIComponent(id)}`)}
          />
        ))}
      </div>
    </div>
  );
}

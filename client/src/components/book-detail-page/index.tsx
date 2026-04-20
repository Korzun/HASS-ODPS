import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBook } from '../../api/books';
import { useAuth } from '../../auth/auth-provider';
import { formatSize } from '../../utils';
import { useStyle } from './style';
import type { Book } from '../../types';

export function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const styles = useStyle();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    getBook(id)
      .then(setBook)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className={styles.loading}>Loading…</p>;
  if (notFound || !book) return <p className={styles.notFound}>Book not found.</p>;

  const addedDate = new Date(book.addedAt).toLocaleDateString();

  return (
    <div className={styles.root}>
      <button
        type="button"
        className={styles.backBtn}
        onClick={() => navigate('/')}
      >
        ← Library
      </button>
      <div className={styles.detail}>
        {book.hasCover ? (
          <img
            className={styles.coverImg}
            src={`/api/books/${encodeURIComponent(book.id)}/cover`}
            alt={book.title}
            width={80}
            height={114}
          />
        ) : (
          <div className={styles.coverPlaceholder} />
        )}
        <div className={styles.info}>
          <h1 className={styles.title}>{book.title}</h1>
          {book.author.length > 0 && (
            <div className={styles.author}>{book.author}</div>
          )}
          {book.series.length > 0 && (
            <div className={styles.series}>
              {book.series}{book.seriesIndex > 0 ? ` #${book.seriesIndex}` : ''}
            </div>
          )}
          {book.publisher.length > 0 && (
            <div className={styles.meta}>{book.publisher}</div>
          )}
          <div className={styles.meta}>EPUB · {formatSize(book.size)}</div>
          <div className={styles.meta}>Added {addedDate}</div>
          {isAdmin && (
            <button
              type="button"
              className={styles.editBtn}
              onClick={() => navigate(`/books/${encodeURIComponent(book.id)}/edit`)}
            >
              Edit Metadata
            </button>
          )}
        </div>
      </div>
      {book.description && (
        <p className={styles.description}>{book.description}</p>
      )}
      {book.subjects.length > 0 && (
        <div className={styles.subjects}>
          {book.subjects.map(s => (
            <span key={s} className={styles.pill}>{s}</span>
          ))}
        </div>
      )}
      {book.identifiers.length > 0 && (
        <div className={styles.identifiers}>
          {book.identifiers.map(({ scheme, value }) => (
            <div key={scheme} className={styles.identifier}>
              <span className={styles.scheme}>{scheme}</span>: {value}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

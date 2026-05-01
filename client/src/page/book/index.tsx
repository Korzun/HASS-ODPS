import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Page } from '../../component/page';
import { Button } from '../../control/button';
import { BreadcrumbList } from '../../panel/breadcrumb-list';
import { NavigationPanel } from '../../panel/navigation';
import { useIsAdmin } from '../../provider/auth';
import { useBook } from '../../provider/book';
import * as path from '../../router/path';
import { formatSize } from '../../utils';

import { useStyle } from './style';

export const BookPage = () => {
  const styles = useStyle();

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isAdmin] = useIsAdmin();

  const [book, loading, error] = useBook(id!);

  const handleEditMetadata = useCallback(() => navigate(path.bookEdit(book?.id ?? '')), [book]);

  if (loading) return <p className={styles.loading}>Loading…</p>;
  if (error) return <p className={styles.notFound}>Book not found.</p>;

  const addedDate = new Date(book.addedAt).toLocaleDateString();

  return (
    <Page>
      <NavigationPanel active="library" />
      <BreadcrumbList
        currentTitle={book.title}
        previous={book.series ? [{ path: path.series(book.series), text: book.series }] : []}
      />
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
          {book.author.length > 0 && <div className={styles.author}>{book.author}</div>}
          {book.series.length > 0 && (
            <div className={styles.series}>
              {book.series}
              {book.seriesIndex > 0 ? ` #${book.seriesIndex}` : ''}
            </div>
          )}
          {book.publisher.length > 0 && <div className={styles.meta}>{book.publisher}</div>}
          <div className={styles.meta}>EPUB · {formatSize(book.size)}</div>
          <div className={styles.meta}>Added {addedDate}</div>
          {isAdmin && <Button onClick={handleEditMetadata} text="Edit Metadata" />}
        </div>
      </div>
      {book.description && <p className={styles.description}>{book.description}</p>}
      {book.subjects.length > 0 && (
        <div className={styles.subjects}>
          {book.subjects.map((s) => (
            <span key={s} className={styles.pill}>
              {s}
            </span>
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
    </Page>
  );
};

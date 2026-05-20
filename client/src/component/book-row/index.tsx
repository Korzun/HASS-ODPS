import cx from 'classnames';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { useBook } from '~/provider/book';
import { path } from '~/router';

import { CardRow } from '../card-row';

import { useStyle } from './style';

interface BookRowProps {
  asCard?: boolean;
  bookId: string;
  showAuthor?: boolean;
}

export function BookRow({ asCard = true, bookId, showAuthor = true }: BookRowProps) {
  const styles = useStyle();
  const navigate = useNavigate();

  const [book, loading, error] = useBook(bookId);

  const handleNavigate = useCallback(() => {
    if (!book) {
      return;
    }
    navigate(path.book(book.id));
  }, [book, navigate]);

  if (loading) {
    const loadingContent = <div className={styles.root}>Loading...</div>;
    return asCard ? <CardRow>{loadingContent}</CardRow> : { loadingContent };
  }

  if (error) {
    const errorContent = <div className={styles.root}>Error loading book</div>;
    return asCard ? <CardRow>{errorContent}</CardRow> : errorContent;
  }

  const content = (
    <div
      className={cx(styles.root, { [styles.navigate]: !asCard })}
      onClick={!asCard ? handleNavigate : undefined}
    >
      <div className={styles.cover}>
        {book.hasCover ? (
          <img
            src={`/api/books/${encodeURIComponent(book.id)}/cover?width=60`}
            alt={book.title}
            className={styles.coverImg}
          />
        ) : (
          <div className={styles.coverPlaceholder} />
        )}
      </div>
      <div className={styles.info}>
        <div className={styles.title}>{book.title}</div>
        {showAuthor && book.author && <div className={styles.meta}>{book.author}</div>}
        {book.seriesIndex > 0 && <div className={styles.meta}>Book {book.seriesIndex}</div>}
      </div>
    </div>
  );

  return asCard ? <CardRow onClick={handleNavigate}>{content}</CardRow> : content;
}

import { useCallback, useState, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';

import { ConfirmModal } from '~/control';
import { useBook } from '~/provider/book';
import { useMyProgress } from '~/provider/progress';
import { path } from '~/router';

import { CardRow } from '../card-row';

import { useStyle } from './style';

interface BookRowProps {
  bookId: string;
  showAuthor?: boolean;
}

export function BookRow({ bookId, showAuthor = true }: BookRowProps) {
  const styles = useStyle();
  const navigate = useNavigate();

  const [book, loading, error] = useBook(bookId);

  // const [showDeleteProgressModal, setShowDeleteProgressModal] = useState<boolean>(false);
  // const handleDeleteProgress = useCallback(() => {
  //   if (!book) {
  //     return;
  //   }
  //   setShowDeleteProgressModal(true);
  // }, [book]);
  // const handleDeleteProgressCancel = useCallback(() => {
  //   setShowDeleteProgressModal(false);
  // }, []);
  // const handleDeleteProgressConfirm = useCallback(() => {
  //   setShowDeleteProgressModal(false);
  //   if (!book) {
  //     return;
  //   }
  //   // deleteBook(book.id);
  // }, [book]);

  const handleNavigate = useCallback(() => {
    if (!book) {
      return;
    }
    navigate(path.book(book.id));
  }, [book, navigate]);

  if (loading) {
    return (
      <CardRow onClick={handleNavigate}>
        <div className={styles.root}>Loading...</div>
      </CardRow>
    );
  }

  if (error) {
    return (
      <CardRow onClick={handleNavigate}>
        <div className={styles.root}>Error loading book</div>
      </CardRow>
    );
  }

  return (
    <Fragment>
      <CardRow onClick={handleNavigate}>
        <div className={styles.root}>
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
      </CardRow>
      {/*<ConfirmModal
        isOpen={showDeleteProgressModal}
        onCancel={handleDeleteProgressCancel}
        onConfirm={handleDeleteProgressConfirm}
        danger
        title={`Delete reading progress?`}
        confirmText="Delete"
      >
        Your progress, notes, and highlights for “{book.title}” will be permanently deleted. This
        action cannot be undone.
      </ConfirmModal>*/}
    </Fragment>
  );
}

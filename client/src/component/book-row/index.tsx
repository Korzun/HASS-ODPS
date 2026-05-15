import { useCallback, useState, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, ConfirmModal } from '~/control';
import { useIsAdmin } from '~/provider/auth';
import { useBook, useDeleteBook } from '~/provider/book';
import { useMyProgress } from '~/provider/progress';
import { path } from '~/router';
import { formatSize } from '~/utils';

import { Card } from '../card';
import { CardRow } from '../card-row';

import { useStyle } from './style';

interface BookRowdProps {
  bookId: string;
  showAuthor?: boolean;
}

export function BookRow({ bookId, showAuthor = true }: BookRowdProps) {
  const styles = useStyle();
  const navigate = useNavigate();
  const [isAdmin] = useIsAdmin();

  const [book, loading, error] = useBook(bookId);
  const [progress] = useMyProgress(bookId);
  const [deleteBook] = useDeleteBook();

  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const handleDelete = useCallback(() => {
    if (!book) {
      return;
    }
    setShowDeleteModal(true);
  }, [book]);
  const handleDeleteCancel = useCallback(() => {
    setShowDeleteModal(false);
  }, []);
  const handleDeleteConfirm = useCallback(() => {
    setShowDeleteModal(false);
    if (!book) {
      return;
    }
    deleteBook(book.id);
  }, [deleteBook, book]);

  const [showDeleteProgressModal, setShowDeleteProgressModal] = useState<boolean>(false);
  const handleDeleteProgress = useCallback(() => {
    if (!book) {
      return;
    }
    setShowDeleteProgressModal(true);
  }, [book]);
  const handleDeleteProgressCancel = useCallback(() => {
    setShowDeleteProgressModal(false);
  }, []);
  const handleDeleteProgressConfirm = useCallback(() => {
    setShowDeleteProgressModal(false);
    if (!book) {
      return;
    }
    // deleteBook(book.id);
  }, [book]);

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
                src={`/api/books/${encodeURIComponent(book.id)}/cover`}
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
            {/*<div className={styles.format}>EPUB · {formatSize(book.size)}</div>*/}
          </div>
          {/*{progress != null && (
          <span className={styles.progress}>{Math.round((progress.percentage ?? 0) * 100)}%</span>
        )}

        {progress != null && !isAdmin && (
          <Button text="Clear progress" onClick={handleDeleteProgress} type="link" danger />
        )}
        {isAdmin && <Button text="Delete book" onClick={handleDelete} type="link" danger />}*/}
        </div>
      </CardRow>
      <ConfirmModal
        isOpen={showDeleteProgressModal}
        onCancel={handleDeleteProgressCancel}
        onConfirm={handleDeleteProgressConfirm}
        danger
        title={`Delete reading progress for “${book.title}” permanently?`}
        confirmText="Delete"
      >
        Your progress, notes, and highlights for this book will be permanently deleted. This action
        cannot be undone.
      </ConfirmModal>
      <ConfirmModal
        isOpen={showDeleteModal}
        onCancel={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        danger
        title={`Delete “${book.title}” permanently?`}
        confirmText="Delete"
      >
        This book will be removed from all user libraries. This action cannot be undone.
      </ConfirmModal>
    </Fragment>
  );
}

import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '../../control/button';
import { ConfirmModal } from '../../control/confirm-modal';
import { useIsAdmin } from '../../provider/auth';
import { useDeleteBook, type Book } from '../../provider/book';
import * as path from '../../router/path';
import { formatSize } from '../../utils';
import { Card } from '../card';

import { useStyle } from './style';

interface BookCardProps {
  book: Book;
  progress?: number;      // 0–1; undefined = no reading data
}

export function BookCard({
  book,
  progress,
}: BookCardProps) {
  const styles = useStyle();
  const navigate = useNavigate();
  const [ isAdmin ] = useIsAdmin();

  const [deleteBook] = useDeleteBook();

  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const handleDelete = useCallback(() => {
    setShowDeleteModal(true);
  }, [deleteBook, book.title, book.id]);
  const handleDeleteCancel = useCallback(() => {
    setShowDeleteModal(false)
  }, []);
  const handleDeleteConfirm = useCallback(() => {
    setShowDeleteModal(false);
    deleteBook(book.id);
  }, [deleteBook]);

  const [showDeleteProgressModal, setShowDeleteProgressModal] = useState<boolean>(false);
  const handleDeleteProgress = useCallback(() => {
    setShowDeleteProgressModal(true);
  }, [deleteBook, book.title, book.id]);
  const handleDeleteProgressCancel = useCallback(() => {
    setShowDeleteProgressModal(false)
  }, []);
  const handleDeleteProgressConfirm = useCallback(() => {
    setShowDeleteProgressModal(false);
    // deleteBook(book.id);
  }, [deleteBook]);

  const handleNavigate = useCallback(() => {
    navigate(path.book(book.id));
  }, []);

  return (
    <Card onClick={handleNavigate}>
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
          {book.author.length > 0 && <div className={styles.meta}>{book.author}</div>}
          <div className={styles.format}>
            EPUB · {formatSize(book.size)}
          </div>
        </div>
        {progress != null && (
          <span className={styles.progress}>{Math.round(progress * 100)}%</span>
        )}

         {progress != null && !isAdmin && (
          <Button text="Clear progress" onClick={handleDeleteProgress} type='link' danger/>
        )}
        {isAdmin && (
          <Button text="Delete book" onClick={handleDelete} type='link' danger/>
        )}
      </div>
      <ConfirmModal
        isOpen={showDeleteProgressModal}
        onCancel={handleDeleteProgressCancel}
        onConfirm={handleDeleteProgressConfirm}
        danger
        title={`Delete reading progress for “${book.title}” permanently?`}
        confirmText='Delete'>
        Your progress, notes, and highlights for this book will be permanently deleted. This action cannot be undone.
      </ConfirmModal>
      <ConfirmModal
        isOpen={showDeleteModal}
        onCancel={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        danger
        title={`Delete “${book.title}” permanently?`}
        confirmText='Delete'>
        This book will be removed from all user libraries. This action cannot be undone.
      </ConfirmModal>
    </Card>
  );
}

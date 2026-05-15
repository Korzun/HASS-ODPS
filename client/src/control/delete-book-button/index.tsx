import { Fragment, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useIsAdmin } from '~/provider/auth';
import { useBook, useDeleteBook } from '~/provider/book';
import { path } from '~/router';

import { Button } from '../button';
import { ConfirmModal } from '../confirm-modal';

interface DeleteBookButton {
  bookId: string;
}

export function DeleteBookButton({ bookId }: DeleteBookButton) {
  const [isAdmin] = useIsAdmin();
  const navigate = useNavigate();

  const [book] = useBook(bookId);
  const [deleteBook, deleting] = useDeleteBook();
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
  const handleDeleteConfirm = useCallback(async () => {
    setShowDeleteModal(false);
    if (!book) {
      return;
    }
    await deleteBook(book.id);
    navigate(path.home());
  }, [deleteBook, book, navigate]);

  if (!isAdmin) {
    return null;
  }

  return (
    <Fragment>
      <Button onClick={handleDelete} danger>
        Delete book
      </Button>
      <ConfirmModal
        isOpen={showDeleteModal}
        onCancel={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        danger
        title={`Delete “${book?.title ?? 'book'}” permanently?`}
        confirmText="Delete"
        loading={deleting}
      >
        This book will be removed from all user libraries. This action cannot be undone.
      </ConfirmModal>
    </Fragment>
  );
}

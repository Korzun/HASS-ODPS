import { useCallback, useState } from 'react';

import { Button, ConfirmModal } from '~/control';
import { useBook } from '~/provider/book';
import { useDeleteUserProgress, useUserProgress, type Progress } from '~/provider/progress';
import { relativeTime } from '~/utils';

import { useStyle } from './style';

interface UserBookRowProps {
  bookId: string;
  username: string;
}

export const UserBookRow = ({ bookId, username }: UserBookRowProps) => {
  const styles = useStyle();

  const [book] = useBook(bookId);
  const [progress, progressLoading, progressError] = useUserProgress(username, bookId);
  const [deleteProgress, deleting] = useDeleteUserProgress(username);

  const [showDeleteProgressModal, setShowDeleteProgressModal] = useState<boolean>(false);
  const handleDeleteProgress = useCallback(() => {
    setShowDeleteProgressModal(true);
  }, []);
  const handleDeleteProgressCancel = useCallback(() => {
    setShowDeleteProgressModal(false);
  }, []);
  const handleDeleteProgressConfirm = useCallback(() => {
    setShowDeleteProgressModal(false);
    deleteProgress(bookId);
  }, [bookId]);

  const progressMeta = (progress: Progress): string => {
    const parts: string[] = [];
    if (progress.device) parts.push(progress.device);
    if (progress.timestamp != null) parts.push(relativeTime(progress.timestamp));
    return parts.join(' · ');
  };

  if (progressLoading) {
    return <li className={styles.progressItem}>Loading…</li>;
  }
  if (progressError) {
    return <li className={styles.progressItem}>Error</li>;
  }
  if (progress === undefined) {
    return null;
  }

  const bookTitle = book?.title ?? progress.document;

  return (
    <li className={styles.progressItem}>
      <span className={styles.progDoc}>
        {bookTitle}
        {book && <small className={styles.progDocId}>{progress.document}</small>}
      </span>
      <span className={styles.progPct}>{Math.round(progress.percentage * 100)}%</span>
      <Button
        type="link"
        danger
        onClick={handleDeleteProgress}
        text="Delete progress"
        loading={deleting}
        title={`Delete progress for ${bookTitle}`}
      />
      <span className={styles.progMeta}>{progressMeta(progress)}</span>

      <ConfirmModal
        isOpen={showDeleteProgressModal}
        onCancel={handleDeleteProgressCancel}
        onConfirm={handleDeleteProgressConfirm}
        danger
        title={`Delete reading progress for “${bookTitle}” permanently?`}
        confirmText="Delete"
      >
        This user's progress, notes, and highlights for this book will be permanently deleted. This
        action cannot be undone.
      </ConfirmModal>
    </li>
  );
};

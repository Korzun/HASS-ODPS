import { useCallback, useEffect, useRef, useState } from 'react';

import { useDeleteMyProgress, useSetMyProgress } from '~/provider/progress';

import { Button } from '../button';

import { useStyle } from './style';

type SetProgressModalProps = {
  isOpen: boolean;
  bookId: string;
  chapterCount: number;
  initialChapter: number;
  onClose: () => void;
};

export function SetProgressModal({
  isOpen,
  bookId,
  chapterCount,
  initialChapter,
  onClose,
}: SetProgressModalProps) {
  const styles = useStyle();
  const modalRef = useRef<HTMLDialogElement>(null);
  const [selectedChapter, setSelectedChapter] = useState(initialChapter);

  const [setMyProgress, saving, saveError, saveErrorMessage] = useSetMyProgress(bookId);
  const [deleteMyProgress, deleting, deleteError, deleteErrorMessage] = useDeleteMyProgress();

  const isBusy = saving || deleting;
  const hasError = saveError || deleteError;
  const errorText = saveErrorMessage ?? deleteErrorMessage;

  // Refs to track the busy transition so we can close after a successful operation
  const pendingRef = useRef(false);
  const wasBusyRef = useRef(false);

  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;
    if (isOpen) modal.showModal();
    else modal.close();
  }, [isOpen]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isOpen) setSelectedChapter(initialChapter);
    // Reset to current progress only when the modal opens, not on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Close when the API call completes without error
  useEffect(() => {
    if (!pendingRef.current) return;
    if (isBusy) {
      wasBusyRef.current = true;
      return;
    }
    if (wasBusyRef.current) {
      wasBusyRef.current = false;
      pendingRef.current = false;
      if (!hasError) onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBusy, hasError]);

  const handleConfirm = useCallback(() => {
    pendingRef.current = true;
    wasBusyRef.current = false;
    if (selectedChapter === 0) {
      deleteMyProgress(bookId);
    } else {
      setMyProgress({
        currentChapter: selectedChapter,
        percentage: selectedChapter / chapterCount,
      });
    }
  }, [selectedChapter, bookId, chapterCount, setMyProgress, deleteMyProgress]);

  const handleCancel = useCallback(() => onClose(), [onClose]);

  const handleClickBackground = useCallback(
    (e: React.MouseEvent<HTMLDialogElement>) => {
      e.stopPropagation();
      handleCancel();
    },
    [handleCancel]
  );

  const handleClickDialog = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  }, []);

  const isClearing = selectedChapter === 0;

  return (
    <dialog ref={modalRef} className={styles.root} closedby="none" onClick={handleClickBackground}>
      <div className={styles.dialog} onClick={handleClickDialog}>
        <div className={styles.header}>Set Progress</div>
        <div className={styles.chapterDisplay}>
          <div className={isClearing ? styles.chapterNumberMuted : styles.chapterNumber}>
            {isClearing ? 'Not started' : `Chapter ${selectedChapter}`}
          </div>
          <div className={styles.chapterSubtitle}>of {chapterCount} chapters</div>
        </div>
        <div className={styles.sliderSection}>
          <input
            type="range"
            min={0}
            max={chapterCount}
            step={1}
            value={selectedChapter}
            onChange={(e) => setSelectedChapter(Number(e.target.value))}
            className={styles.slider}
            disabled={isBusy}
          />
          <div className={styles.sliderLabels}>
            <span>Not started</span>
            <span>Finished</span>
          </div>
        </div>
        {hasError && (
          <div className={styles.error}>
            {errorText ?? 'Something went wrong. Please try again.'}
          </div>
        )}
        <div className={styles.footer}>
          <Button type="text" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="primary" danger={isClearing} loading={isBusy} onClick={handleConfirm}>
            {isClearing ? 'Clear Progress' : 'Save Progress'}
          </Button>
        </div>
      </div>
    </dialog>
  );
}

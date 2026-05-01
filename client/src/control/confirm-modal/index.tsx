import { useEffect, PropsWithChildren, useRef, useCallback } from 'react';

import { Button } from '../button';

import { useStyle } from './style';

type ConfirmModalProps = PropsWithChildren<{
  cancelText?: string;
  confirmText?: string;
  danger?: boolean;
  isOpen?: boolean;
  onCancel?: () => void;
  onConfirm?: () => void;
  title?: string;
}>;

export function ConfirmModal({
  cancelText = 'Cancel',
  children,
  confirmText = 'Confirm',
  danger = false,
  isOpen = false,
  onCancel = () => {},
  onConfirm = () => {},
  title = 'Confirm action',
}: ConfirmModalProps) {
  const styles = useStyle();
  const modalRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const modalElement = modalRef.current;
    if (!modalElement) {
      return;
    }
    if (isOpen) {
      modalElement.showModal();
    } else {
      modalElement.close();
    }
  }, [isOpen]);

  const handleCancel = useCallback(() => {
    onCancel();
  }, [onCancel]);
  const handleConfirm = useCallback(() => {
    onConfirm();
  }, [onConfirm]);
  const handleClickBackground = useCallback(
    (event: React.MouseEvent<HTMLDialogElement, MouseEvent>) => {
      event.stopPropagation();
      handleCancel();
    },
    [handleCancel]
  );
  const handleClickDialog = useCallback(
    (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      event.stopPropagation();
    },
    [handleCancel]
  );

  return (
    <dialog ref={modalRef} className={styles.root} closedby="none" onClick={handleClickBackground}>
      <div className={styles.dialog} onClick={handleClickDialog}>
        <div className={styles.header}>{title}</div>
        <div className={styles.body}>{children}</div>
        <div className={styles.footer}>
          <Button onClick={handleCancel} text={cancelText} type="text" />
          <Button onClick={handleConfirm} text={confirmText} type="primary" danger={danger} />
        </div>
      </div>
    </dialog>
  );
}

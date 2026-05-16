import { useCallback, useEffect, useState } from 'react';

import { useUploadBookList } from '~/provider/book';

import { Toast } from '../toast';
import { useStyle } from './style';

export const UploadZone = () => {
  const styles = useStyle();

  const [dragOver, setDragOver] = useState<boolean>(false);
  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(true);
  }, []);
  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
  }, []);
  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    uploadBookList(event.dataTransfer.files);
  }, []);

  const [uploadBookList, uploadResult, uploading, error] = useUploadBookList();
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const handleDismiss = useCallback(() => setToast(null), []);
  const handleFiles = useCallback((files: FileList) => {
    if (files.length) {
      uploadBookList(files);
    }
  }, []);
  useEffect(() => {
    if (uploading) {
      setToast(null);
    } else if (error) {
      setToast({ text: 'Upload failed', type: 'error' });
    } else if (uploadResult !== undefined) {
      setToast({ text: `Uploaded: ${uploadResult.uploaded.join(', ')}`, type: 'success' });
    }
  }, [uploading, error, uploadResult]);

  return (
    <>
      <div
        className={dragOver ? styles.dropZoneOver : styles.dropZone}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          id="upload-file-input"
          type="file"
          accept=".epub"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files) void handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <p className={styles.dropText}>
          Drop books here or{' '}
          <label
            htmlFor="upload-file-input"
            style={{ textDecoration: 'underline', cursor: 'pointer' }}
          >
            click to upload
          </label>
        </p>
        <small className={styles.dropSmall}>Supported format: epub</small>
      </div>
      {toast && <Toast message={toast.text} type={toast.type} onDismiss={handleDismiss} />}
    </>
  );
};

import { useCallback, useEffect, useState } from 'react';

import { useUploadBookList } from '~/provider/book';

import { useStyle } from './style';

type UploadStatus = {
  text: string;
  ok: boolean;
};

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
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | undefined>();
  const handleFiles = useCallback((files: FileList) => {
    if (files.length) {
      uploadBookList(files);
    }
  }, []);
  useEffect(() => {
    if (uploading === true) {
      setUploadStatus(undefined);
    } else if (error === true) {
      setUploadStatus({ text: '✗ Upload failed', ok: false });
    } else if (uploadResult !== undefined) {
      setUploadStatus({ text: `✓ Uploaded: ${uploadResult.uploaded.join(', ')}`, ok: true });
    }
  }, [uploading, error, uploadResult]);

  return (
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
      {uploadStatus && !uploading && (
        <div className={uploadStatus.ok ? styles.statusOk : styles.statusErr}>
          {uploadStatus.text}
        </div>
      )}
    </div>
  );
};

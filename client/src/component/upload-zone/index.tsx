import { useState } from 'react';

import { useScanLibrary, useUploadBooks } from '../../provider/book';

import { useStyle } from './style';

interface UploadZoneProps {
  isAdmin: boolean;
}

interface Status {
  text: string;
  ok: boolean;
}

export function UploadZone({ isAdmin }: UploadZoneProps) {
  const styles = useStyle();
  const [dragOver, setDragOver] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<Status | null>(null);
  const [scanStatus, setScanStatus] = useState<Status | null>(null);
  const [uploadBooks, uploading] = useUploadBooks();
  const [scanLibrary, scanning] = useScanLibrary();

  async function handleFiles(files: FileList) {
    if (!files.length) return;
    setUploadStatus({ text: `Uploading ${files.length} file(s)…`, ok: true });
    const result = await uploadBooks(files);
    if (result) {
      setUploadStatus({ text: `✓ Uploaded: ${result.uploaded.join(', ')}`, ok: true });
    } else {
      setUploadStatus({ text: '✗ Upload failed', ok: false });
    }
  }

  async function handleScan() {
    setScanStatus(null);
    const result = await scanLibrary();
    if (result) {
      const total = result.imported.length + result.removed.length;
      setScanStatus({
        text:
          total === 0
            ? '✓ Library already up to date'
            : `✓ Scan complete: ${result.imported.length} imported, ${result.removed.length} removed`,
        ok: true,
      });
    } else {
      setScanStatus({ text: '✗ Scan failed', ok: false });
    }
  }

  return (
    <div>
      {isAdmin && (
        <div className={styles.scanRow}>
          <button
            type="button"
            className={styles.scanBtn}
            onClick={() => void handleScan()}
            disabled={scanning}
          >
            {scanning ? 'Scanning…' : 'Scan Library'}
          </button>
          {scanStatus && (
            <span className={scanStatus.ok ? styles.statusOk : styles.statusErr}>
              {scanStatus.text}
            </span>
          )}
        </div>
      )}
      <div
        className={dragOver ? styles.dropZoneOver : styles.dropZone}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void handleFiles(e.dataTransfer.files);
        }}
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
    </div>
  );
}

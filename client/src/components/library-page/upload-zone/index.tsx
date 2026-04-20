import { useState, useRef } from 'react';
import { uploadBooks, scanLibrary } from '../../../api/books';
import { useStyle } from './style';

interface UploadZoneProps {
  isAdmin: boolean;
  onUploadComplete: () => void;
  onScanComplete: () => void;
}

interface Status {
  text: string;
  ok: boolean;
}

export function UploadZone({ isAdmin, onUploadComplete, onScanComplete }: UploadZoneProps) {
  const styles = useStyle();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<Status | null>(null);
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<Status | null>(null);

  async function handleFiles(files: FileList) {
    if (!files.length) return;
    setUploading(true);
    setUploadStatus({ text: `Uploading ${files.length} file(s)…`, ok: true });
    try {
      const result = await uploadBooks(files);
      setUploadStatus({ text: `✓ Uploaded: ${result.uploaded.join(', ')}`, ok: true });
      onUploadComplete();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setUploadStatus({ text: `✗ ${msg}`, ok: false });
    } finally {
      setUploading(false);
    }
  }

  async function handleScan() {
    setScanning(true);
    setScanStatus(null);
    try {
      const result = await scanLibrary();
      const total = result.imported.length + result.removed.length;
      setScanStatus({
        text: total === 0
          ? '✓ Library already up to date'
          : `✓ Scan complete: ${result.imported.length} imported, ${result.removed.length} removed`,
        ok: true,
      });
      onScanComplete();
    } catch {
      setScanStatus({ text: '✗ Scan failed', ok: false });
    } finally {
      setScanning(false);
    }
  }

  return (
    <div>
      {isAdmin && (
        <div className={styles.scanRow}>
          <button
            type="button"
            className={styles.scanBtn}
            onClick={handleScan}
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
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          id="upload-file-input"
          type="file"
          accept=".epub"
          multiple
          style={{ display: 'none' }}
          onChange={e => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <p className={styles.dropText}>
          Drop books here or{' '}
          <label htmlFor="upload-file-input" style={{ textDecoration: 'underline', cursor: 'pointer' }}>
            click to upload
          </label>
        </p>
        <small className={styles.dropSmall}>Supported format: epub</small>
        {uploadStatus && (
          <div className={uploadStatus.ok ? styles.statusOk : styles.statusErr}>
            {uploadStatus.text}
          </div>
        )}
      </div>
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';

import { Button } from '~/control/button';
import { useScanLibrary } from '~/provider/book';

import { Toast } from '../toast';

import { useStyle } from './style';

export const LibraryScan = () => {
  const styles = useStyle();

  const [scanLibrary, scanResult, scanning, error] = useScanLibrary();
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const handleDismiss = useCallback(() => setToast(null), []);

  useEffect(() => {
    if (scanning) {
      setToast(null);
      return;
    }
    if (error) {
      setToast({ text: 'Scan failed', type: 'error' });
      return;
    }
    if (scanResult !== undefined) {
      const changed = scanResult.imported.length + scanResult.removed.length;
      setToast({
        text:
          changed === 0
            ? 'Library already up to date'
            : `Scan complete: ${scanResult.imported.length} imported, ${scanResult.removed.length} removed`,
        type: 'success',
      });
    }
  }, [scanning, error, scanResult]);

  return (
    <div className={styles.root}>
      <Button loading={scanning} onClick={scanLibrary}>
        {scanning ? 'Scanning…' : 'Library scan'}
      </Button>
      {toast && <Toast message={toast.text} type={toast.type} onDismiss={handleDismiss} />}
    </div>
  );
};

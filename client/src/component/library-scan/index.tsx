import { useCallback, useMemo } from 'react';

import { Button } from '~/control/button';
import { useIsAdmin } from '~/provider/auth';
import { useScanLibrary } from '~/provider/book';

import { useStyle } from './style';

export const LibraryScan = () => {
  const styles = useStyle();
  const [isAdmin] = useIsAdmin();

  const [scanLibrary, scanResult, scanning, error] = useScanLibrary();
  const handleScanLibrary = useCallback(() => {
    scanLibrary();
  }, [scanLibrary]);
  const scanStatus = useMemo(() => {
    if (error) {
      return {
        text: '✗ Scan failed',
        ok: false,
      };
    }
    if (scanResult === undefined) {
      return undefined;
    }
    if (scanResult.imported.length + scanResult.removed.length === 0) {
      return {
        text: '✓ Library already up to date',
        ok: true,
      };
    }
    return {
      text: `✓ Scan complete: ${scanResult.imported.length} imported, ${scanResult.removed.length} removed`,
      ok: true,
    };
  }, [error, scanResult]);
  if (!isAdmin) {
    return null;
  }

  return (
    <div className={styles.root}>
      <Button loading={scanning} onClick={handleScanLibrary}>
        {scanning ? 'Scanning…' : 'Scan Library'}
      </Button>
      {scanStatus && (
        <span className={scanStatus.ok ? styles.statusOk : styles.statusErr}>
          {scanStatus.text}
        </span>
      )}
    </div>
  );
};

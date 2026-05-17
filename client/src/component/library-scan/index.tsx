import { useEffect, useState } from 'react';

import { Button } from '~/control/button';
import { useScanLibrary } from '~/provider/book';

import { useStyle } from './style';

export const LibraryScan = () => {
  const styles = useStyle();

  const [scanLibrary, scanResult, scanning, error] = useScanLibrary();
  const [resultText, setResultText] = useState<{ text: string; isError: boolean } | null>(null);

  useEffect(() => {
    if (scanning) {
      setResultText(null);
      return;
    }
    if (error) {
      setResultText({ text: 'Scan failed', isError: true });
      return;
    }
    if (scanResult !== undefined) {
      const changed = scanResult.imported.length + scanResult.removed.length;
      setResultText({
        text:
          changed === 0
            ? 'Library already up to date'
            : `Scan complete: ${scanResult.imported.length} imported, ${scanResult.removed.length} removed`,
        isError: false,
      });
    }
  }, [scanning, error, scanResult]);

  return (
    <div className={styles.root}>
      <Button loading={scanning} onClick={scanLibrary}>
        {scanning ? 'Scanning…' : 'Library scan'}
      </Button>
      {resultText && (
        <span className={resultText.isError ? styles.resultError : styles.result}>
          {resultText.text}
        </span>
      )}
    </div>
  );
};

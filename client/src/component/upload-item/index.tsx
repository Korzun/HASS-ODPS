import { CheckIcon, CircleXIcon, ClockIcon, UploadIcon } from '~/icon';
import type { UploadItem as UploadItemType } from '~/provider/book';

import { useStyle } from './style';

interface Props {
  item: UploadItemType;
}

export const UploadItem = ({ item }: Props) => {
  const styles = useStyle();
  const { file, status, bytesUploaded, errorMessage } = item;

  const totalMB = (file.size / 1_048_576).toFixed(1);
  const uploadedMB = (bytesUploaded / 1_048_576).toFixed(1);
  const progressPercent = file.size > 0 ? Math.min((bytesUploaded / file.size) * 100, 100) : 0;

  const iconWrapperClass = {
    queued: styles.iconWrapperQueued,
    uploading: styles.iconWrapperUploading,
    done: styles.iconWrapperDone,
    error: styles.iconWrapperError,
  }[status];

  const barFillClass = {
    queued: styles.barFillQueued,
    uploading: styles.barFillUploading,
    done: styles.barFillDone,
    error: styles.barFillError,
  }[status];

  const rightLabel =
    status === 'error'
      ? (errorMessage ?? 'Upload failed')
      : status === 'queued'
        ? `${totalMB} MB`
        : status === 'done'
          ? `${totalMB} / ${totalMB} MB`
          : `${uploadedMB} / ${totalMB} MB`;

  const rightLabelClass =
    status === 'done' ? styles.labelDone : status === 'error' ? styles.labelError : styles.label;

  return (
    <div className={status === 'error' ? styles.rootError : styles.root}>
      <div className={iconWrapperClass}>
        {status === 'queued' && <ClockIcon height={16} width={16} />}
        {status === 'uploading' && <UploadIcon height={16} width={16} />}
        {status === 'done' && <CheckIcon height={16} width={16} />}
        {status === 'error' && <CircleXIcon height={16} width={16} />}
      </div>
      <div className={styles.content}>
        <div className={styles.filename}>{file.name}</div>
        <div className={styles.progressRow}>
          <div className={styles.barTrack}>
            <div className={barFillClass} style={{ width: `${progressPercent}%` }} />
          </div>
          <div className={rightLabelClass}>{rightLabel}</div>
        </div>
      </div>
    </div>
  );
};

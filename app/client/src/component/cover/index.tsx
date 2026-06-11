import { useAuthorizedSrc } from '~/lib/use-authorized-src';
import { useWithTargetUser } from '~/provider/library-target';

import { useStyle } from './style';

interface CoverProps {
  bookId: string | null;
  title?: string;
  sequence: 1 | 2 | 3;
  width: number;
  height: number;
  thumbnailWidth?: number;
}

export function Cover({ bookId, title, sequence, width, height, thumbnailWidth }: CoverProps) {
  const withTargetUser = useWithTargetUser();
  const style = useStyle({ sequence, height, width, isGhost: !bookId });
  const url = bookId
    ? thumbnailWidth
      ? withTargetUser(`/api/books/${encodeURIComponent(bookId)}/cover?width=${thumbnailWidth}`)
      : withTargetUser(`/api/books/${encodeURIComponent(bookId)}/cover`)
    : null;
  const src = useAuthorizedSrc(url);

  return bookId ? (
    <img src={src} alt={title ?? ''} className={`${style.layer} ${style.coverImg}`} />
  ) : (
    <div className={`${style.layer} ${style.ghost}`} />
  );
}

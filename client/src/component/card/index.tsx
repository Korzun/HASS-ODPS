import { PropsWithChildren, useCallback } from 'react';

import { useStyle } from './style';

export type Props = PropsWithChildren<{
  onClick?: () => void;
}>;
export const Card = ({ children, onClick = () => { } }: Props) => {
  const styles = useStyle();

  const handleBookKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      onClick();
    }
  }, []);

  return (
    <div
      className={styles.root}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleBookKeyDown}
    >
      <div className={styles.contentContainer}>
        {children}
      </div>
    </div>
  );
}

import { PropsWithChildren, ReactNode, useCallback, useEffect, useState } from 'react';

import { useStyle } from './style';

type StandaloneSectionProps = PropsWithChildren<{
  actions?: ReactNode[];
  open?: boolean;
  subTitle?: string;
  title: string;
  onOpenToggle?: () => void;
}>;

export function CollapsibleSection({
  children,
  title,
  subTitle,
  actions = [],
  open: externalOpen,
  onOpenToggle = () => {},
}: StandaloneSectionProps) {
  const styles = useStyle();

  const [open, setOpen] = useState(false);
  const handleOpenToggle = useCallback(() => {
    setOpen(!open);
    onOpenToggle();
  }, [open, onOpenToggle]);
  useEffect(() => {
    if (externalOpen !== undefined) {
      setOpen(externalOpen);
    }
  }, [externalOpen]);

  const handleOnKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleOpenToggle();
      }
    },
    [handleOpenToggle]
  );

  return (
    <div className={styles.root}>
      <div
        className={styles.header}
        role="button"
        tabIndex={0}
        onClick={handleOpenToggle}
        onKeyDown={handleOnKeyDown}
      >
        <span className={styles.chevron}>{open ? '▼' : '▶'}</span>
        <span className={styles.label}>{title}</span>
        {subTitle && <span className={styles.count}>{subTitle}</span>}
        <span className={styles.spacer} />
        {actions}
      </div>
      {open && children}
    </div>
  );
}

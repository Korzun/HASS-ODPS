import cx from 'classnames';
import { PropsWithChildren, ReactNode, ReactElement, useCallback } from 'react';

import { useStyle } from './style';

export type Props = PropsWithChildren<{
  headerAction?: ReactNode | ReactElement[];
  onClick?: () => void;
  subTitle?: string;
  title?: string | ReactNode;
}>;
export const Card = ({ children, headerAction, subTitle, title, onClick }: Props) => {
  const style = useStyle();

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        if (onClick) {
          onClick();
        }
      }
    },
    [onClick]
  );

  return (
    <div
      className={cx(style.root, { [style.clickable]: onClick !== undefined })}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      {(title || subTitle || headerAction) && (
        <div className={cx(style.header, { [style.collapsed]: !children })}>
          {title && <div className={style.title}>{title}</div>}
          {subTitle && <div className={style.subTitle}>{subTitle}</div>}
          <div className={style.spacer} />
          {headerAction}
        </div>
      )}
      {children && <div className={style.content}>{children}</div>}
    </div>
  );
};

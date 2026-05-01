import cx from 'classnames';
import { useCallback } from 'react';

import { LoadingSpinner } from '../loading-spinner';

import { ButtonType, ButtonTypeValue, useStyle } from './style';

export type ButtonProps = {
  danger?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  tabIndex?: number;
  text: string;
  title?: string;
  type?: ButtonTypeValue;
};
export const Button = ({
  danger = false,
  disabled = false,
  loading = false,
  onClick = () => {},
  tabIndex,
  text,
  title,
  type = ButtonType.Default as ButtonTypeValue,
}: ButtonProps) => {
  const styles = useStyle();
  const className = cx(
    styles.root,
    styles[type],
    { [styles.danger]: danger },
    { [styles.loading]: loading },
    { [styles.disabled]: disabled }
  );

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      if (!disabled && !loading) {
        event.stopPropagation();
        onClick();
      }
    },
    [onClick]
  );

  return (
    <div
      role="button"
      tabIndex={tabIndex}
      className={className}
      onClick={handleClick}
      title={title ?? text}
    >
      {loading && <LoadingSpinner />}
      {text}
    </div>
  );
};

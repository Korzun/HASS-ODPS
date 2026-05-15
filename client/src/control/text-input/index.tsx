import cx from 'classnames';
import { useCallback, useState } from 'react';

import { IconProps } from '../../icon';
import { Button } from '../button';

import { useStyle } from './style';

type Action = {
  icon: React.ComponentType<IconProps>;
  action: () => void;
  danger?: boolean;
};
export type TextInputProps = {
  autoComplete?: React.HTMLInputAutoCompleteAttribute | undefined;
  action?: Action;
  label?: string;
  layout?: 'horizontal' | 'vertical' | 'inline';
  name: string;
  onChange?: (newValue: string | undefined) => void;
  onValidChange?: (fieldName: string, newValid: boolean) => void;
  password?: boolean;
  placeholder?: string;
  validate?: (newValue: string) => boolean;
  value: string | undefined;
};

export const TextInput = ({
  autoComplete,
  action,
  label,
  layout = 'horizontal',
  name,
  onChange = () => {},
  onValidChange = () => {},
  password = false,
  placeholder,
  validate = () => true,
  value = '',
}: TextInputProps) => {
  const style = useStyle();

  const [isValid, setIsValid] = useState<boolean>(true);
  const [internalValue, setInternalValue] = useState<string | undefined>(value);
  const [prevValue, setPrevValue] = useState<string | undefined>(value);

  const handleValueChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = event.target.value;
      setInternalValue(newValue);
      if (validate(newValue)) {
        if (isValid === false) {
          setIsValid(true);
          onValidChange(name, true);
        }
        onChange(newValue === '' ? undefined : newValue);
      } else {
        if (isValid === true) {
          setIsValid(false);
          onValidChange(name, false);
        }
      }
    },
    [isValid, name, onChange, onValidChange, validate]
  );

  if (value !== prevValue) {
    setPrevValue(value);
    setInternalValue(value);
  }

  return (
    <div className={cx(style.root, style[layout])}>
      {label && <label className={cx(style.label, { [style.danger]: !isValid })}>{label}</label>}
      <div className={style.inputContainer}>
        <input
          name={name}
          className={cx(style.input, { [style.isAction]: action !== undefined })}
          onChange={handleValueChange}
          placeholder={placeholder}
          value={internalValue}
          type={password ? 'password' : 'text'}
          autoComplete={autoComplete}
        />
        {action && (
          <div className={cx(style.action)}>
            <Button type="link" danger={action.danger}>
              <action.icon height={20} width={20} strokeWidth={2} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

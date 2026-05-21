import cx from 'classnames';
import { useCallback, useState } from 'react';

import { useStyle } from './style';

export type TextAreaProps = {
  label?: string;
  layout?: 'horizontal' | 'vertical' | 'inline';
  name: string;
  onChange?: (newValue: string | undefined) => void;
  onValidChange?: (fieldName: string, newValid: boolean) => void;
  placeholder?: string;
  validate?: (newValue: string) => boolean;
  value: string | undefined;
  variant?: 'outlined' | 'borderless';
};

export const TextArea = ({
  label,
  layout = 'horizontal',
  name,
  onChange = () => {},
  onValidChange = () => {},
  placeholder,
  validate = () => true,
  value = '',
  variant = 'outlined',
}: TextAreaProps) => {
  const style = useStyle();

  const [isValid, setIsValid] = useState<boolean>(true);
  const [internalValue, setInternalValue] = useState<string | undefined>(value);
  const [prevValue, setPrevValue] = useState<string | undefined>(value);

  const handleValueChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
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
      {label && (
        <label className={cx(style.label, { [`${style.danger}`]: !isValid })}>{label}</label>
      )}
      <textarea
        className={cx(style.input, style[variant])}
        name={name}
        onChange={handleValueChange}
        placeholder={placeholder}
        value={internalValue}
      />
    </div>
  );
};

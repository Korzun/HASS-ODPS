import { useCallback } from 'react';

import { depluralize } from '~/utils';

import { Button } from '../button';
import { TextInput } from '../text-input';

import { useStyle } from './style';

export type Value = { _key: string; values: string[] };
type TextInputListProps = {
  label: string | undefined;
  name: string;
  onFieldChange?: (subjectKey: string, valueIndex: number, newValue: string) => void;
  onRowAdd?: () => void;
  onRowRemove?: () => void;
  valueList: Value[];
};
export const TextInputList = ({
  label,
  name,
  onFieldChange = () => {},
  onRowAdd,
  onRowRemove,
  valueList,
}: TextInputListProps) => {
  const style = useStyle();

  // const [isEditValid, setIsEditValid] = useState<Record<string, boolean>>({});
  // // const handleIsValidChange = useCallback((valueIndex: string, newValid: boolean) => {
  // //   setIsEditValid((previous) => ({ ...previous, [fieldName]: newValid }));
  // // }, []);

  // const handleValueChange = useCallback((valueIndex: string, newValue: string) => {}, []);

  const handleFieldChange = useCallback(
    (identifierKey: string, valueIndex: number, newValue: string) => {
      onFieldChange(identifierKey, valueIndex, newValue);
    },
    [onFieldChange]
  );

  const handleRowAdd = useCallback(() => {
    if (onRowAdd) {
      onRowAdd();
    }
  }, [onRowAdd]);

  const handleRowRemove = useCallback(() => {
    if (onRowRemove) {
      onRowRemove();
    }
  }, [onRowRemove]);

  return (
    <div className={style.root}>
      <div className={style.rowContainer}>
        {valueList.map(({ _key, values }) => (
          <div className={style.inputContainer} key={_key}>
            {values.map((value, index) => (
              <div className={style.input} key={_key + index}>
                <TextInput
                  name={_key + index}
                  placeholder={label ? depluralize(label) : name}
                  value={value}
                  onChange={() => handleFieldChange(_key, index, value)}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
      {onRowAdd && (
        <Button
          onClick={handleRowAdd}
          type="dashed"
        >{`Add ${label ? depluralize(label).toLocaleLowerCase() : name}`}</Button>
      )}
    </div>
  );
};

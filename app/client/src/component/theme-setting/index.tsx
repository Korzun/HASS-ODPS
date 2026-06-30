import { SegmentedControl } from '~/control';
import { useThemeSetting } from '~/provider/theme';

import { useStyle } from './style';

const OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'auto', label: 'Auto' },
];

export const ThemeSetting = () => {
  const style = useStyle();
  const [setting, setSetting] = useThemeSetting();

  return (
    <div className={style.root}>
      <span className={style.label}>Appearance</span>
      <SegmentedControl
        name="Appearance"
        value={setting}
        options={OPTIONS}
        onChange={(value) => setSetting(value as typeof setting)}
      />
    </div>
  );
};

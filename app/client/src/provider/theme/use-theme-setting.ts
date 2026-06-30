import { useContext } from 'react';

import { Context, type ThemeSetting } from './context';

export type UseThemeSetting = [ThemeSetting, (setting: ThemeSetting) => void];

export const useThemeSetting = (): UseThemeSetting => {
  const { setting, setSetting } = useContext(Context);
  return [setting, setSetting];
};

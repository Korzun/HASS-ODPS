import { createContext } from 'react';

import type { ThemeMode } from './theme';

export type ThemeSetting = 'light' | 'dark' | 'auto';

export type ThemeModeContext = {
  /** The user's choice. */
  setting: ThemeSetting;
  setSetting: (setting: ThemeSetting) => void;
  /** The concrete mode after resolving 'auto' against the OS. */
  resolvedMode: ThemeMode;
};

export const Context = createContext<ThemeModeContext>({
  setting: 'auto',
  setSetting: () => undefined,
  resolvedMode: 'light',
});

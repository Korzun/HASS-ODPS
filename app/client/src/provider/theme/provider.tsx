import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { ThemeProvider as JssThemeProvider } from 'react-jss';

import { Context, type ThemeSetting } from './context';
import { GlobalStyles } from './global-styles';
import { darkTheme, lightTheme, type ThemeMode } from './theme';

const STORAGE_KEY = 'theme-setting';
const DARK_QUERY = '(prefers-color-scheme: dark)';

const readSetting = (): ThemeSetting => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' || stored === 'auto' ? stored : 'auto';
};

export type ThemeProviderProps = { children: ReactNode };
export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [setting, setSettingState] = useState<ThemeSetting>(readSetting);
  const [systemDark, setSystemDark] = useState<boolean>(
    () => window.matchMedia(DARK_QUERY).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(DARK_QUERY);
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  const setSetting = useCallback((next: ThemeSetting) => {
    localStorage.setItem(STORAGE_KEY, next);
    setSettingState(next);
  }, []);

  const resolvedMode: ThemeMode = setting === 'auto' ? (systemDark ? 'dark' : 'light') : setting;
  const theme = resolvedMode === 'dark' ? darkTheme : lightTheme;

  const value = useMemo(
    () => ({ setting, setSetting, resolvedMode }),
    [setting, setSetting, resolvedMode]
  );

  return (
    <Context.Provider value={value}>
      <JssThemeProvider theme={theme}>
        <GlobalStyles />
        {children}
      </JssThemeProvider>
    </Context.Provider>
  );
};

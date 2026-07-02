import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { ThemeProvider as JssThemeProvider } from 'react-jss';

import { TOKEN_CHANGED_EVENT, currentIdentity } from '~/lib/token';

import { Context, type ThemeSetting } from './context';
import { GlobalStyles } from './global-styles';
import { darkTheme, lightTheme, type ThemeMode } from './theme';

const STORAGE_PREFIX = 'theme-setting:';
const DARK_QUERY = '(prefers-color-scheme: dark)';

// The appearance choice belongs to the signed-in user, not the device: it is
// stored under a per-user key so logging out drops back to 'auto' (the login
// screen never inherits a previous user's dark choice) and logging back in
// restores that user's own choice. Logged-out sessions have no key.
const storageKey = (identity: string | null): string | null =>
  identity === null ? null : `${STORAGE_PREFIX}${identity}`;

const readSetting = (identity: string | null): ThemeSetting => {
  const key = storageKey(identity);
  const stored = key === null ? null : localStorage.getItem(key);
  return stored === 'light' || stored === 'dark' || stored === 'auto' ? stored : 'auto';
};

export type ThemeProviderProps = { children: ReactNode };
export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [identity, setIdentity] = useState<string | null>(currentIdentity);
  const [setting, setSettingState] = useState<ThemeSetting>(() => readSetting(currentIdentity()));
  const [systemDark, setSystemDark] = useState<boolean>(
    () => window.matchMedia(DARK_QUERY).matches
  );

  // Re-scope whenever the access token changes: on login restore that user's
  // saved choice; on logout (token cleared) identity becomes null and the
  // setting falls back to 'auto'.
  useEffect(() => {
    const onTokenChange = () => {
      const next = currentIdentity();
      setIdentity(next);
      setSettingState(readSetting(next));
    };
    window.addEventListener(TOKEN_CHANGED_EVENT, onTokenChange);
    return () => window.removeEventListener(TOKEN_CHANGED_EVENT, onTokenChange);
  }, []);

  useEffect(() => {
    const mql = window.matchMedia(DARK_QUERY);
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  const setSetting = useCallback(
    (next: ThemeSetting) => {
      const key = storageKey(identity);
      if (key !== null) localStorage.setItem(key, next);
      setSettingState(next);
    },
    [identity]
  );

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

import { ThemeProvider as JssThemeProvider, useTheme as useJssTheme } from 'react-jss';
import type { ReactNode } from 'react';
import { defaultTheme, type Theme } from './theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  return <JssThemeProvider theme={defaultTheme}>{children}</JssThemeProvider>;
}

export function useTheme(): Theme {
  return useJssTheme<Theme>();
}

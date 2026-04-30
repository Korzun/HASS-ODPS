import type { ReactNode } from 'react';
import { ThemeProvider as JssThemeProvider } from 'react-jss';

import { defaultTheme } from './theme';

export type ThemeProviderProps = { children: ReactNode }
export const ThemeProvider = ({ children }: ThemeProviderProps) => (
  <JssThemeProvider theme={defaultTheme}>
    {children}
  </JssThemeProvider>
);

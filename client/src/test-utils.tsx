import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { ThemeProvider } from './theme/theme-provider';
import { AuthContext } from './auth/auth-provider';
import type { CurrentUser } from './types';

interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  user?: CurrentUser;
}

export function renderWithProviders(
  ui: ReactElement,
  {
    user = { username: '', isAdmin: false },
    ...options
  }: RenderWithProvidersOptions = {}
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ThemeProvider>
        <AuthContext.Provider value={user}>
          {children}
        </AuthContext.Provider>
      </ThemeProvider>
    );
  }
  return render(ui, { wrapper: Wrapper, ...options });
}

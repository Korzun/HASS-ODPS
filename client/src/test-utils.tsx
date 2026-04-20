import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from './theme/theme-provider';
import { AuthContext, type AuthState } from './auth/auth-provider';

interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  user?: Omit<AuthState, 'loading'>;
}

export function renderWithProviders(
  ui: ReactElement,
  {
    user = { username: '', isAdmin: false },
    ...options
  }: RenderWithProvidersOptions = {}
) {
  const authState: AuthState = { ...user, loading: false };

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter>
        <ThemeProvider>
          <AuthContext.Provider value={authState}>
            {children}
          </AuthContext.Provider>
        </ThemeProvider>
      </MemoryRouter>
    );
  }
  return render(ui, { wrapper: Wrapper, ...options });
}

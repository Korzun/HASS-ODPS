import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from './theme/theme-provider';
import { AuthContext, type AuthState } from './auth/auth-provider';

interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  user?: Omit<AuthState, 'loading'>;
  initialEntries?: string[];
}

export function renderWithProviders(
  ui: ReactElement,
  {
    user = { username: '', isAdmin: false },
    initialEntries,
    ...options
  }: RenderWithProvidersOptions = {}
) {
  const authState: AuthState = { ...user, loading: false };

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={initialEntries}>
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

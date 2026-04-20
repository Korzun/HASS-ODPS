import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getMe } from '../api/me';
import type { CurrentUser } from '../types';

export interface AuthState extends CurrentUser {
  loading: boolean;
}

const defaultState: AuthState = { username: '', isAdmin: false, loading: true };

export const AuthContext = createContext<AuthState>(defaultState);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(defaultState);

  useEffect(() => {
    getMe()
      .then(user => setState({ ...user, loading: false }))
      .catch(() => setState({ username: '', isAdmin: false, loading: false }));
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}

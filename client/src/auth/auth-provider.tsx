import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getMe } from '../api/me';
import type { CurrentUser } from '../types';

const defaultUser: CurrentUser = { username: '', isAdmin: false };

export const AuthContext = createContext<CurrentUser>(defaultUser);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser>(defaultUser);

  useEffect(() => {
    getMe().then(setUser).catch(() => {});
  }, []);

  return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>;
}

export function useAuth(): CurrentUser {
  return useContext(AuthContext);
}

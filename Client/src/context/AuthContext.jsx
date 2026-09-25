import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('prime_auth_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const persist = useCallback((nextUser, token) => {
    setUser(nextUser);
    if (nextUser) localStorage.setItem('prime_auth_user', JSON.stringify(nextUser));
    else localStorage.removeItem('prime_auth_user');
    if (token) localStorage.setItem('prime_guest_token', token);
    else localStorage.removeItem('prime_guest_token');
  }, []);

  const value = useMemo(
    () => ({
      user,
      async signIn({ email, password }) {
        const data = await api.signIn({ email, password });
        persist(data.user, data.token);
        return data.user;
      },
      async signUp({ name, email, password }) {
        const data = await api.signUp({ name, email, password });
        persist(data.user, data.token);
        return data.user;
      },
      signOut() {
        persist(null, null);
      },
    }),
    [user, persist]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

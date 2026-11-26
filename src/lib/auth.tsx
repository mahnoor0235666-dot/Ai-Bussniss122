import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, errorMessage } from './api';
import type { Language, Theme, User } from './types';
import { usePrefs } from './i18n';

type AuthState = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (input: { email: string; password: string; displayName: string; preferredLanguage: Language }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (user: User | null) => void;
  updateProfile: (input: {
    displayName?: string;
    businessName?: string;
    preferredLanguage?: Language;
    theme?: Theme;
  }) => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setLanguage, setTheme, language, theme } = usePrefs();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.get<{ user: User | null }>('/api/auth/me');
      setUser(data.user);
      if (data.user) {
        // Server-stored preferences win on a new device/browser.
        if (data.user.preferredLanguage !== language) setLanguage(data.user.preferredLanguage);
        if (data.user.theme !== theme) setTheme(data.user.theme);
      }
    } catch (error) {
      setUser(null);
      if (error instanceof Error && error.message) {
        /* stay signed out, message surfaces on the login screen */
      }
    } finally {
      setLoading(false);
    }
  }, [language, theme, setLanguage, setTheme]);

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<{ user: User }>('/api/auth/login', { email, password });
    setUser(data.user);
  }, []);

  const signup = useCallback(
    async (input: { email: string; password: string; displayName: string; preferredLanguage: Language }) => {
      const data = await api.post<{ user: User }>('/api/auth/signup', input);
      setUser(data.user);
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (error) {
      // Even if the network call fails we clear local state.
      errorMessage(error);
    }
    setUser(null);
  }, []);

  const updateProfile = useCallback(
    async (input: { displayName?: string; businessName?: string; preferredLanguage?: Language; theme?: Theme }) => {
      const data = await api.patch<{ user: User }>('/api/account', input);
      setUser(data.user);
    },
    [],
  );

  const value = useMemo<AuthState>(
    () => ({ user, loading, login, signup, logout, refresh, setUser, updateProfile }),
    [user, loading, login, signup, logout, refresh, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { authService } from '@/src/services/authService';
import { ServiceResult, User } from '@/src/types';
import { AppState } from 'react-native';
import { supabase } from '@/src/lib/supabase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<ServiceResult<User>>;
  signUp: (fullName: string, email: string, password: string) => Promise<ServiceResult<User | null>>;
  resetPassword: (email: string) => Promise<ServiceResult>;
  signOut: () => Promise<void>;
  updateProfile: (fullName: string, displayName: string) => Promise<ServiceResult<User>>;
  deleteAccount: () => Promise<ServiceResult>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const generation = useRef(0);

  const loadUser = useCallback(async () => {
    const request = ++generation.current;
    try {
      const current = await authService.getCurrentUser();
      if (request === generation.current) setUser(current);
    } catch {
      if (request === generation.current) setUser(null);
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUser();
    const unsubscribe = authService.onAuthChange(() => {
      void loadUser();
    });
    return () => {
      generation.current += 1;
      unsubscribe();
    };
  }, [loadUser]);

  useEffect(() => {
    const sync = () => {
      if (AppState.currentState === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    };
    sync();
    const listener = AppState.addEventListener('change', sync);
    return () => {
      listener.remove();
      supabase.auth.stopAutoRefresh();
    };
  }, []);

  const safely = useCallback(
    async <T,>(action: () => Promise<ServiceResult<T>>): Promise<ServiceResult<T>> => {
      try {
        return await action();
      } catch {
        return { error: 'İşlem tamamlanamadı. Bağlantınızı kontrol edip yeniden deneyin.' };
      }
    },
    [],
  );

  const withUser = useCallback(<T extends User | null>(result: ServiceResult<T>) => {
    if (result.data) {
      generation.current += 1;
      setUser(result.data);
      setLoading(false);
    }
    return result;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signIn: async (email, password) => withUser(await safely(() => authService.signIn(email, password))),
      signUp: async (fullName, email, password) =>
        withUser(await safely(() => authService.signUp(fullName, email, password))),
      resetPassword: (email) => safely(() => authService.resetPassword(email)),
      signOut: async () => {
        await authService.signOut();
        generation.current += 1;
        setUser(null);
      },
      updateProfile: async (fullName, displayName) => {
        if (!user) return { error: 'Oturum bulunamadı.' };
        return withUser(await safely(() => authService.updateProfile(user.id, fullName, displayName)));
      },
      deleteAccount: async () => {
        if (!user) return { error: 'Oturum bulunamadı.' };
        const result = await safely(() => authService.deleteAccount(user.id));
        if (!result.error) setUser(null);
        return result;
      },
    }),
    [user, loading, withUser, safely],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth, AuthProvider içinde kullanılmalıdır.');
  return ctx;
}

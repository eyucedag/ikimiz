import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '@/src/services/authService';
import { ServiceResult, User } from '@/src/types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isMockMode: boolean;
  signIn: (email: string, password: string) => Promise<ServiceResult<User>>;
  signUp: (fullName: string, email: string, password: string) => Promise<ServiceResult<User | null>>;
  signInAsTestUser: () => Promise<ServiceResult<User>>;
  resetPassword: (email: string) => Promise<ServiceResult>;
  signOut: () => Promise<void>;
  updateProfile: (fullName: string, displayName: string) => Promise<ServiceResult<User>>;
  deleteAccount: () => Promise<ServiceResult>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      setUser(await authService.getCurrentUser());
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
    return authService.onAuthChange(loadUser);
  }, [loadUser]);

  const withUser = useCallback(<T extends User | null>(result: ServiceResult<T>) => {
    if (result.data) setUser(result.data);
    return result;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isMockMode: authService.isMockMode,
      signIn: async (email, password) => withUser(await authService.signIn(email, password)),
      signUp: async (fullName, email, password) => withUser(await authService.signUp(fullName, email, password)),
      signInAsTestUser: async () => withUser(await authService.signInAsTestUser()),
      resetPassword: (email) => authService.resetPassword(email),
      signOut: async () => {
        await authService.signOut();
        setUser(null);
      },
      updateProfile: async (fullName, displayName) => {
        if (!user) return { error: 'Oturum bulunamadı.' };
        return withUser(await authService.updateProfile(user.id, fullName, displayName));
      },
      deleteAccount: async () => {
        if (!user) return { error: 'Oturum bulunamadı.' };
        const result = await authService.deleteAccount(user.id);
        if (!result.error) setUser(null);
        return result;
      },
    }),
    [user, loading, withUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth, AuthProvider içinde kullanılmalıdır.');
  return ctx;
}

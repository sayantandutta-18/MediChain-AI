import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi } from '@/api/auth';
import { setUnauthorizedHandler, toApiError, tokenStorage, userStorage } from '@/api/client';
import type { ApiErrorPayload } from '@/api/errors';
import type { AuthSession, User } from '@/types';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  login: (email: string, password: string, totpCode?: string) => Promise<void>;
  register: (payload: Parameters<typeof authApi.register>[0]) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (payload: Parameters<typeof authApi.updateProfile>[0]) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const persist = (session: AuthSession): void => {
  tokenStorage.set(session.token);
  userStorage.set<User>(session.user);
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => userStorage.get<User>());
  const [isBootstrapping, setIsBootstrapping] = useState<boolean>(() => Boolean(tokenStorage.get()));

  const clearSession = useCallback(() => {
    tokenStorage.clear();
    userStorage.clear();
    setUser(null);
  }, []);

  // A 401 from anywhere in the app ends the session consistently (TRD-13).
  useEffect(() => {
    setUnauthorizedHandler(clearSession);
  }, [clearSession]);

  // Validate the persisted token against the backend on first load.
  useEffect(() => {
    if (!tokenStorage.get()) {
      setIsBootstrapping(false);
      return;
    }

    let cancelled = false;
    authApi
      .me()
      .then((profile) => {
        if (cancelled) return;
        userStorage.set(profile);
        setUser(profile);
      })
      .catch(() => {
        if (!cancelled) clearSession();
      })
      .finally(() => {
        if (!cancelled) setIsBootstrapping(false);
      });

    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  const login = useCallback(async (email: string, password: string, totpCode?: string) => {
    const session = await authApi.login(email, password, totpCode);
    persist(session);
    setUser(session.user);
  }, []);

  const register = useCallback<AuthContextValue['register']>(async (payload) => {
    const session = await authApi.register(payload);
    persist(session);
    setUser(session.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // The local session is cleared regardless of the server round trip.
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const refreshProfile = useCallback(async () => {
    const profile = await authApi.me();
    userStorage.set(profile);
    setUser(profile);
  }, []);

  const updateProfile = useCallback<AuthContextValue['updateProfile']>(async (payload) => {
    const updated = await authApi.updateProfile(payload);
    userStorage.set(updated);
    setUser(updated);
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const session = await authApi.changePassword(currentPassword, newPassword);
    persist(session);
    setUser(session.user);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isBootstrapping,
      login,
      register,
      logout,
      refreshProfile,
      updateProfile,
      changePassword,
    }),
    [user, isBootstrapping, login, register, logout, refreshProfile, updateProfile, changePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>.');
  return context;
};

/** Normalises any thrown value into the shared API error shape. */
export const toError = (error: unknown): ApiErrorPayload => toApiError(error);

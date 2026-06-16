import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  StorefrontUser,
  clearStorefrontSession,
  getStorefrontMe,
  loginStorefrontFacebook,
  loadStoredStorefrontToken,
  loadStoredStorefrontUser,
  loginStorefrontAccount,
  registerStorefrontAccount,
  saveStorefrontSession,
  updateStorefrontMe,
} from '../services/customerAccountService';

type RegisterPayload = {
  email: string;
  password: string;
  full_name: string;
};

type LoginPayload = {
  email: string;
  password: string;
};

type UpdatePayload = {
  email?: string;
  full_name?: string;
  password?: string;
};

type StorefrontAuthContextValue = {
  user: StorefrontUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<StorefrontUser>;
  loginWithFacebook: (payload: { access_token: string; user_id?: string }) => Promise<StorefrontUser>;
  register: (payload: RegisterPayload) => Promise<StorefrontUser>;
  refreshUser: () => Promise<StorefrontUser | null>;
  updateProfile: (payload: UpdatePayload) => Promise<StorefrontUser>;
  logout: () => void;
};

const StorefrontAuthContext = createContext<StorefrontAuthContextValue | undefined>(undefined);

export const StorefrontAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<StorefrontUser | null>(() => loadStoredStorefrontUser());
  const [loading, setLoading] = useState(false);

  const isAuthenticated = Boolean(user);

  useEffect(() => {
    if (loadStoredStorefrontToken()) return;
    clearStorefrontSession();
    setUser(null);
  }, []);

  const login = async (payload: LoginPayload) => {
    const auth = await loginStorefrontAccount(payload);
    saveStorefrontSession(auth);
    setUser(auth.user);
    return auth.user;
  };

  const loginWithFacebook = async (payload: { access_token: string; user_id?: string }) => {
    const auth = await loginStorefrontFacebook(payload);
    saveStorefrontSession(auth);
    setUser(auth.user);
    return auth.user;
  };

  const register = async (payload: RegisterPayload) => {
    const auth = await registerStorefrontAccount(payload);
    saveStorefrontSession(auth);
    setUser(auth.user);
    return auth.user;
  };

  const refreshUser = async () => {
    if (!loadStoredStorefrontToken()) {
      clearStorefrontSession();
      setUser(null);
      return null;
    }

    setLoading(true);
    try {
      const me = await getStorefrontMe();
      setUser(me);
      sessionStorage.setItem('storefrontUser', JSON.stringify(me));
      localStorage.removeItem('storefrontUser');
      return me;
    } catch {
      clearStorefrontSession();
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (payload: UpdatePayload) => {
    const updated = await updateStorefrontMe(payload);
    setUser(updated);
    sessionStorage.setItem('storefrontUser', JSON.stringify(updated));
    localStorage.removeItem('storefrontUser');
    return updated;
  };

  const logout = () => {
    clearStorefrontSession();
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      loading,
      login,
      loginWithFacebook,
      register,
      refreshUser,
      updateProfile,
      logout,
    }),
    [user, isAuthenticated, loading],
  );

  return <StorefrontAuthContext.Provider value={value}>{children}</StorefrontAuthContext.Provider>;
};

export const useStorefrontAuth = () => {
  const ctx = useContext(StorefrontAuthContext);
  if (!ctx) throw new Error('useStorefrontAuth must be used within StorefrontAuthProvider');
  return ctx;
};

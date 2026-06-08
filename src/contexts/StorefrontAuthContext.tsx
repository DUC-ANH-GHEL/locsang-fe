import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  StorefrontUser,
  clearStorefrontSession,
  getStorefrontMe,
  loginStorefrontFacebook,
  loginStorefrontGoogle,
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
  loginWithGoogle: (payload: { id_token: string; client_id?: string }) => Promise<StorefrontUser>;
  loginWithFacebook: (payload: { access_token: string; user_id?: string }) => Promise<StorefrontUser>;
  register: (payload: RegisterPayload) => Promise<StorefrontUser>;
  refreshUser: () => Promise<StorefrontUser | null>;
  updateProfile: (payload: UpdatePayload) => Promise<StorefrontUser>;
  logout: () => void;
};

const StorefrontAuthContext = createContext<StorefrontAuthContextValue | undefined>(undefined);

export const StorefrontAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<StorefrontUser | null>(() => loadStoredStorefrontUser());
  const [loading, setLoading] = useState(true);

  const isAuthenticated = Boolean(user);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      try {
        const me = await getStorefrontMe();
        if (cancelled) return;
        setUser(me);
      } catch {
        if (cancelled) return;
        clearStorefrontSession();
        setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (payload: LoginPayload) => {
    const auth = await loginStorefrontAccount(payload);
    saveStorefrontSession(auth);
    setUser(auth.user);
    return auth.user;
  };

  const loginWithGoogle = async (payload: { id_token: string; client_id?: string }) => {
    const auth = await loginStorefrontGoogle(payload);
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
    try {
      const me = await getStorefrontMe();
      setUser(me);
      localStorage.setItem('storefrontUser', JSON.stringify(me));
      return me;
    } catch {
      clearStorefrontSession();
      setUser(null);
      return null;
    }
  };

  const updateProfile = async (payload: UpdatePayload) => {
    const updated = await updateStorefrontMe(payload);
    setUser(updated);
    localStorage.setItem('storefrontUser', JSON.stringify(updated));
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
      loginWithGoogle,
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

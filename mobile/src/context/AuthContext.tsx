import React, { createContext, useEffect, useState, ReactNode } from 'react';
import { authService } from '../services/authService';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  phone?: string;
  isVerified?: boolean;
}

export interface AuthContextValue {
  user: UserProfile | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<any>;
  loginWithFirebase: (params: { idToken: string; provider?: string }) => Promise<any>;
  register: (userData: any) => Promise<any>;
  logout: () => Promise<void>;
  refresh: () => Promise<string>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // 1. Restore session on mount
    let isMounted = true;
    authService
      .getSession()
      .then((session: { user: any; accessToken: string | null; isAuthenticated: boolean }) => {
        if (isMounted) {
          setUser((session.user as UserProfile) || null);
          setAccessToken(session.accessToken);
          setIsLoading(false);
        }
      })
      .catch((err: any) => {
        console.error('[AuthContext] Session restore error:', err);
        if (isMounted) {
          setIsLoading(false);
        }
      });

    // 2. Subscribe to auth events (LOGIN, LOGOUT, EXPIRED)
    const unsubscribe = authService.addListener(({ event, user: updatedUser }: { event: string; user: any }) => {
      if (!isMounted) return;
      if (event === 'LOGIN') {
        setUser((updatedUser as UserProfile) || null);
      } else if (event === 'LOGOUT' || event === 'EXPIRED') {
        setUser(null);
        setAccessToken(null);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await authService.login(email, password);
      setUser((data.user as UserProfile) || null);
      setAccessToken(data.accessToken);
      return data;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithFirebase = async (params: { idToken: string; provider?: string }) => {
    setIsLoading(true);
    try {
      const data = await authService.loginWithFirebase(params);
      setUser((data.user as UserProfile) || null);
      setAccessToken(data.accessToken);
      return data;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: any) => {
    setIsLoading(true);
    try {
      const data = await authService.register(userData);
      setUser((data.user as UserProfile) || null);
      setAccessToken(data.accessToken);
      return data;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
      setAccessToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refresh = async () => {
    const newToken = await authService.refresh();
    setAccessToken(newToken);
    return newToken;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated: Boolean(user && accessToken),
        isLoading,
        login,
        loginWithFirebase,
        register,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

import React, { createContext, useContext, useCallback, useEffect, useState } from "react";
import { getToken, getUser, saveToken, saveUser, remove } from "@/utils/token";
import api from "@/api/axios";

interface AuthContextType {
  token: string | null;
  user: any | null;
  isAuthenticated: boolean;
  loading: boolean;
  checkAuth: () => Promise<void>;
  login: (token: string, user: any, rememberMe?: boolean) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => getToken());
  const [user, setUser] = useState<any | null>(() => getUser());
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!token;

  const checkAuth = useCallback(async () => {
    setLoading(true);
    const t = getToken();
    const u = getUser();
    setToken(t);
    setUser(u);

    if (!t) {
      setLoading(false);
      return;
    }

    try {
      await api.get("/auth/me");
      // Token is valid; keep it.
    } catch (err: any) {
      if (err?.response?.status === 401) {
        remove();
        setToken(null);
        setUser(null);
      }
      // Non-401 failures: keep the session alive, don't force logout.
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback((tokenValue: string, userValue: any, rememberMe = false) => {
    saveToken(tokenValue, rememberMe);
    saveUser(userValue, rememberMe);
    setToken(tokenValue);
    setUser(userValue);
  }, []);

  const logout = useCallback(() => {
    remove();
    setToken(null);
    setUser(null);
  }, []);

  // Initial auth check on mount.
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const value: AuthContextType = {
    token,
    user,
    isAuthenticated,
    loading,
    checkAuth,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

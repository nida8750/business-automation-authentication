"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { api, clearTokens, getAccessToken, getRefreshToken, setTokens } from "./api/client";
import type { Role, TokenResponse, UserPublic } from "./api/types";

type AuthContextValue = {
  user: UserPublic | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<UserPublic>;
  register: (fullName: string, email: string, password: string) => Promise<UserPublic>;
  logout: () => Promise<void>;
  canWriteLeads: boolean;
  canReview: boolean;
  canOutbox: boolean;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [ready, setReady] = useState(false);

  async function reload() {
    if (!getAccessToken()) {
      setUser(null);
      return;
    }
    const me = await api<UserPublic>("/auth/me");
    setUser(me);
  }

  useEffect(() => {
    reload()
      .catch(() => {
        clearTokens();
        setUser(null);
      })
      .finally(() => setReady(true));
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const role: Role | undefined = user?.role;
    return {
      user,
      ready,
      canWriteLeads: role === "admin" || role === "operator",
      canReview: role === "admin" || role === "reviewer",
      canOutbox: role === "admin" || role === "operator",
      isAdmin: role === "admin",
      async login(email, password) {
        const tokens = await api<TokenResponse>("/auth/login", {
          method: "POST",
          body: { email, password },
          auth: false,
        });
        setTokens(tokens);
        const me = await api<UserPublic>("/auth/me");
        setUser(me);
        return me;
      },
      async register(fullName, email, password) {
        return api<UserPublic>("/auth/register", {
          method: "POST",
          body: { full_name: fullName, email, password },
          auth: false,
        });
      },
      async logout() {
        const refresh = getRefreshToken();
        try {
          if (refresh) {
            await api("/auth/logout", {
              method: "POST",
              body: { refresh_token: refresh },
              auth: false,
            });
          }
        } finally {
          clearTokens();
          setUser(null);
        }
      },
    };
  }, [user, ready]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

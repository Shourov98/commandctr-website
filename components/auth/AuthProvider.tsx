"use client";

import { createContext, startTransition, useContext, useEffect, useState, type ReactNode } from "react";

import { authApi, authStorage, type AuthSession, type AuthUser } from "@/lib/auth";

type AuthContextValue = {
  initialized: boolean;
  isAuthenticated: boolean;
  user: AuthUser | null;
  accessToken: string | null;
  login: (input: { email: string; password: string }) => Promise<void>;
  register: (input: { firstName: string; lastName: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let active = true;

    void authApi
      .getSession()
      .then((result) => {
        if (!active) {
          return;
        }

        startTransition(() => {
          if (result.user) {
            const nextSession = { user: result.user };
            authStorage.save(nextSession);
            setSession(nextSession);
          } else {
            authStorage.clear();
            setSession(null);
          }
          setInitialized(true);
        });
      })
      .catch(() => {
        if (!active) {
          return;
        }

        startTransition(() => {
          authStorage.clear();
          setSession(null);
          setInitialized(true);
        });
      });

    return () => {
      active = false;
    };
  }, []);

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore logout failures and clear local state anyway.
    }
    authStorage.clear();
    setSession(null);
  };

  const value: AuthContextValue = {
    initialized,
    isAuthenticated: Boolean(session?.user),
    user: session?.user ?? null,
    accessToken: null,
    async login(input) {
      const nextSession = await authApi.login(input);
      authStorage.save(nextSession);
      setSession(nextSession);
    },
    async register(input) {
      const nextSession = await authApi.register(input);
      authStorage.save(nextSession);
      setSession(nextSession);
    },
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
};

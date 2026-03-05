import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_USER = "@auth_user";
const KEY_TOKEN = "@auth_token";
const KEY_REFRESH = "@auth_refreshToken";

type AuthCtx = {
  user: any | null;
  token: string | null;
  refreshToken: string | null;

  setAuth: (user: any | null, token: string | null, refreshToken?: string | null) => Promise<void>;
  clearAuth: () => Promise<void>;

  // optional helper
  isReady: boolean;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  // ✅ Load saved auth on app start
  useEffect(() => {
    (async () => {
      try {
        const [u, t, r] = await Promise.all([
          AsyncStorage.getItem(KEY_USER),
          AsyncStorage.getItem(KEY_TOKEN),
          AsyncStorage.getItem(KEY_REFRESH),
        ]);

        if (u) setUser(JSON.parse(u));
        if (t) setToken(t);
        if (r) setRefreshToken(r);
      } catch {
        // ignore
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  const setAuth = async (u: any | null, t: string | null, r: string | null = null) => {
    setUser(u);
    setToken(t);
    setRefreshToken(r);

    // ✅ persist
    try {
      const jobs: Promise<any>[] = [];

      if (u) jobs.push(AsyncStorage.setItem(KEY_USER, JSON.stringify(u)));
      else jobs.push(AsyncStorage.removeItem(KEY_USER));

      if (t) jobs.push(AsyncStorage.setItem(KEY_TOKEN, t));
      else jobs.push(AsyncStorage.removeItem(KEY_TOKEN));

      if (r) jobs.push(AsyncStorage.setItem(KEY_REFRESH, r));
      else jobs.push(AsyncStorage.removeItem(KEY_REFRESH));

      await Promise.all(jobs);
    } catch {
      // ignore
    }
  };

  const clearAuth = async () => {
    setUser(null);
    setToken(null);
    setRefreshToken(null);

    try {
      await Promise.all([
        AsyncStorage.removeItem(KEY_USER),
        AsyncStorage.removeItem(KEY_TOKEN),
        AsyncStorage.removeItem(KEY_REFRESH),
      ]);
    } catch {
      // ignore
    }
  };

  const value = useMemo(
    () => ({ user, token, refreshToken, setAuth, clearAuth, isReady }),
    [user, token, refreshToken, isReady]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
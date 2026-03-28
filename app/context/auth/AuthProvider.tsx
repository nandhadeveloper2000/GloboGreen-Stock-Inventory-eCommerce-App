import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useSegments } from "expo-router";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import Toast from "react-native-toast-message";

const KEY_USER = "@auth_user";
const KEY_TOKEN = "@auth_token";
const KEY_REFRESH = "@auth_refreshToken";

type AuthCtx = {
  accessToken: string | null;
  token: string | null;
  refreshToken: string | null;
  user: any | null;
  role: string | null;
  isReady: boolean;
  loading: boolean;
  isAuthenticated: boolean;
  setAuth: (
    user: any | null,
    token: string | null,
    refreshToken?: string | null
  ) => Promise<void>;
  clearAuth: () => Promise<void>;
  logout: (showToast?: boolean) => Promise<void>;
  setUserOnly: (user: any | null) => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

function normalizeRole(user: any): string | null {
  const raw = String(
    user?.role ?? (Array.isArray(user?.roles) ? user.roles[0] : "") ?? ""
  )
    .trim()
    .toUpperCase();

  if (!raw) return null;
  if (raw === "MASTER") return "MASTER_ADMIN";
  if (raw === "SUB_ADMIN" || raw === "SUBADMIN") return "MANAGER";

  return raw;
}

function getHomeRouteByRole(role: string | null) {
  switch (role) {
    case "MASTER_ADMIN":
      return "/master/dashboard";
    case "MANAGER":
      return "/subadmin/dashboard";
    case "SUPERVISOR":
      return "/supervisor/dashboard";
    case "STAFF":
      return "/staff/dashboard";
    default:
      return "/";
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();

  const [user, setUser] = useState<any | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const role = useMemo(() => normalizeRole(user), [user]);

  const setAuth = useCallback(
    async (
      nextUser: any | null,
      nextToken: string | null,
      nextRefreshToken: string | null = null
    ) => {
      setUser(nextUser);
      setToken(nextToken);
      setRefreshToken(nextRefreshToken);

      const jobs: Promise<any>[] = [];

      if (nextUser) {
        jobs.push(AsyncStorage.setItem(KEY_USER, JSON.stringify(nextUser)));
      } else {
        jobs.push(AsyncStorage.removeItem(KEY_USER));
      }

      if (nextToken) {
        jobs.push(AsyncStorage.setItem(KEY_TOKEN, nextToken));
      } else {
        jobs.push(AsyncStorage.removeItem(KEY_TOKEN));
      }

      if (nextRefreshToken) {
        jobs.push(AsyncStorage.setItem(KEY_REFRESH, nextRefreshToken));
      } else {
        jobs.push(AsyncStorage.removeItem(KEY_REFRESH));
      }

      await Promise.all(jobs);
    },
    []
  );

  const clearAuth = useCallback(async () => {
    setUser(null);
    setToken(null);
    setRefreshToken(null);

    await Promise.all([
      AsyncStorage.removeItem(KEY_USER),
      AsyncStorage.removeItem(KEY_TOKEN),
      AsyncStorage.removeItem(KEY_REFRESH),
    ]);
  }, []);

  const logout = useCallback(
    async (showToast: boolean = false) => {
      await clearAuth();

      if (showToast) {
        Toast.show({
          type: "success",
          text1: "Logged out",
        });
      }

      router.replace("/Login");
    },
    [clearAuth, router]
  );

  const setUserOnly = useCallback(
    async (nextUser: any | null) => {
      setUser(nextUser);

      if (nextUser) {
        await AsyncStorage.setItem(KEY_USER, JSON.stringify(nextUser));
      } else {
        await AsyncStorage.removeItem(KEY_USER);
      }
    },
    []
  );

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const [storedUser, storedToken, storedRefresh] = await Promise.all([
          AsyncStorage.getItem(KEY_USER),
          AsyncStorage.getItem(KEY_TOKEN),
          AsyncStorage.getItem(KEY_REFRESH),
        ]);

        if (!mounted) return;

        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch {
            setUser(null);
          }
        }

        if (storedToken) setToken(storedToken);
        if (storedRefresh) setRefreshToken(storedRefresh);
      } finally {
        if (mounted) setIsReady(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const currentSegment = segments[0];
    const isAuthScreen =
      currentSegment === "Login" || currentSegment === "onboarding";

    if (!token || !refreshToken) {
      if (!isAuthScreen) {
        router.replace("/Login");
      }
      return;
    }

    if (isAuthScreen) {
      router.replace(getHomeRouteByRole(role));
    }
  }, [isReady, token, refreshToken, role, router, segments]);

  const value = useMemo(
    () => ({
      accessToken: token,
      token,
      refreshToken,
      user,
      role,
      setAuth,
      clearAuth,
      logout,
      setUserOnly,
      isReady,
      loading: !isReady,
      isAuthenticated: !!token && !!refreshToken,
    }),
    [
      token,
      refreshToken,
      user,
      role,
      setAuth,
      clearAuth,
      logout,
      setUserOnly,
      isReady,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);

  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return ctx;
}
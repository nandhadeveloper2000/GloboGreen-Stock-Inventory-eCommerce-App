import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN_KEY = "auth_access_token";
const REFRESH_TOKEN_KEY = "auth_refresh_token";
const USER_KEY = "auth_user";
const ROLE_KEY = "auth_role";

export async function setAccessToken(token: string) {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
}

export async function getAccessToken() {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function setRefreshToken(token: string) {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

export async function getRefreshToken() {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function setStoredUser(user: any) {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user ?? null));
}

export async function getStoredUser() {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function setStoredRole(role: string) {
  await SecureStore.setItemAsync(ROLE_KEY, role);
}

export async function getStoredRole() {
  return SecureStore.getItemAsync(ROLE_KEY);
}

export async function setAuthSession(params: {
  accessToken: string;
  refreshToken: string;
  user?: any;
  role?: string;
}) {
  await Promise.all([
    setAccessToken(params.accessToken),
    setRefreshToken(params.refreshToken),
    params.user !== undefined ? setStoredUser(params.user) : Promise.resolve(),
    params.role !== undefined
      ? setStoredRole(params.role)
      : Promise.resolve(),
  ]);
}

export async function getAuthSession() {
  const [accessToken, refreshToken, user, role] = await Promise.all([
    getAccessToken(),
    getRefreshToken(),
    getStoredUser(),
    getStoredRole(),
  ]);

  return {
    accessToken: accessToken || null,
    refreshToken: refreshToken || null,
    user: user || null,
    role: role || null,
  };
}

export async function clearAuthSession() {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.deleteItemAsync(USER_KEY),
    SecureStore.deleteItemAsync(ROLE_KEY),
  ]);
}
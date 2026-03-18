// app/utils/sessionStorage.ts
import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const ACCOUNT_TYPE_KEY = "accountType";

export async function saveSession(params: {
  accessToken: string;
  refreshToken: string;
  accountType: "master" | "subadmin" | "staff";
}) {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, params.accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, params.refreshToken);
  await SecureStore.setItemAsync(ACCOUNT_TYPE_KEY, params.accountType);
}

export async function getAccessToken() {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken() {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function getAccountType() {
  return SecureStore.getItemAsync(ACCOUNT_TYPE_KEY) as Promise<
    "master" | "subadmin" | "staff" | null
  >;
}

export async function clearSession() {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(ACCOUNT_TYPE_KEY);
}
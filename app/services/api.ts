// app/services/api.ts
import axios from "axios";
import {
  getAccessToken,
  getRefreshToken,
  getAccountType,
  saveSession,
  clearSession,
} from "../utils/sessionStorage";

const BASE_URL = "https://your-api.com/api";

export const api = axios.create({
  baseURL: BASE_URL,
});

let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: any) => void;
}> = [];

function flushQueue(error: any, token?: string) {
  pendingQueue.forEach((item) => {
    if (error) item.reject(error);
    else if (token) item.resolve(token);
  });
  pendingQueue = [];
}

api.interceptors.request.use(async (config) => {
  const accessToken = await getAccessToken();

  if (accessToken) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error?.response?.status;
    const code = error?.response?.data?.code;

    if (
      status === 401 &&
      code === "ACCESS_TOKEN_EXPIRED" &&
      !originalRequest._retry
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await getRefreshToken();
        const accountType = await getAccountType();

        if (!refreshToken || !accountType) {
          throw new Error("No refresh session");
        }

        const res = await axios.post(`${BASE_URL}/auth/refresh`, {
          refreshToken,
          accountType,
        });

        const { accessToken, refreshToken: newRefreshToken } = res.data.data;

        await saveSession({
          accessToken,
          refreshToken: newRefreshToken,
          accountType,
        });

        flushQueue(null, accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        flushQueue(refreshError);
        await clearSession();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
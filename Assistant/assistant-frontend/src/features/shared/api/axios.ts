import axios from "axios";

import { useAuthStore } from "@/features/auth/store/auth.store";
import { env } from "@/features/shared/constants/env";

/**
 * Shared Axios instance.
 * Attaches the JWT from the existing auth store for protected endpoints.
 */
export const apiClient = axios.create({
  baseURL: env.apiUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().accessToken;

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  // Let the browser set multipart boundary; a preset Content-Type breaks FormData.
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    config.headers.set("Content-Type", false);
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const requestUrl = error.config?.url ?? "";
      const isCredentialRequest =
        requestUrl.includes("/auth/login") ||
        requestUrl.includes("/auth/logout") ||
        requestUrl.includes("/auth/register");

      if (!isCredentialRequest) {
        const hadSession = Boolean(useAuthStore.getState().accessToken);
        useAuthStore.getState().clearAuth();

        if (
          hadSession &&
          typeof window !== "undefined" &&
          !window.location.pathname.startsWith("/login")
        ) {
          window.location.assign("/login");
        }
      }
    }

    return Promise.reject(error);
  },
);

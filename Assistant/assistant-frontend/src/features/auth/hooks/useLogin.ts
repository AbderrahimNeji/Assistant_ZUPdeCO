"use client";

import { useMutation } from "@tanstack/react-query";

import { AuthApi } from "../services/auth.api";
import { useAuthStore } from "../store/auth.store";
import type { LoginRequest } from "../types";

export function useLogin() {
  return useMutation({
    mutationFn: async (data: LoginRequest) => AuthApi.login(data),

    onSuccess: async ({ accessToken, refreshToken, user }) => {
      const { setTokens, setUser } = useAuthStore.getState();
      setTokens(accessToken, refreshToken);
      if (user) {
        setUser(user);
      }

      try {
        const profile = await AuthApi.me();
        setUser(profile);
      } catch {
        // Login user payload is enough to continue if /me fails transiently.
      }
    },
  });
}

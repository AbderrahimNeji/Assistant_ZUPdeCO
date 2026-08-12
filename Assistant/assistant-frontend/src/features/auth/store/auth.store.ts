import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { AuthUser } from "@/features/auth/types";

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;

  setUser: (user: AuthUser | null) => void;
  setTokens: (
    accessToken: string |null,
    refreshToken?: string | null
  ) => void;
  setAuthenticated: (isAuthenticated: boolean) => void;
  clearAuth: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: Boolean(user),
        }),

      setTokens: (accessToken, refreshToken = null) =>
        set({
          accessToken,
          refreshToken,
          isAuthenticated: Boolean(accessToken),
        }),

      setAuthenticated: (isAuthenticated) =>
        set({ isAuthenticated }),

      clearAuth: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: "auth-storage",
    }
  )
);
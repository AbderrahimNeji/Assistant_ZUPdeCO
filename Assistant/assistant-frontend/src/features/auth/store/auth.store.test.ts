import { beforeEach, describe, expect, it } from "vitest";

import { useAuthStore } from "@/features/auth/store/auth.store";

describe("useAuthStore", () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
  });

  it("stores access token and marks the session authenticated", () => {
    useAuthStore.getState().setTokens("token-abc");
    expect(useAuthStore.getState().accessToken).toBe("token-abc");
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it("clears the session on logout", () => {
    useAuthStore.getState().setTokens("token-abc");
    useAuthStore.getState().setUser({
      id: "1",
      firstName: "Demo",
      lastName: "User",
      email: "demo@zupdeco.fr",
    });
    useAuthStore.getState().clearAuth();

    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});

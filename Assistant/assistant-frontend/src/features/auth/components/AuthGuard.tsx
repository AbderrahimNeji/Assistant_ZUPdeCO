"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { AuthApi } from "@/features/auth/services/auth.api";
import { useAuthStore } from "../store/auth.store";

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const accessToken = useAuthStore((state) => state.accessToken);
  const setUser = useAuthStore((state) => state.setUser);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const [hydrated, setHydrated] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const validatingRef = useRef(false);

  useEffect(() => {
    setHydrated(useAuthStore.persist.hasHydrated());
    return useAuthStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated || validatingRef.current) return;

    if (!isAuthenticated || !accessToken) {
      setSessionChecked(true);
      return;
    }

    validatingRef.current = true;
    void AuthApi.me()
      .then((user) => {
        setUser(user);
      })
      .catch(() => {
        clearAuth();
      })
      .finally(() => {
        setSessionChecked(true);
        validatingRef.current = false;
      });
  }, [hydrated, isAuthenticated, accessToken, setUser, clearAuth]);

  useEffect(() => {
    if (hydrated && sessionChecked && !isAuthenticated) {
      router.replace("/login");
    }
  }, [hydrated, sessionChecked, isAuthenticated, router]);

  if (!hydrated || !sessionChecked) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground" role="status">
          Loading…
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground" role="status">
          Redirecting…
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { BrandLogo } from "@/features/shared/components/brand-logo";
import { APP_SHORT_NAME } from "@/features/shared/constants";

export function LoginView() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(useAuthStore.persist.hasHydrated());
    return useAuthStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (hydrated && isAuthenticated) {
      router.replace("/assistant");
    }
  }, [hydrated, isAuthenticated, router]);

  if (!hydrated || isAuthenticated) {
    return (
      <div
        className="flex min-h-40 items-center justify-center text-sm text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        Loading…
      </div>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader className="gap-3 text-center sm:text-left">
        <div className="flex justify-center sm:justify-start">
          <BrandLogo href="/login" size="md" />
        </div>
        <div className="space-y-1.5">
          <CardTitle className="text-2xl text-foreground md:text-[1.75rem]">
            Welcome back
          </CardTitle>
          <CardDescription className="text-sm leading-relaxed md:text-[0.95rem]">
            Sign in to continue to the {APP_SHORT_NAME} AI assistant.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent>
        <LoginForm />
      </CardContent>

      <CardFooter className="justify-center border-t-0 bg-transparent sm:justify-start">
        <p className="text-sm text-muted-foreground">
          Sign-in is limited to invited {APP_SHORT_NAME} accounts.
        </p>
      </CardFooter>
    </Card>
  );
}

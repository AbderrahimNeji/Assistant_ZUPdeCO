"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLogin } from "@/features/auth/hooks/useLogin";
import {
  loginSchema,
  type LoginFormValues,
} from "@/features/auth/schemas/login.schema";
import { getLoginErrorMessage } from "@/features/auth/utils/get-login-error-message";
import { cn } from "@/lib/utils";

export function LoginForm() {
  const router = useRouter();
  const login = useLogin();
  const formId = useId();
  const emailId = `${formId}-email`;
  const passwordId = `${formId}-password`;
  const formErrorId = `${formId}-error`;

  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onSubmit",
  });

  const isLoading = login.isPending || isSubmitting;
  const apiError = login.error ? getLoginErrorMessage(login.error) : null;

  useEffect(() => {
    if (login.isSuccess) {
      router.replace("/assistant");
    }
  }, [login.isSuccess, router]);

  function onSubmit(values: LoginFormValues) {
    login.mutate({
      email: values.email,
      password: values.password,
    });
  }

  return (
    <form
      className="space-y-5"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      aria-describedby={apiError ? formErrorId : undefined}
    >
      {apiError ? (
        <div
          id={formErrorId}
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-sm text-destructive"
        >
          {apiError}
        </div>
      ) : null}

      <div className="space-y-2">
        <label
          htmlFor={emailId}
          className="block text-sm font-semibold text-foreground"
        >
          Email
        </label>
        <Input
          id={emailId}
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@company.com"
          disabled={isLoading}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? `${emailId}-error` : undefined}
          className="h-11 rounded-xl px-3.5"
          {...register("email")}
        />
        {errors.email ? (
          <p
            id={`${emailId}-error`}
            role="alert"
            className="text-xs font-medium text-destructive"
          >
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label
          htmlFor={passwordId}
          className="block text-sm font-semibold text-foreground"
        >
          Password
        </label>
        <div className="relative">
          <Input
            id={passwordId}
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter your password"
            disabled={isLoading}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={
              errors.password ? `${passwordId}-error` : undefined
            }
            className="h-11 rounded-xl px-3.5 pr-11"
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            disabled={isLoading}
            className={cn(
              "absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-200",
              "hover:bg-muted hover:text-foreground",
              "focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none",
              "disabled:pointer-events-none disabled:opacity-50",
            )}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
          >
            {showPassword ? (
              <EyeOff className="size-4" aria-hidden />
            ) : (
              <Eye className="size-4" aria-hidden />
            )}
          </button>
        </div>
        {errors.password ? (
          <p
            id={`${passwordId}-error`}
            role="alert"
            className="text-xs font-medium text-destructive"
          >
            {errors.password.message}
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        variant="brand"
        className="h-11 w-full"
        disabled={isLoading}
        aria-busy={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </Button>
    </form>
  );
}

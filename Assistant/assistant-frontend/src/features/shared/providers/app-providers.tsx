"use client";

import type { ReactNode } from "react";

import { ToastViewport } from "@/features/shared/components/toast-viewport";
import { QueryProvider } from "@/features/shared/providers/query-provider";

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryProvider>
      {children}
      <ToastViewport />
    </QueryProvider>
  );
}

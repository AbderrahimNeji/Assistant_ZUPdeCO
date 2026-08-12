import type { ReactNode } from "react";

import { AuthGuard } from "@/features/auth";
import { AppShell } from "@/features/shared/components";

interface DashboardLayoutProps {
  children: ReactNode;
}

/** Authenticated scrollable shell for Documents, Benchmarks, and Settings. */
export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <AuthGuard>
      <AppShell mode="scroll">{children}</AppShell>
    </AuthGuard>
  );
}

import type { ReactNode } from "react";

import { AuthGuard } from "@/features/auth";

interface AssistantLayoutProps {
  children: ReactNode;
}

/**
 * Auth-only wrapper for the Assistant route.
 * Shared app chrome (top nav) is composed inside AssistantShell so search
 * and the conversations menu can stay page-specific.
 */
export default function AssistantLayout({ children }: AssistantLayoutProps) {
  return <AuthGuard>{children}</AuthGuard>;
}

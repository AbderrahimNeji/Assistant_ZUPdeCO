"use client";

import { useState, type ReactNode } from "react";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AppSidebar } from "@/features/shared/components/app-sidebar";
import { AppTopNav } from "@/features/shared/components/app-top-nav";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: ReactNode;
  className?: string;
  /** Optional leading control passed to the shared top nav. */
  leadingAction?: ReactNode;
  /** Optional center slot passed to the shared top nav. */
  centerSlot?: ReactNode;
  /**
   * `fill` — lock to viewport height (Assistant).
   * `scroll` — page scrolls under a sticky-feeling shell (Documents/Benchmarks).
   */
  mode?: "fill" | "scroll";
};

/**
 * Ednov-style authenticated chrome: light sidebar + light top bar + content.
 */
export function AppShell({
  children,
  className,
  leadingAction,
  centerSlot,
  mode = "scroll",
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div
      className={cn(
        "flex bg-background",
        mode === "fill" ? "h-dvh overflow-hidden" : "min-h-dvh",
        className,
      )}
    >
      <div className="hidden shrink-0 md:flex">
        <AppSidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((value) => !value)}
        />
      </div>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent
          side="left"
          className="w-[min(100%,18rem)] border-sidebar-border bg-sidebar p-0"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
            <SheetDescription>Primary application navigation</SheetDescription>
          </SheetHeader>
          <AppSidebar mobile onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <AppTopNav
          leadingAction={
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-9 text-brand-orange hover:bg-brand-peach md:hidden"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open navigation"
              >
                <Menu className="size-5" aria-hidden />
              </Button>
              {leadingAction}
            </>
          }
          centerSlot={centerSlot}
        />
        <div
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col",
            mode === "scroll" && "overflow-y-auto",
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

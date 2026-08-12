"use client";

import { Bell, Search } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { ProfileMenu } from "@/features/shared/components/profile-menu";
import { cn } from "@/lib/utils";

type AppTopNavProps = {
  className?: string;
  /** Optional leading control (e.g. conversations menu on Assistant). */
  leadingAction?: ReactNode;
  /** Optional center region (e.g. conversation search on Assistant). */
  centerSlot?: ReactNode;
};

/**
 * Ednov-style light top bar: mode label, pill search, notifications, avatar.
 */
export function AppTopNav({
  className,
  leadingAction,
  centerSlot,
}: AppTopNavProps) {
  return (
    <header
      className={cn(
        "flex h-14 shrink-0 items-center gap-2.5 border-b border-border bg-card px-3 sm:h-16 sm:gap-3 sm:px-4 md:px-5",
        className,
      )}
    >
      {leadingAction}

      <p className="hidden shrink-0 items-center text-sm font-semibold text-brand-orange sm:flex">
        Assistant
      </p>

      {centerSlot ? (
        <div className="mx-auto flex min-w-0 flex-1 justify-center px-2 sm:px-4">
          <div className="w-full max-w-md">{centerSlot}</div>
        </div>
      ) : (
        <div className="mx-auto flex min-w-0 flex-1 justify-center px-2 sm:px-4">
          <label className="relative hidden w-full max-w-md md:block">
            <span className="sr-only">Search</span>
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-brand-orange"
              aria-hidden
            />
            <input
              type="search"
              readOnly
              tabIndex={-1}
              placeholder="Search… (Ctrl+K)"
              className="h-9 w-full rounded-full border border-border bg-background pr-4 pl-10 text-sm text-foreground placeholder:text-muted-foreground ednov-transition focus-visible:border-brand-orange focus-visible:ring-3 focus-visible:ring-brand-orange/20 focus-visible:outline-none"
              aria-hidden
            />
          </label>
        </div>
      )}

      <div className="ml-auto flex shrink-0 items-center gap-2.5 sm:gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-9 text-brand-orange duration-150 hover:bg-brand-peach"
          aria-label="Notifications"
        >
          <Bell className="size-[1.15rem] stroke-[1.75]" aria-hidden />
        </Button>
        <ProfileMenu className="shrink-0" />
      </div>
    </header>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AuthApi } from "@/features/auth/services/auth.api";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { cn } from "@/lib/utils";

type ProfileMenuProps = {
  className?: string;
};

function getUserInitials(
  firstName?: string | null,
  lastName?: string | null,
  email?: string | null,
): string {
  const first = firstName?.trim()?.[0];
  const last = lastName?.trim()?.[0];
  if (first && last) return `${first}${last}`.toUpperCase();
  if (first) return first.toUpperCase();
  if (email?.trim()) return email.trim()[0]!.toUpperCase();
  return "?";
}

export function ProfileMenu({ className }: ProfileMenuProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const displayName = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const email = user?.email?.trim() || "";
  const initials = getUserInitials(user?.firstName, user?.lastName, user?.email);

  async function handleLogout() {
    try {
      await AuthApi.logout();
    } catch {
      // Local sign-out still proceeds if the server call fails.
    } finally {
      clearAuth();
      router.replace("/login");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-2 rounded-full p-0.5 text-left ednov-transition",
          "hover:bg-brand-peach focus-visible:ring-3 focus-visible:ring-brand-orange/35 focus-visible:outline-none",
          className,
        )}
        aria-label="Open profile menu"
      >
        <Avatar size="default" className="ring-2 ring-brand-orange/25">
          <AvatarFallback className="bg-brand-navy font-display text-xs font-bold tracking-wide text-white">
            {initials}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        alignOffset={-4}
        className="min-w-60 rounded-xl border-border shadow-card"
        sideOffset={10}
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-3 px-2 py-2 font-normal">
            <Avatar size="sm" className="ring-1 ring-border">
              <AvatarFallback className="bg-brand-navy font-display text-[10px] font-bold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0 space-y-0.5">
              <span className="block truncate font-display text-sm font-semibold text-foreground">
                {displayName || "Signed in"}
              </span>
              {email ? (
                <span className="block truncate text-xs text-muted-foreground">
                  {email}
                </span>
              ) : null}
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => {
            void handleLogout();
          }}
          aria-label="Log out"
          className="mx-1 mb-1"
        >
          <LogOut className="size-4" aria-hidden />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

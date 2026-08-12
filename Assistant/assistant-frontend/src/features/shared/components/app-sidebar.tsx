"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BrandLogo } from "@/features/shared/components/brand-logo";
import { APP_NAVIGATION } from "@/features/shared/constants/navigation";
import { cn } from "@/lib/utils";

type AppSidebarProps = {
  className?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  mobile?: boolean;
  onNavigate?: () => void;
};

function isNavActive(pathname: string, href: string): boolean {
  if (href === "/assistant") {
    return pathname === "/assistant" || pathname.startsWith("/assistant/");
  }
  if (href === "/benchmarks") {
    return (
      pathname === "/benchmarks" ||
      pathname.startsWith("/benchmarks/") ||
      pathname === "/benchmark" ||
      pathname.startsWith("/benchmark/")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar({
  className,
  collapsed = false,
  onToggleCollapse,
  mobile = false,
  onNavigate,
}: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground",
        !mobile && (collapsed ? "w-[4.5rem]" : "w-(--spacing-sidebar)"),
        mobile && "w-full",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border px-3 sm:h-16 sm:px-4",
          collapsed && !mobile && "justify-center px-2",
        )}
      >
        <BrandLogo
          className={cn(collapsed && !mobile && "sr-only")}
          size="sm"
          onClick={onNavigate}
        />

        {onToggleCollapse && !mobile ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className={cn(
              "ml-auto size-8 text-muted-foreground hover:bg-brand-peach hover:text-brand-orange",
              collapsed && "ml-0",
            )}
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeft className="size-4" aria-hidden />
            ) : (
              <PanelLeftClose className="size-4" aria-hidden />
            )}
          </Button>
        ) : null}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <nav
          aria-label="Primary"
          className={cn("flex flex-col gap-1 p-3", collapsed && !mobile && "items-center px-2")}
        >
          {APP_NAVIGATION.map((item) => {
            const Icon = item.icon;
            const active = isNavActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                title={item.title}
                className={cn(
                  "ednov-transition group inline-flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold",
                  "focus-visible:ring-3 focus-visible:ring-brand-orange/35 focus-visible:outline-none",
                  collapsed && !mobile && "size-10 justify-center px-0",
                  active
                    ? "bg-brand-orange text-white shadow-sm"
                    : "text-sidebar-foreground hover:bg-brand-peach hover:text-brand-orange",
                )}
              >
                <Icon
                  className={cn(
                    "size-[1.15rem] shrink-0 stroke-[1.75]",
                    active
                      ? "text-white"
                      : "text-brand-orange group-hover:text-brand-orange",
                  )}
                  aria-hidden
                />
                {collapsed && !mobile ? (
                  <span className="sr-only">{item.title}</span>
                ) : (
                  <span className="truncate">{item.title}</span>
                )}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
    </aside>
  );
}

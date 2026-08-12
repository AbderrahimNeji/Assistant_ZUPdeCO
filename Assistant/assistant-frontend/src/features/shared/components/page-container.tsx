import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageContainerProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  /** Constrain content width. Default: `default` (max-w-6xl). */
  width?: "narrow" | "default" | "wide" | "full";
};

const widthClassName: Record<NonNullable<PageContainerProps["width"]>, string> =
  {
    narrow: "max-w-3xl",
    default: "max-w-6xl",
    wide: "max-w-7xl",
    full: "max-w-none",
  };

export function PageContainer({
  title,
  description,
  actions,
  children,
  className,
  width = "default",
}: PageContainerProps) {
  const hasHeader = Boolean(title || description || actions);

  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-col gap-(--spacing-section)",
        "px-(--spacing-page-x) py-(--spacing-page-y)",
        "md:px-8 md:py-7",
        widthClassName[width],
        className,
      )}
    >
      {hasHeader ? (
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            {title ? <h1 className="ednov-title">{title}</h1> : null}
            {description ? (
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-[0.9375rem]">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {actions}
            </div>
          ) : null}
        </header>
      ) : null}

      {children}
    </div>
  );
}

"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToastStore } from "@/features/shared/store/toast.store";
import { cn } from "@/lib/utils";

export function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed right-4 bottom-4 z-[100] flex w-[min(100%-2rem,22rem)] flex-col gap-2"
      aria-live="polite"
      aria-relevant="additions"
    >
      {toasts.map((item) => (
        <div
          key={item.id}
          role="status"
          className={cn(
            "pointer-events-auto rounded-xl border px-4 py-3 shadow-card",
            item.variant === "error"
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : item.variant === "success"
                ? "border-brand-teal/30 bg-brand-mint text-foreground"
                : "border-border bg-card text-foreground",
          )}
        >
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="font-display text-sm font-semibold">{item.title}</p>
              {item.description ? (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              ) : null}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0"
              aria-label="Dismiss notification"
              onClick={() => dismiss(item.id)}
            >
              <X className="size-3.5" aria-hidden />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

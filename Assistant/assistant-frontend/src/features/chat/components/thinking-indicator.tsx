"use client";

import { cn } from "@/lib/utils";

type ThinkingIndicatorProps = {
  className?: string;
};

export function ThinkingIndicator({ className }: ThinkingIndicatorProps) {
  return (
    <div
      className={cn("flex w-full justify-start", className)}
      role="status"
      aria-live="polite"
      aria-label="Assistant is thinking"
    >
      <div className="flex max-w-[min(100%,24rem)] items-center gap-3 rounded-[1.25rem] rounded-bl-md border border-border/60 bg-card px-4 py-3 shadow-[0_1px_2px_rgb(27_22_64/0.04),0_4px_16px_rgb(27_22_64/0.05)]">
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-sm"
          aria-hidden
        >
          <svg
            viewBox="0 0 48 48"
            className="size-4"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 18c0-5.523 4.477-10 10-10h4c5.523 0 10 4.477 10 10v2c0 5.523-4.477 10-10 10h-1.2L18 36v-6.2C14.5 28.2 12 24.4 12 20v-2z"
              fill="currentColor"
              opacity="0.95"
            />
            <circle cx="20" cy="20" r="1.8" fill="#1B1640" />
            <circle cx="28" cy="20" r="1.8" fill="#1B1640" />
            <path
              d="M20 25c1.4 1.2 6.6 1.2 8 0"
              stroke="#1B1640"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </span>

        <div className="min-w-0 space-y-1.5">
          <p className="font-display text-sm font-semibold text-foreground">
            Assistant is thinking…
          </p>
          <div className="flex items-center gap-1.5" aria-hidden>
            <span className="size-1.5 animate-bounce rounded-full bg-brand-orange [animation-delay:0ms]" />
            <span className="size-1.5 animate-bounce rounded-full bg-brand-orange [animation-delay:150ms]" />
            <span className="size-1.5 animate-bounce rounded-full bg-brand-orange [animation-delay:300ms]" />
          </div>
        </div>
      </div>
    </div>
  );
}

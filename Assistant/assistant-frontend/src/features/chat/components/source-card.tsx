"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";

import type { Source } from "@/features/chat/types";
import { cn } from "@/lib/utils";

type MessageSourcesProps = {
  sources?: Source[];
  className?: string;
};

function formatPages(pages?: number[]): string | null {
  if (!pages?.length) return null;
  if (pages.length === 1) return `page ${pages[0]}`;

  const isContiguous = pages.every(
    (page, index) => index === 0 || page === pages[index - 1]! + 1,
  );

  if (isContiguous) {
    return `pages ${pages[0]}–${pages[pages.length - 1]}`;
  }

  return `pages ${pages.join(", ")}`;
}

function sourceLine(source: Source): string {
  const pagesLabel = formatPages(source.pages);
  const base = `${source.icon} ${source.label}`.trim();
  return pagesLabel ? `${base} (${pagesLabel})` : base;
}

export function MessageSources({ sources, className }: MessageSourcesProps) {
  const panelId = useId();
  const [open, setOpen] = useState(false);

  if (!sources?.length) return null;

  return (
    <section
      aria-label="Cited sources"
      className={cn("mt-3.5 border-t border-border/60 pt-3", className)}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left",
          "text-[11px] font-semibold tracking-wide text-brand-navy uppercase",
          "transition-colors hover:bg-brand-peach/40 focus-visible:bg-brand-peach/40",
          "focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none",
        )}
      >
        <span className="flex-1">
          Sources · {sources.length}
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <ul id={panelId} className="mt-2 space-y-1.5 px-1">
          {sources.map((source) => (
            <li
              key={source.id}
              className="text-xs leading-relaxed text-muted-foreground"
            >
              <span className="text-foreground/90">{sourceLine(source)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

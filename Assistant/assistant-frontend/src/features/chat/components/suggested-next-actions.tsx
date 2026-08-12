"use client";

import {
  ArrowUpRight,
  Download,
  ExternalLink,
  MessageSquarePlus,
  Sparkles,
  Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { SuggestedAction } from "@/features/chat/types";
import { cn } from "@/lib/utils";

type SuggestedNextActionsProps = {
  suggestions?: SuggestedAction[];
  disabled?: boolean;
  onSelect?: (suggestion: SuggestedAction) => void;
  className?: string;
};

function SuggestionIcon({ type }: { type: SuggestedAction["type"] }) {
  const className = "size-3.5 shrink-0 opacity-70";
  switch (type) {
    case "tool_action":
      return <Wrench className={className} aria-hidden />;
    case "navigation":
      return <ArrowUpRight className={className} aria-hidden />;
    case "download":
      return <Download className={className} aria-hidden />;
    case "external_link":
      return <ExternalLink className={className} aria-hidden />;
    default:
      return <MessageSquarePlus className={className} aria-hidden />;
  }
}

export function SuggestedNextActions({
  suggestions,
  disabled = false,
  onSelect,
  className,
}: SuggestedNextActionsProps) {
  if (!suggestions?.length || !onSelect) return null;

  return (
    <div
      className={cn("mt-3 border-t border-border/60 pt-3", className)}
      aria-label="Suggested next actions"
    >
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-muted-foreground">
        <Sparkles className="size-3 opacity-70" aria-hidden />
        Suggested next actions
      </p>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((suggestion) => (
          <Button
            key={suggestion.id}
            type="button"
            size="sm"
            variant="secondary"
            disabled={disabled}
            className="h-8 gap-1.5 rounded-full border border-border/70 bg-muted/40 px-3 text-xs font-medium text-foreground shadow-none hover:bg-brand-peach/60 hover:text-brand-navy"
            onClick={() => onSelect(suggestion)}
          >
            <SuggestionIcon type={suggestion.type} />
            {suggestion.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

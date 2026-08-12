"use client";

import { Button } from "@/components/ui/button";
import type { ChatActionButton } from "@/features/chat/types";
import { cn } from "@/lib/utils";

type MessageActionsProps = {
  actions?: ChatActionButton[];
  disabled?: boolean;
  onAction?: (action: ChatActionButton) => void;
  className?: string;
};

function buttonVariant(
  style: ChatActionButton["style"],
): "brand" | "secondary" | "destructive" {
  if (style === "destructive") return "destructive";
  if (style === "secondary") return "secondary";
  return "brand";
}

export function MessageActions({
  actions,
  disabled = false,
  onAction,
  className,
}: MessageActionsProps) {
  if (!actions?.length || !onAction) return null;

  return (
    <div
      className={cn("mt-3 flex flex-wrap gap-2", className)}
      aria-label="Suggested actions"
    >
      {actions.map((action, index) => (
        <Button
          key={`${action.toolId}-${action.id}-${index}`}
          type="button"
          size="sm"
          variant={buttonVariant(action.style)}
          disabled={disabled}
          onClick={() => onAction(action)}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}

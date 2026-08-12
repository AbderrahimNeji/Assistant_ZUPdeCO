"use client";

import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";

type ConversationsMenuButtonProps = {
  onClick?: () => void;
  "aria-expanded"?: boolean;
  "aria-controls"?: string;
};

/** Mobile-only control to open the conversations sheet on Assistant. */
export function ConversationsMenuButton({
  onClick,
  "aria-expanded": ariaExpanded,
  "aria-controls": ariaControls,
}: ConversationsMenuButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="shrink-0 text-white hover:bg-white/10 hover:text-white lg:hidden"
      onClick={onClick}
      aria-label="Open conversations"
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
    >
      <Menu className="size-5" aria-hidden />
    </Button>
  );
}

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

import { cn } from '@/lib/utils';

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

type TooltipVariant = 'light' | 'dark' | null;

type TooltipContentProps = React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & {
  variant?: TooltipVariant;
};

const variantClasses: Record<NonNullable<TooltipVariant>, string> = {
  light: 'bg-white text-gray-900 border-gray-200 shadow-md',
  dark: 'bg-gray-900 text-white border-gray-700 shadow-md',
};

const TooltipContent = React.forwardRef<
  React.ComponentRef<typeof TooltipPrimitive.Content>,
  TooltipContentProps
>(({ className, sideOffset = 4, variant, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'radix-tooltip-content z-[9999] overflow-hidden rounded-md border px-3 py-1.5 text-sm shadow-md',
        variant ? variantClasses[variant] : 'bg-popover text-popover-foreground',
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };

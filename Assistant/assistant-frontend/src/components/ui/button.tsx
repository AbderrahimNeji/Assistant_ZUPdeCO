import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-[0.625rem] border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap ednov-transition outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-brand-navy text-white hover:bg-brand-navy-deep",
        brand:
          "bg-brand-orange text-white shadow-glow hover:brightness-105",
        outline:
          "border-brand-orange/50 bg-card text-brand-orange hover:bg-brand-peach",
        secondary:
          "border-brand-orange/30 bg-brand-peach text-brand-orange hover:bg-[#ffe6d6]",
        ghost:
          "text-foreground hover:bg-brand-peach hover:text-brand-orange",
        destructive:
          "border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/15",
        link: "text-brand-orange underline-offset-4 hover:underline",
        navy: "bg-brand-navy text-white hover:bg-brand-navy-deep",
      },
      size: {
        default: "h-10 gap-2 px-4",
        sm: "h-8 gap-1.5 rounded-lg px-3 text-xs",
        lg: "h-11 gap-2 rounded-xl px-6 text-base",
        icon: "size-10",
        "icon-sm": "size-8 rounded-lg",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };

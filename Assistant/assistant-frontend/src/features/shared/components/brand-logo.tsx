import Link from "next/link";

import { APP_NAME, APP_SHORT_NAME } from "@/features/shared/constants";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  href?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
};

const sizeClassName = {
  sm: "text-[1.05rem] sm:text-lg",
  md: "text-xl sm:text-2xl",
  lg: "text-2xl sm:text-3xl",
} as const;

/**
 * ZUPdeCO wordmark — navy + orange, matching production branding.
 */
export function BrandLogo({
  href = "/assistant",
  className,
  size = "sm",
  onClick,
}: BrandLogoProps) {
  const wordmark = (
    <span
      className={cn(
        "font-display font-black tracking-tight",
        sizeClassName[size],
        className,
      )}
    >
      <span className="text-brand-navy">ZUP</span>
      <span className="text-brand-orange">deCO</span>
    </span>
  );

  if (!href) {
    return (
      <span aria-label={APP_NAME} title={APP_SHORT_NAME}>
        {wordmark}
      </span>
    );
  }

  return (
    <Link
      href={href}
      onClick={onClick}
      className="rounded-lg focus-visible:ring-3 focus-visible:ring-brand-orange/40 focus-visible:outline-none"
      aria-label={`${APP_NAME} home`}
      title={APP_SHORT_NAME}
    >
      {wordmark}
    </Link>
  );
}

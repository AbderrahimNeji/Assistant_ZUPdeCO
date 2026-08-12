import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <div className="space-y-1">
        <h2 className="font-display text-lg font-bold">Page not found</h2>
        <p className="text-sm text-muted-foreground">
          The page you are looking for does not exist.
        </p>
      </div>
      <Link
        href="/assistant"
        className={cn(buttonVariants({ variant: "brand" }))}
      >
        Back to assistant
      </Link>
    </div>
  );
}

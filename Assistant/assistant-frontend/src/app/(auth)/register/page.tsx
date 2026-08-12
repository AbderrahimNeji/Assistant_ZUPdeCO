import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BrandLogo } from "@/features/shared/components/brand-logo";
import { APP_NAME, APP_SHORT_NAME } from "@/features/shared/constants";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  return (
    <Card>
      <CardHeader className="gap-3">
        <BrandLogo href="/login" size="md" />
        <CardTitle className="text-2xl text-foreground">
          Invitation required
        </CardTitle>
        <CardDescription>Join {APP_NAME}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {APP_SHORT_NAME} access is limited to invited accounts. Contact your
          administrator if you need an invite.
        </p>
        <Link
          href="/login"
          className={cn(buttonVariants({ variant: "outline" }), "w-full")}
        >
          Back to sign in
        </Link>
      </CardContent>
    </Card>
  );
}

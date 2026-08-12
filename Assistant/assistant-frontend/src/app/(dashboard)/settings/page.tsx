import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageContainer } from "@/features/shared/components";

export default function SettingsPage() {
  return (
    <PageContainer
      title="Settings"
      description="Account preferences and assistant configuration."
    >
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>
            This area is not available in the current release.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Preferences will appear here when they ship. Your profile menu is
            available from the top navigation.
          </p>
        </CardContent>
      </Card>
    </PageContainer>
  );
}

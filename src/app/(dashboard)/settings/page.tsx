import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { Settings, User, Shield, Bell } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

/**
 * Settings Page
 *
 * User profile and app settings.
 * Shows current guild and permission level.
 */

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const permissionLabels = {
    ADMIN: "Administrator",
    EDITOR: "Editor",
    VIEWER: "Viewer",
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile
          </CardTitle>
          <CardDescription>
            Your Discord account information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={session.user.image || undefined} />
              <AvatarFallback>
                {session.user.name?.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-lg">{session.user.name}</p>
              <p className="text-sm text-muted-foreground">{session.user.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Guild & Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Guild & Permissions
          </CardTitle>
          <CardDescription>
            Your current guild and permission level
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Selected Guild</p>
              <p className="font-medium">
                {session.user.selectedGuildId || "No guild selected"}
              </p>
            </div>
            <Button variant="outline" asChild>
              <a href="/select-guild">Switch Guild</a>
            </Button>
          </div>

          <Separator />

          <div>
            <p className="text-sm text-muted-foreground mb-2">Permission Level</p>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  session.user.guildPermission === "ADMIN"
                    ? "default"
                    : session.user.guildPermission === "EDITOR"
                    ? "secondary"
                    : "outline"
                }
              >
                {session.user.guildPermission
                  ? permissionLabels[session.user.guildPermission]
                  : "Not set"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {session.user.guildPermission === "ADMIN" &&
                  "Full access to all features"}
                {session.user.guildPermission === "EDITOR" &&
                  "Can update stockpiles and create operations"}
                {session.user.guildPermission === "VIEWER" &&
                  "Read-only access"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications (placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>
            Configure how you receive alerts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Notification settings will be available in a future update.
          </p>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={async () => {
              "use server";
              const { signOut } = await import("@/lib/auth/auth");
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button variant="destructive" type="submit">
              Sign Out
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

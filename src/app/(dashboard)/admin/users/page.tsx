import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { Users, Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LocalTime } from "@/components/ui/local-time";

/**
 * Admin Users Page
 *
 * View all users who have logged in to the app.
 * Admin-only access.
 */
export default async function AdminUsersPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Check user has admin.manage_users permission
  if (!session.user.selectedRegimentId) {
    redirect("/select-regiment");
  }

  const hasPermission = session.user.permissions?.includes("admin.manage_users") ||
    session.user.regimentPermission === "ADMIN";

  if (!hasPermission) {
    redirect("/");
  }

  // Get all users
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      discordId: true,
      createdAt: true,
      updatedAt: true,
      selectedRegimentId: true,
      regimentMembers: {
        select: {
          regimentId: true,
          permissionLevel: true,
          regiment: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const permissionColors = {
    ADMIN: "default" as const,
    EDITOR: "secondary" as const,
    VIEWER: "outline" as const,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Users className="h-6 w-6" />
          User Management
        </h1>
        <p className="text-muted-foreground">
          View all users who have logged into the application
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            All Users
          </CardTitle>
          <CardDescription>
            {users.length} user{users.length !== 1 ? "s" : ""} registered
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Discord ID</TableHead>
                <TableHead>Regiments</TableHead>
                <TableHead>First Seen</TableHead>
                <TableHead>Last Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.image || undefined} />
                        <AvatarFallback>
                          {user.name?.substring(0, 2).toUpperCase() || "??"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {user.discordId}
                    </code>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.regimentMembers.length === 0 ? (
                        <span className="text-muted-foreground text-sm">None</span>
                      ) : (
                        user.regimentMembers.map((rm) => (
                          <Badge
                            key={rm.regimentId}
                            variant={permissionColors[rm.permissionLevel]}
                            className="text-xs"
                          >
                            {rm.regiment.name} ({rm.permissionLevel})
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <LocalTime date={user.createdAt} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <LocalTime date={user.updatedAt} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

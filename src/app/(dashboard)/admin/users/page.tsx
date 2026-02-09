"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Users, Shield, ChevronUp, ChevronDown, Pencil } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LocalTime } from "@/components/ui/local-time";

interface UserRole {
  roleId: string;
  roleName: string;
  source: string;
}

interface AdminUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  discordId: string | null;
  createdAt: string;
  updatedAt: string;
  memberCreatedAt: string;
  memberUpdatedAt: string;
  roles: UserRole[];
}

interface AvailableRole {
  id: string;
  name: string;
  description: string | null;
}

type SortField = "name" | "createdAt" | "updatedAt";
type SortDirection = "asc" | "desc";

/**
 * Admin Users Page
 *
 * View and manage regiment members, their roles, and manual role assignments.
 */
export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [availableRoles, setAvailableRoles] = useState<AvailableRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>("updatedAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Role assignment dialog state
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [selectedManualRoles, setSelectedManualRoles] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const hasPermission = session?.user?.permissions?.includes("admin.manage_users") ||
    session?.user?.regimentPermission === "ADMIN";

  // Redirect if not authorized
  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      router.push("/login");
    } else if (!session.user.selectedRegimentId) {
      router.push("/select-regiment");
    } else if (!hasPermission) {
      router.push("/");
    }
  }, [session, status, hasPermission, router]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/roles");
      if (res.ok) {
        const data = await res.json();
        // Roles API returns array directly
        setAvailableRoles(Array.isArray(data) ? data : data.roles || []);
      }
    } catch (error) {
      console.error("Failed to fetch roles:", error);
    }
  }, []);

  useEffect(() => {
    if (hasPermission) {
      fetchUsers();
      fetchRoles();
    }
  }, [hasPermission, fetchUsers, fetchRoles]);

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = (a.name || "").localeCompare(b.name || "");
          break;
        case "createdAt":
          cmp = new Date(a.memberCreatedAt).getTime() - new Date(b.memberCreatedAt).getTime();
          break;
        case "updatedAt":
          cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [users, sortField, sortDirection]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection(field === "name" ? "asc" : "desc");
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="h-3 w-3 inline ml-1" />
    ) : (
      <ChevronDown className="h-3 w-3 inline ml-1" />
    );
  }

  function openRoleDialog(user: AdminUser) {
    setEditingUser(user);
    // Initialize with current manual roles
    const manualRoles = new Set(
      user.roles.filter((r) => r.source === "manual").map((r) => r.roleId)
    );
    setSelectedManualRoles(manualRoles);
  }

  async function saveRoles() {
    if (!editingUser) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}/roles`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleIds: Array.from(selectedManualRoles) }),
      });
      if (res.ok) {
        // Refresh user list
        await fetchUsers();
        setEditingUser(null);
      }
    } catch (error) {
      console.error("Failed to save roles:", error);
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6" />
            User Management
          </h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!hasPermission) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Users className="h-6 w-6" />
          User Management
        </h1>
        <p className="text-muted-foreground">
          Manage regiment members and their role assignments
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Regiment Members
          </CardTitle>
          <CardDescription>
            {users.length} member{users.length !== 1 ? "s" : ""} in this regiment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("name")}
                >
                  User <SortIcon field="name" />
                </TableHead>
                <TableHead>Roles</TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("createdAt")}
                >
                  First Seen <SortIcon field="createdAt" />
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("updatedAt")}
                >
                  Last Active <SortIcon field="updatedAt" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedUsers.map((user) => (
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
                        <code className="text-xs text-muted-foreground">
                          {user.discordId}
                        </code>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1">
                      {user.roles.length === 0 ? (
                        <span className="text-muted-foreground text-sm">No roles</span>
                      ) : (
                        user.roles.map((r) => (
                          <Badge
                            key={`${r.roleId}-${r.source}`}
                            variant={r.source === "manual" ? "secondary" : "default"}
                            className="text-xs"
                          >
                            {r.roleName}
                            {r.source === "manual" && (
                              <span className="ml-1 opacity-60">M</span>
                            )}
                          </Badge>
                        ))
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 ml-1"
                        onClick={() => openRoleDialog(user)}
                        title="Manage roles"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <LocalTime date={user.memberCreatedAt} />
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

      {/* Role Assignment Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Roles: {editingUser?.name || "Unknown"}</DialogTitle>
            <DialogDescription>
              Assign manual roles to this user. Discord-synced roles are shown but cannot be
              removed here.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {availableRoles.map((role) => {
              const discordAssigned = editingUser?.roles.some(
                (r) => r.roleId === role.id && r.source === "discord"
              );
              const manualChecked = selectedManualRoles.has(role.id);
              const isChecked = discordAssigned || manualChecked;

              return (
                <div key={role.id} className="flex items-center gap-3">
                  <Checkbox
                    id={`role-${role.id}`}
                    checked={isChecked}
                    disabled={discordAssigned}
                    onCheckedChange={(checked) => {
                      if (discordAssigned) return;
                      const next = new Set(selectedManualRoles);
                      if (checked) {
                        next.add(role.id);
                      } else {
                        next.delete(role.id);
                      }
                      setSelectedManualRoles(next);
                    }}
                  />
                  <label
                    htmlFor={`role-${role.id}`}
                    className="flex-1 text-sm cursor-pointer"
                  >
                    <span className="font-medium">{role.name}</span>
                    {discordAssigned && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        Discord
                      </Badge>
                    )}
                    {role.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {role.description}
                      </p>
                    )}
                  </label>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button onClick={saveRoles} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

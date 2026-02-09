"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Shield, Plus, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RoleCard } from "@/components/features/admin/role-card";
import { RoleFormDialog } from "@/components/features/admin/role-form-dialog";
import { DiscordMappingDialog } from "@/components/features/admin/discord-mapping-dialog";

interface RolePermission {
  id: string;
  permission: string;
}

interface DiscordMapping {
  id: string;
  discordRoleId: string;
}

interface Role {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  position: number;
  permissions: RolePermission[];
  discordMappings: DiscordMapping[];
  _count: { memberRoles: number };
}

export default function AdminRolesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);

  // Permission check
  const hasPermission = session?.user?.permissions?.includes("admin.manage_roles");

  const fetchRoles = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/roles");
      if (res.status === 403) {
        router.push("/");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch roles");
      const data = await res.json();
      setRoles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load roles");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (session && !hasPermission) {
      router.push("/");
      return;
    }
    fetchRoles();
  }, [session, hasPermission, fetchRoles, router]);

  const handleCreateRole = async (data: { name: string; description: string; permissions: string[] }) => {
    const res = await fetch("/api/admin/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to create role");
    }
    await fetchRoles();
  };

  const handleEditRole = async (data: { name: string; description: string; permissions: string[] }) => {
    if (!editingRole) return;
    const res = await fetch(`/api/admin/roles/${editingRole.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to update role");
    }
    setEditingRole(null);
    await fetchRoles();
  };

  const handleDeleteRole = async () => {
    if (!deletingRole) return;
    const res = await fetch(`/api/admin/roles/${deletingRole.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json();
      setError(err.error || "Failed to delete role");
    }
    setDeletingRole(null);
    await fetchRoles();
  };

  const handleAddMapping = async (roleId: string, discordRoleId: string) => {
    const res = await fetch(`/api/admin/roles/${roleId}/mappings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discordRoleId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to add mapping");
    }
    await fetchRoles();
  };

  const handleRemoveMapping = async (roleId: string, discordRoleId: string) => {
    const res = await fetch(
      `/api/admin/roles/${roleId}/mappings?discordRoleId=${encodeURIComponent(discordRoleId)}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      const err = await res.json();
      setError(err.error || "Failed to remove mapping");
    }
    await fetchRoles();
  };

  // Collect all mappings for the mappings tab
  const allMappings = roles.flatMap((role) =>
    role.discordMappings.map((m) => ({
      ...m,
      roleId: role.id,
      roleName: role.name,
    }))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading roles...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Role Management
          </h1>
          <p className="text-muted-foreground">
            Create custom roles, assign permissions, and map Discord roles.
          </p>
        </div>
      </div>

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 px-4 py-3 rounded-md">
          {error}
          <button className="ml-2 underline" onClick={() => setError(null)}>
            dismiss
          </button>
        </div>
      )}

      <Tabs defaultValue="roles">
        <TabsList>
          <TabsTrigger value="roles">Roles ({roles.length})</TabsTrigger>
          <TabsTrigger value="mappings">
            Discord Mappings ({allMappings.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Role
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {roles.map((role) => (
              <RoleCard
                key={role.id}
                role={role}
                onEdit={() => setEditingRole(role)}
                onDelete={() => setDeletingRole(role)}
                onRemoveMapping={(discordRoleId) =>
                  handleRemoveMapping(role.id, discordRoleId)
                }
              />
            ))}
          </div>

          {roles.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No roles found. This shouldn&apos;t happen - try reloading the page.
            </div>
          )}
        </TabsContent>

        <TabsContent value="mappings" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={() => setMappingDialogOpen(true)}>
              <Link2 className="h-4 w-4 mr-2" />
              Add Mapping
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Discord Role ID</TableHead>
                <TableHead>App Role</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allMappings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    No Discord role mappings configured. Add mappings to automatically
                    assign app roles based on Discord roles.
                  </TableCell>
                </TableRow>
              ) : (
                allMappings.map((mapping) => (
                  <TableRow key={mapping.id}>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {mapping.discordRoleId}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{mapping.roleName}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() =>
                          handleRemoveMapping(mapping.roleId, mapping.discordRoleId)
                        }
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      {/* Create Role Dialog */}
      <RoleFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateRole}
        title="Create Role"
      />

      {/* Edit Role Dialog */}
      {editingRole && (
        <RoleFormDialog
          open={true}
          onOpenChange={(open) => !open && setEditingRole(null)}
          onSubmit={handleEditRole}
          title={`Edit ${editingRole.name}`}
          initialData={{
            name: editingRole.name,
            description: editingRole.description,
            permissions: editingRole.permissions.map((p) => p.permission),
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingRole}
        onOpenChange={(open) => !open && setDeletingRole(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the &quot;{deletingRole?.name}&quot; role?
              This will remove it from all members who have it assigned.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRole}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Discord Mapping Dialog */}
      <DiscordMappingDialog
        open={mappingDialogOpen}
        onOpenChange={setMappingDialogOpen}
        roles={roles.map((r) => ({ id: r.id, name: r.name }))}
        onSubmit={handleAddMapping}
      />
    </div>
  );
}

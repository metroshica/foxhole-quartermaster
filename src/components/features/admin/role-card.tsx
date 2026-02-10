"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Users, Link2 } from "lucide-react";
import {
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  type Permission,
} from "@/lib/auth/permissions";

interface RoleCardProps {
  role: {
    id: string;
    name: string;
    description: string | null;
    isDefault: boolean;
    permissions: { id: string; permission: string }[];
    discordMappings: { id: string; discordRoleId: string }[];
    _count: { memberRoles: number };
  };
  onEdit: () => void;
  onDelete: () => void;
  onRemoveMapping: (discordRoleId: string) => void;
}

export function RoleCard({ role, onEdit, onDelete, onRemoveMapping }: RoleCardProps) {
  const permissionSet = new Set(role.permissions.map((p) => p.permission));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {role.name}
              {role.isDefault && (
                <Badge variant="secondary" className="text-xs">
                  Default
                </Badge>
              )}
            </CardTitle>
            {role.description && (
              <p className="text-sm text-muted-foreground">{role.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={onEdit} title="Edit role">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              disabled={role.isDefault}
              title={role.isDefault ? "Cannot delete default roles" : "Delete role"}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Member count */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          {role._count.memberRoles} member{role._count.memberRoles !== 1 ? "s" : ""}
        </div>

        {/* Discord mappings */}
        {role.discordMappings.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Link2 className="h-3.5 w-3.5" />
              Discord Roles
            </div>
            <div className="flex flex-wrap gap-1.5">
              {role.discordMappings.map((mapping) => (
                <Badge
                  key={mapping.id}
                  variant="outline"
                  className="text-xs font-mono cursor-pointer hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 transition-colors"
                  onClick={() => onRemoveMapping(mapping.discordRoleId)}
                  title="Click to remove mapping"
                >
                  {mapping.discordRoleId}
                  <span className="ml-1 opacity-50">&times;</span>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Permissions grouped */}
        <div className="space-y-2">
          {PERMISSION_GROUPS.map((group) => {
            const groupPerms = group.permissions.filter((p) => permissionSet.has(p));
            if (groupPerms.length === 0) return null;

            return (
              <div key={group.name}>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  {group.name}
                </p>
                <div className="flex flex-wrap gap-1">
                  {groupPerms.map((perm) => (
                    <Badge key={perm} variant="secondary" className="text-xs">
                      {PERMISSION_LABELS[perm as Permission]}
                    </Badge>
                  ))}
                </div>
              </div>
            );
          })}
          {role.permissions.length === 0 && (
            <p className="text-sm text-muted-foreground italic">
              No permissions (read-only)
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

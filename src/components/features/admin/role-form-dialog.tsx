"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  type Permission,
} from "@/lib/auth/permissions";

interface RoleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; description: string; permissions: string[] }) => Promise<void>;
  initialData?: {
    name: string;
    description: string | null;
    permissions: string[];
  };
  title: string;
}

export function RoleFormDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  title,
}: RoleFormDialogProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
    new Set(initialData?.permissions ?? [])
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const togglePermission = (permission: string) => {
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(permission)) {
        next.delete(permission);
      } else {
        next.add(permission);
      }
      return next;
    });
  };

  const toggleGroup = (permissions: Permission[]) => {
    const allSelected = permissions.every((p) => selectedPermissions.has(p));
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      for (const p of permissions) {
        if (allSelected) {
          next.delete(p);
        } else {
          next.add(p);
        }
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        permissions: Array.from(selectedPermissions),
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save role");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Configure role name and assign permissions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="role-name">Name</Label>
            <Input
              id="role-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Logistics Officer"
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role-desc">Description</Label>
            <Textarea
              id="role-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this role..."
              rows={2}
              maxLength={200}
            />
          </div>

          <div className="space-y-3">
            <Label>Permissions</Label>
            {PERMISSION_GROUPS.map((group) => {
              const allSelected = group.permissions.every((p) =>
                selectedPermissions.has(p)
              );
              const someSelected = group.permissions.some((p) =>
                selectedPermissions.has(p)
              );

              return (
                <div key={group.name} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`group-${group.name}`}
                      checked={allSelected ? true : someSelected ? "indeterminate" : false}
                      onCheckedChange={() => toggleGroup(group.permissions)}
                    />
                    <Label
                      htmlFor={`group-${group.name}`}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {group.name}
                    </Label>
                  </div>
                  <div className="ml-6 space-y-1">
                    {group.permissions.map((permission) => (
                      <div key={permission} className="flex items-center gap-2">
                        <Checkbox
                          id={`perm-${permission}`}
                          checked={selectedPermissions.has(permission)}
                          onCheckedChange={() => togglePermission(permission)}
                        />
                        <Label
                          htmlFor={`perm-${permission}`}
                          className="text-sm font-normal text-muted-foreground cursor-pointer"
                        >
                          {PERMISSION_LABELS[permission as Permission]}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

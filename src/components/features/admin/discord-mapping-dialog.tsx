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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Role {
  id: string;
  name: string;
}

interface DiscordMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: Role[];
  onSubmit: (roleId: string, discordRoleId: string) => Promise<void>;
}

export function DiscordMappingDialog({
  open,
  onOpenChange,
  roles,
  onSubmit,
}: DiscordMappingDialogProps) {
  const [roleId, setRoleId] = useState("");
  const [discordRoleId, setDiscordRoleId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!roleId) {
      setError("Please select a role");
      return;
    }
    if (!discordRoleId.trim()) {
      setError("Discord Role ID is required");
      return;
    }
    if (!/^\d+$/.test(discordRoleId.trim())) {
      setError("Discord Role ID must be a number");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSubmit(roleId, discordRoleId.trim());
      setDiscordRoleId("");
      setRoleId("");
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add mapping");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Discord Role Mapping</DialogTitle>
          <DialogDescription>
            Map a Discord role ID to an application role. Members with the Discord role
            will automatically receive the app role on login.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label>Application Role</Label>
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role..." />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="discord-role-id">Discord Role ID</Label>
            <Input
              id="discord-role-id"
              value={discordRoleId}
              onChange={(e) => setDiscordRoleId(e.target.value)}
              placeholder="e.g., 1234567890123456"
            />
            <p className="text-xs text-muted-foreground">
              Enable Developer Mode in Discord, right-click a role, and click &quot;Copy Role ID&quot;.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Adding..." : "Add Mapping"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

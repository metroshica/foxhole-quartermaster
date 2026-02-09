"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Bug, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const OWNER_DISCORD_ID = "112967182752768000";

interface RoleOption {
  id: string;
  name: string;
}

/**
 * DevModeBar - Fixed bottom bar for owner to test the site as specific roles.
 * Only visible to the owner (Discord ID 112967182752768000).
 *
 * States:
 * - Inactive: Small "DEV" button in bottom-right corner
 * - Active: Full-width amber bar showing current dev mode roles
 */
export function DevModeBar() {
  const { data: session, update } = useSession();
  const [devModeActive, setDevModeActive] = useState(false);
  const [activeRoleIds, setActiveRoleIds] = useState<string[]>([]);
  const [availableRoles, setAvailableRoles] = useState<RoleOption[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const isOwner = session?.user?.discordId === OWNER_DISCORD_ID;

  const fetchDevModeState = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/dev-mode");
      if (res.ok) {
        const data = await res.json();
        setDevModeActive(data.devModeActive);
        setActiveRoleIds(data.roleIds || []);
        setSelectedRoles(new Set(data.roleIds || []));
      }
    } catch {
      // Silently fail
    }
  }, []);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/roles");
      if (res.ok) {
        const data = await res.json();
        const roles = Array.isArray(data) ? data : data.roles || [];
        setAvailableRoles(roles.map((r: { id: string; name: string }) => ({
          id: r.id,
          name: r.name,
        })));
      }
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    if (isOwner) {
      fetchDevModeState();
      fetchRoles();
    }
  }, [isOwner, fetchDevModeState, fetchRoles]);

  // Also check session.devModeActive for initial state
  useEffect(() => {
    if (session?.user?.devModeActive !== undefined) {
      setDevModeActive(session.user.devModeActive);
    }
  }, [session?.user?.devModeActive]);

  if (!isOwner) return null;

  async function applyDevMode(roleIds: string[] | null) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/dev-mode", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleIds }),
      });
      if (res.ok) {
        const data = await res.json();
        setDevModeActive(data.devModeActive);
        setActiveRoleIds(data.roleIds || []);
        setPopoverOpen(false);
        // Trigger session refresh so permissions update
        await update();
        // Reload to pick up new permissions throughout the app
        window.location.reload();
      }
    } catch {
      // Silently fail
    } finally {
      setSaving(false);
    }
  }

  function handleApply() {
    applyDevMode(Array.from(selectedRoles));
  }

  function handleExit() {
    applyDevMode(null);
  }

  function handleActivate() {
    // Start dev mode with no roles selected (will be empty = no permissions)
    setPopoverOpen(true);
  }

  const activeRoleNames = activeRoleIds
    .map((id) => availableRoles.find((r) => r.id === id)?.name)
    .filter(Boolean);

  // Active dev mode: full-width bar
  if (devModeActive) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-amber-500 text-amber-950 border-t-2 border-amber-600 shadow-lg">
        <div className="flex items-center justify-between px-4 py-2 md:pl-68">
          <div className="flex items-center gap-3">
            <Bug className="h-4 w-4 shrink-0" />
            <span className="text-sm font-semibold">
              Dev Mode:{" "}
              {activeRoleNames.length > 0
                ? activeRoleNames.join(", ")
                : "No roles (zero permissions)"}
            </span>
            <Badge variant="outline" className="bg-amber-400/50 border-amber-700 text-amber-950 text-xs">
              {session?.user?.permissions?.length || 0} permissions
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-amber-400/50 border-amber-700 text-amber-950 hover:bg-amber-400/70"
                >
                  Change Roles
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="end" side="top">
                <div className="space-y-3">
                  <p className="text-sm font-medium">Select roles to emulate:</p>
                  {availableRoles.map((role) => (
                    <div key={role.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`dev-role-${role.id}`}
                        checked={selectedRoles.has(role.id)}
                        onCheckedChange={(checked) => {
                          const next = new Set(selectedRoles);
                          if (checked) {
                            next.add(role.id);
                          } else {
                            next.delete(role.id);
                          }
                          setSelectedRoles(next);
                        }}
                      />
                      <label
                        htmlFor={`dev-role-${role.id}`}
                        className="text-sm cursor-pointer"
                      >
                        {role.name}
                      </label>
                    </div>
                  ))}
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={handleApply}
                    disabled={saving}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    {saving ? "Applying..." : "Apply"}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <Button
              size="sm"
              variant="outline"
              className="bg-amber-400/50 border-amber-700 text-amber-950 hover:bg-red-500/30"
              onClick={handleExit}
              disabled={saving}
            >
              <X className="h-3 w-3 mr-1" />
              Exit
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Inactive: small toggle button in bottom-right
  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="fixed bottom-4 right-4 z-50 bg-background/80 backdrop-blur border-amber-500/50 text-amber-600 hover:bg-amber-500/10 hover:text-amber-500"
          onClick={handleActivate}
        >
          <Bug className="h-3 w-3 mr-1" />
          DEV
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end" side="top">
        <div className="space-y-3">
          <p className="text-sm font-medium">Select roles to emulate:</p>
          {availableRoles.map((role) => (
            <div key={role.id} className="flex items-center gap-2">
              <Checkbox
                id={`dev-role-inactive-${role.id}`}
                checked={selectedRoles.has(role.id)}
                onCheckedChange={(checked) => {
                  const next = new Set(selectedRoles);
                  if (checked) {
                    next.add(role.id);
                  } else {
                    next.delete(role.id);
                  }
                  setSelectedRoles(next);
                }}
              />
              <label
                htmlFor={`dev-role-inactive-${role.id}`}
                className="text-sm cursor-pointer"
              >
                {role.name}
              </label>
            </div>
          ))}
          <Button
            size="sm"
            className="w-full"
            onClick={handleApply}
            disabled={saving}
          >
            <Check className="h-3 w-3 mr-1" />
            {saving ? "Activating..." : "Activate Dev Mode"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Settings, Hash, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Channel {
  id: string;
  name: string;
  position: number;
}

export default function AdminSettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [savedChannelId, setSavedChannelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isAdmin =
    session?.user?.permissions?.includes("admin.manage_roles") ||
    session?.user?.permissions?.includes("admin.manage_users");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [channelRes, configRes] = await Promise.all([
        fetch("/api/admin/activity-channel/channels"),
        fetch("/api/admin/activity-channel"),
      ]);

      if (channelRes.ok) {
        const channelData = await channelRes.json();
        setChannels(channelData);
      } else {
        const err = await channelRes.json();
        setError(err.error || "Failed to load channels");
      }

      if (configRes.ok) {
        const configData = await configRes.json();
        setSelectedChannelId(configData.channelId);
        setSavedChannelId(configData.channelId);
      }
    } catch {
      setError("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin, fetchData]);

  if (!isAdmin) {
    router.push("/");
    return null;
  }

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const res = await fetch("/api/admin/activity-channel", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: selectedChannelId }),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Failed to save");
        return;
      }

      setSavedChannelId(selectedChannelId);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleDisable = async () => {
    setSelectedChannelId(null);
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const res = await fetch("/api/admin/activity-channel", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: null }),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Failed to disable");
        return;
      }

      setSavedChannelId(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = selectedChannelId !== savedChannelId;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-faction" />
        <h1 className="text-2xl font-bold">Admin Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Activity Log Channel
          </CardTitle>
          <CardDescription>
            Send activity notifications (scans, refreshes, production updates, operations) to a
            Discord channel. The bot must be in your server for this to work.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading channels...
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <Select
                  value={selectedChannelId || "none"}
                  onValueChange={(value) =>
                    setSelectedChannelId(value === "none" ? null : value)
                  }
                >
                  <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="Select a channel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-muted-foreground">Disabled</span>
                    </SelectItem>
                    {channels.map((channel) => (
                      <SelectItem key={channel.id} value={channel.id}>
                        # {channel.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button onClick={handleSave} disabled={saving || !hasChanges}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    "Save"
                  )}
                </Button>

                {savedChannelId && (
                  <Button variant="outline" onClick={handleDisable} disabled={saving}>
                    Disable
                  </Button>
                )}
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              {success && (
                <p className="text-sm text-green-500">Settings saved successfully.</p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

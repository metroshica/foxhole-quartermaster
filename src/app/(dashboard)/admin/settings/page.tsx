"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Settings, Hash, Camera, Loader2 } from "lucide-react";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Activity channel state
  const [activityChannelId, setActivityChannelId] = useState<string | null>(null);
  const [savedActivityChannelId, setSavedActivityChannelId] = useState<string | null>(null);
  const [savingActivity, setSavingActivity] = useState(false);
  const [activitySuccess, setActivitySuccess] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);

  // Scanner channel state
  const [scannerChannelId, setScannerChannelId] = useState<string | null>(null);
  const [savedScannerChannelId, setSavedScannerChannelId] = useState<string | null>(null);
  const [savingScanner, setSavingScanner] = useState(false);
  const [scannerSuccess, setScannerSuccess] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);

  const isAdmin =
    session?.user?.permissions?.includes("admin.manage_roles") ||
    session?.user?.permissions?.includes("admin.manage_users");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [channelRes, activityConfigRes, scannerConfigRes] = await Promise.all([
        fetch("/api/admin/activity-channel/channels"),
        fetch("/api/admin/activity-channel"),
        fetch("/api/admin/scanner-channel"),
      ]);

      if (channelRes.ok) {
        const channelData = await channelRes.json();
        setChannels(channelData);
      } else {
        const err = await channelRes.json();
        setError(err.error || "Failed to load channels");
      }

      if (activityConfigRes.ok) {
        const configData = await activityConfigRes.json();
        setActivityChannelId(configData.channelId);
        setSavedActivityChannelId(configData.channelId);
      }

      if (scannerConfigRes.ok) {
        const configData = await scannerConfigRes.json();
        setScannerChannelId(configData.channelId);
        setSavedScannerChannelId(configData.channelId);
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

  const handleSaveActivity = async () => {
    try {
      setSavingActivity(true);
      setActivityError(null);
      setActivitySuccess(false);

      const res = await fetch("/api/admin/activity-channel", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: activityChannelId }),
      });

      if (!res.ok) {
        const err = await res.json();
        setActivityError(err.error || "Failed to save");
        return;
      }

      setSavedActivityChannelId(activityChannelId);
      setActivitySuccess(true);
      setTimeout(() => setActivitySuccess(false), 3000);
    } catch {
      setActivityError("Failed to save settings");
    } finally {
      setSavingActivity(false);
    }
  };

  const handleDisableActivity = async () => {
    setActivityChannelId(null);
    try {
      setSavingActivity(true);
      setActivityError(null);
      setActivitySuccess(false);

      const res = await fetch("/api/admin/activity-channel", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: null }),
      });

      if (!res.ok) {
        const err = await res.json();
        setActivityError(err.error || "Failed to disable");
        return;
      }

      setSavedActivityChannelId(null);
      setActivitySuccess(true);
      setTimeout(() => setActivitySuccess(false), 3000);
    } catch {
      setActivityError("Failed to save settings");
    } finally {
      setSavingActivity(false);
    }
  };

  const handleSaveScanner = async () => {
    try {
      setSavingScanner(true);
      setScannerError(null);
      setScannerSuccess(false);

      const res = await fetch("/api/admin/scanner-channel", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: scannerChannelId }),
      });

      if (!res.ok) {
        const err = await res.json();
        setScannerError(err.error || "Failed to save");
        return;
      }

      setSavedScannerChannelId(scannerChannelId);
      setScannerSuccess(true);
      setTimeout(() => setScannerSuccess(false), 3000);
    } catch {
      setScannerError("Failed to save settings");
    } finally {
      setSavingScanner(false);
    }
  };

  const handleDisableScanner = async () => {
    setScannerChannelId(null);
    try {
      setSavingScanner(true);
      setScannerError(null);
      setScannerSuccess(false);

      const res = await fetch("/api/admin/scanner-channel", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: null }),
      });

      if (!res.ok) {
        const err = await res.json();
        setScannerError(err.error || "Failed to disable");
        return;
      }

      setSavedScannerChannelId(null);
      setScannerSuccess(true);
      setTimeout(() => setScannerSuccess(false), 3000);
    } catch {
      setScannerError("Failed to save settings");
    } finally {
      setSavingScanner(false);
    }
  };

  const activityHasChanges = activityChannelId !== savedActivityChannelId;
  const scannerHasChanges = scannerChannelId !== savedScannerChannelId;

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
                  value={activityChannelId || "none"}
                  onValueChange={(value) =>
                    setActivityChannelId(value === "none" ? null : value)
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

                <Button onClick={handleSaveActivity} disabled={savingActivity || !activityHasChanges}>
                  {savingActivity ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    "Save"
                  )}
                </Button>

                {savedActivityChannelId && (
                  <Button variant="outline" onClick={handleDisableActivity} disabled={savingActivity}>
                    Disable
                  </Button>
                )}
              </div>

              {activityError && (
                <p className="text-sm text-destructive">{activityError}</p>
              )}

              {activitySuccess && (
                <p className="text-sm text-green-500">Settings saved successfully.</p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Scanner Channel
          </CardTitle>
          <CardDescription>
            Watch a Discord channel for stockpile screenshots. When someone posts an image, the bot
            will scan it and offer to save the results.
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
                  value={scannerChannelId || "none"}
                  onValueChange={(value) =>
                    setScannerChannelId(value === "none" ? null : value)
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

                <Button onClick={handleSaveScanner} disabled={savingScanner || !scannerHasChanges}>
                  {savingScanner ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    "Save"
                  )}
                </Button>

                {savedScannerChannelId && (
                  <Button variant="outline" onClick={handleDisableScanner} disabled={savingScanner}>
                    Disable
                  </Button>
                )}
              </div>

              {scannerError && (
                <p className="text-sm text-destructive">{scannerError}</p>
              )}

              {scannerSuccess && (
                <p className="text-sm text-green-500">Settings saved successfully.</p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

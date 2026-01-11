"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

/**
 * Guild Selection Page
 *
 * After Discord OAuth, users are redirected here to select which guild
 * they want to use the app with. This supports multi-guild scenarios
 * (e.g., user is in multiple regiments).
 *
 * Flow:
 * 1. Fetch user's guilds from /api/discord/guilds
 * 2. Display guild cards with icons
 * 3. On selection, POST to /api/auth/select-guild
 * 4. Redirect to dashboard
 */

interface Guild {
  id: string;
  name: string;
  icon: string | null;
  isOwner: boolean;
  isConfigured: boolean;
}

export default function SelectGuildPage() {
  const router = useRouter();
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGuilds();
  }, []);

  async function fetchGuilds() {
    try {
      const response = await fetch("/api/discord/guilds");
      if (!response.ok) {
        throw new Error("Failed to fetch guilds");
      }
      const data = await response.json();
      setGuilds(data.guilds);
    } catch (err) {
      setError("Failed to load your Discord servers. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function selectGuild(guild: Guild) {
    setSelecting(guild.id);
    setError(null);

    try {
      const response = await fetch("/api/auth/select-guild", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guildId: guild.id,
          guildName: guild.name,
          guildIcon: guild.icon,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to select guild");
      }

      // Redirect to dashboard
      // Force a hard navigation to refresh the session
      window.location.href = "/";
    } catch (err) {
      setError("Failed to select guild. Please try again.");
      console.error(err);
      setSelecting(null);
    }
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle>Loading...</CardTitle>
          <CardDescription>Fetching your Discord servers</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <CardTitle>Select Your Regiment</CardTitle>
        <CardDescription>
          Choose which Discord server to use with Quartermaster
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {guilds.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No eligible Discord servers found.</p>
            <p className="mt-2 text-sm">
              Make sure you&apos;re a member of an authorized regiment server.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {guilds.map((guild) => (
              <button
                key={guild.id}
                onClick={() => selectGuild(guild)}
                disabled={selecting !== null}
                className="w-full flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={guild.icon || undefined} alt={guild.name} />
                  <AvatarFallback>
                    {guild.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{guild.name}</span>
                    {guild.isOwner && (
                      <Badge variant="secondary" className="text-xs">
                        Owner
                      </Badge>
                    )}
                    {guild.isConfigured && (
                      <Badge variant="outline" className="text-xs">
                        Configured
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {guild.isConfigured
                      ? "Ready to use"
                      : "Will be set up on first use"}
                  </p>
                </div>
                {selecting === guild.id ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                ) : (
                  <svg
                    className="h-5 w-5 text-muted-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="mt-6 pt-4 border-t text-center">
          <Button
            variant="ghost"
            onClick={() => router.push("/login")}
            className="text-sm text-muted-foreground"
          >
            Sign out and use a different account
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

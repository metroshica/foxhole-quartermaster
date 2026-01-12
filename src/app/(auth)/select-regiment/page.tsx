"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

/**
 * Regiment Selection Page
 *
 * After Discord OAuth, users are redirected here to select which regiment
 * (Discord server) they want to use the app with. This supports multi-regiment
 * scenarios (e.g., user is in multiple regiments).
 *
 * Flow:
 * 1. Fetch user's regiments from /api/discord/regiments
 * 2. Display regiment cards with icons
 * 3. On selection, POST to /api/auth/select-regiment
 * 4. Redirect to dashboard
 */

interface Regiment {
  id: string;
  name: string;
  icon: string | null;
  isOwner: boolean;
  isConfigured: boolean;
}

export default function SelectRegimentPage() {
  const router = useRouter();
  const [regiments, setRegiments] = useState<Regiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRegiments();
  }, []);

  async function fetchRegiments() {
    try {
      const response = await fetch("/api/discord/regiments");
      if (!response.ok) {
        throw new Error("Failed to fetch regiments");
      }
      const data = await response.json();
      setRegiments(data.regiments);
    } catch (err) {
      setError("Failed to load your Discord servers. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function selectRegiment(regiment: Regiment) {
    setSelecting(regiment.id);
    setError(null);

    try {
      const response = await fetch("/api/auth/select-regiment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          regimentId: regiment.id,
          regimentName: regiment.name,
          regimentIcon: regiment.icon,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to select regiment");
      }

      // Redirect to dashboard
      // Force a hard navigation to refresh the session
      window.location.href = "/";
    } catch (err) {
      setError("Failed to select regiment. Please try again.");
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

        {regiments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No eligible Discord servers found.</p>
            <p className="mt-2 text-sm">
              Make sure you&apos;re a member of an authorized regiment server.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {regiments.map((regiment) => (
              <button
                key={regiment.id}
                onClick={() => selectRegiment(regiment)}
                disabled={selecting !== null}
                className="w-full flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={regiment.icon || undefined} alt={regiment.name} />
                  <AvatarFallback>
                    {regiment.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{regiment.name}</span>
                    {regiment.isOwner && (
                      <Badge variant="secondary" className="text-xs">
                        Owner
                      </Badge>
                    )}
                    {regiment.isConfigured && (
                      <Badge variant="outline" className="text-xs">
                        Configured
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {regiment.isConfigured
                      ? "Ready to use"
                      : "Will be set up on first use"}
                  </p>
                </div>
                {selecting === regiment.id ? (
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

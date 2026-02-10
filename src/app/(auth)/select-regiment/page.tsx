"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronRight } from "lucide-react";

/**
 * Regiment Selection Page
 *
 * After Discord OAuth, users are redirected here to select which regiment
 * (Discord server) they want to use the app with.
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
  return (
    <Suspense
      fallback={
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
            <p className="text-muted-foreground">Loading regiments...</p>
          </CardContent>
        </Card>
      }
    >
      <SelectRegimentContent />
    </Suspense>
  );
}

function SelectRegimentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
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
      setError("Failed to load your regiments. Please try again.");
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

      // Redirect to the original page (or dashboard)
      // Force a hard navigation to refresh the session
      window.location.href = callbackUrl;
    } catch (err) {
      setError("Failed to select regiment. Please try again.");
      console.error(err);
      setSelecting(null);
    }
  }

  if (loading) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
          <p className="text-muted-foreground">Loading regiments...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-xl">Select Regiment</CardTitle>
        <CardDescription>
          Choose your regiment to continue
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
            <p className="font-medium">No regiments available</p>
            <p className="mt-2 text-sm">
              Contact your regiment administrator for access.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {regiments.map((regiment) => (
              <button
                key={regiment.id}
                onClick={() => selectRegiment(regiment)}
                disabled={selecting !== null}
                className="w-full flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-accent hover:border-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left group"
              >
                <Avatar className="h-12 w-12 ring-2 ring-background">
                  <AvatarImage src={regiment.icon || undefined} alt={regiment.name} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {regiment.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-base block truncate group-hover:text-primary transition-colors">
                    {regiment.name}
                  </span>
                </div>
                {selecting === regiment.id ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent shrink-0" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}

        <div className="mt-6 pt-4 border-t text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/login")}
            className="text-muted-foreground"
          >
            Use a different account
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

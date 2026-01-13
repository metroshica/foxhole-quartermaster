"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Swords, Loader2 } from "lucide-react";

interface WarState {
  warNumber: number;
  warDay: number | null;
  winner: "NONE" | "WARDENS" | "COLONIALS";
  isActive: boolean;
}

export function WarStatus() {
  const [war, setWar] = useState<WarState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWarStatus() {
      try {
        const response = await fetch("/api/war");
        if (response.ok) {
          const data = await response.json();
          setWar(data);
        } else {
          setError("Failed to fetch war status");
        }
      } catch (err) {
        setError("Failed to fetch war status");
        console.error("Failed to fetch war status:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchWarStatus();

    // Refresh every 5 minutes
    const interval = setInterval(fetchWarStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading war status...</span>
      </div>
    );
  }

  if (error || !war) {
    return null; // Silently fail - war status is non-critical
  }

  return (
    <div className="flex items-center gap-3">
      <Swords className="h-5 w-5 text-amber-500" />
      <div className="flex items-center gap-2">
        <span className="font-semibold">War {war.warNumber}</span>
        {war.isActive && war.warDay && (
          <>
            <span className="text-muted-foreground">-</span>
            <span className="text-muted-foreground">Day {war.warDay}</span>
          </>
        )}
        {war.winner !== "NONE" && (
          <Badge
            variant={war.winner === "WARDENS" ? "default" : "secondary"}
            className={
              war.winner === "WARDENS"
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-green-600 hover:bg-green-700"
            }
          >
            {war.winner === "WARDENS" ? "Warden Victory" : "Colonial Victory"}
          </Badge>
        )}
        {war.isActive && (
          <Badge variant="outline" className="text-green-500 border-green-500">
            Active
          </Badge>
        )}
      </div>
    </div>
  );
}

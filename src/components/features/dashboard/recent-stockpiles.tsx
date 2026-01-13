"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, MapPin, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Stockpile {
  id: string;
  name: string;
  type: "STORAGE_DEPOT" | "SEAPORT";
  hex: string;
  locationName: string;
  updatedAt: string;
  _count: {
    items: number;
  };
  lastScan?: {
    id: string;
    createdAt: string;
    scannedBy: {
      id: string;
      name: string | null;
      image: string | null;
    };
  } | null;
}

interface RecentStockpilesProps {
  refreshTrigger?: number;
}

/**
 * Scan Status Component
 *
 * Displays stockpile scan freshness in an informational format.
 * Color coding:
 * - Green: < 2 hours (fresh)
 * - Yellow: 2-6 hours (getting stale)
 * - Orange: 6-24 hours (stale)
 * - Red: > 24 hours (very stale)
 */
export function RecentStockpiles({ refreshTrigger = 0 }: RecentStockpilesProps) {
  const router = useRouter();
  const [stockpiles, setStockpiles] = useState<Stockpile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const fetchStockpiles = useCallback(async (animate = false) => {
    const startTime = Date.now();

    if (animate) {
      setIsTransitioning(true);
    }

    setLoading(true);
    try {
      const response = await fetch("/api/stockpiles");
      if (response.ok) {
        const data = await response.json();
        // Take only the 8 most recent for the overview
        setStockpiles(data.slice(0, 8));
      }
    } catch (error) {
      console.error("Error fetching stockpiles:", error);
    } finally {
      setLoading(false);
      if (animate) {
        // Ensure minimum 350ms transition time for visual feedback
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 350 - elapsed);
        setTimeout(() => setIsTransitioning(false), remaining);
      }
    }
  }, []);

  useEffect(() => {
    fetchStockpiles();
  }, [fetchStockpiles]);

  // Refresh when trigger changes (with animation)
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchStockpiles(true);
    }
  }, [refreshTrigger, fetchStockpiles]);

  const getTimeInfo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    let text: string;
    let status: "fresh" | "okay" | "stale" | "old";

    if (diffMins < 1) {
      text = "Just now";
      status = "fresh";
    } else if (diffMins < 60) {
      text = `${diffMins}m ago`;
      status = diffMins < 30 ? "fresh" : "okay";
    } else if (diffHours < 2) {
      text = `${diffHours}h ago`;
      status = "fresh";
    } else if (diffHours < 6) {
      text = `${diffHours}h ago`;
      status = "okay";
    } else if (diffHours < 24) {
      text = `${diffHours}h ago`;
      status = "stale";
    } else if (diffDays < 7) {
      text = `${diffDays}d ago`;
      status = "old";
    } else {
      text = date.toLocaleDateString();
      status = "old";
    }

    return { text, status };
  };

  const getStatusColor = (status: "fresh" | "okay" | "stale" | "old") => {
    switch (status) {
      case "fresh":
        return "text-green-600 dark:text-green-400";
      case "okay":
        return "text-yellow-600 dark:text-yellow-400";
      case "stale":
        return "text-orange-600 dark:text-orange-400";
      case "old":
        return "text-red-600 dark:text-red-400";
    }
  };

  const getStatusBg = (status: "fresh" | "okay" | "stale" | "old") => {
    switch (status) {
      case "fresh":
        return "bg-green-500/10";
      case "okay":
        return "bg-yellow-500/10";
      case "stale":
        return "bg-orange-500/10";
      case "old":
        return "bg-red-500/10";
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Scan Status
          </CardTitle>
          <CardDescription>
            Click a stockpile to view details
          </CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={() => fetchStockpiles(true)} disabled={loading || isTransitioning}>
          <RefreshCw className={`h-4 w-4 ${loading || isTransitioning ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent>
        <div className={`transition-opacity duration-150 ${isTransitioning ? "opacity-60" : "opacity-100"}`}>
          {stockpiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No stockpiles yet</p>
              <p className="text-sm mt-1">Upload your first screenshot to get started</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {stockpiles.map((stockpile) => {
                const timeInfo = getTimeInfo(stockpile.updatedAt);

                return (
                  <div
                    key={stockpile.id}
                    className={cn(
                      "p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md",
                      getStatusBg(timeInfo.status)
                    )}
                    onClick={() => router.push(`/stockpiles/${stockpile.id}`)}
                  >
                    {/* Stockpile Name & Location */}
                    <div className="mb-2">
                      <div className="font-semibold truncate">{stockpile.name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {stockpile.hex} - {stockpile.locationName}
                      </div>
                    </div>

                    {/* Scan Age - Prominently displayed */}
                    <div className={cn(
                      "text-lg font-bold mb-2",
                      getStatusColor(timeInfo.status)
                    )}>
                      {timeInfo.text}
                    </div>

                    {/* Scanner Info */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {stockpile.lastScan?.scannedBy ? (
                          <>
                            <Avatar className="h-5 w-5">
                              <AvatarImage
                                src={stockpile.lastScan.scannedBy.image || undefined}
                                alt={stockpile.lastScan.scannedBy.name || "Scanner"}
                              />
                              <AvatarFallback className="text-xs">
                                {stockpile.lastScan.scannedBy.name?.substring(0, 1).toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                              {stockpile.lastScan.scannedBy.name || "Unknown"}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Unknown scanner
                          </span>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {stockpile._count.items} items
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

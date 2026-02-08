"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Clock, MapPin, RefreshCw, Timer } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { StockpileRefreshTimer } from "@/components/features/stockpiles/stockpile-refresh-timer";

interface Stockpile {
  id: string;
  name: string;
  type: "STORAGE_DEPOT" | "SEAPORT";
  hex: string;
  locationName: string;
  updatedAt: string;
  lastRefreshedAt: string | null;
  totalCrates: number;
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
  onRefresh?: () => void;
}

/**
 * Scan Status Component
 *
 * Displays stockpile scan freshness in an informational format.
 * Time updates live every minute without page refresh.
 * Color coding:
 * - Green: < 90 minutes (fresh)
 * - Yellow: 90 minutes - 6 hours (getting stale)
 * - Orange: 6 - 12 hours (stale)
 * - Red: > 12 hours (very stale, worst at 24h+)
 */
export function RecentStockpiles({ refreshTrigger = 0, onRefresh }: RecentStockpilesProps) {
  const router = useRouter();
  const [stockpiles, setStockpiles] = useState<Stockpile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  // Tick state to force re-render every minute for live time updates
  const [, setTick] = useState(0);

  // Update time display every minute without page refresh
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

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

  const handleRefresh = async (e: React.MouseEvent, stockpileId: string) => {
    e.stopPropagation(); // Prevent navigation to stockpile detail
    setRefreshingId(stockpileId);
    try {
      const response = await fetch(`/api/stockpiles/${stockpileId}/refresh`, {
        method: "POST",
      });
      if (response.ok) {
        // Refresh the stockpiles list to show updated timer
        await fetchStockpiles(true);
        // Notify parent to refresh leaderboard
        onRefresh?.();
      }
    } catch (error) {
      console.error("Error refreshing stockpile:", error);
    } finally {
      setRefreshingId(null);
    }
  };

  const getTimeInfo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    let text: string;
    let status: "fresh" | "okay" | "stale" | "old";

    // Format the time text
    if (diffMins < 1) {
      text = "Just now";
    } else if (diffMins < 60) {
      text = `${diffMins}m ago`;
    } else if (diffHours < 24) {
      const remainingMins = diffMins % 60;
      text = remainingMins > 0 ? `${diffHours}h ${remainingMins}m ago` : `${diffHours}h ago`;
    } else if (diffDays < 7) {
      text = `${diffDays}d ago`;
    } else {
      text = date.toLocaleDateString();
    }

    // Determine status based on new thresholds:
    // - Green (fresh): < 90 minutes
    // - Yellow (okay): 90 minutes - 6 hours
    // - Orange (stale): 6 - 12 hours
    // - Red (old): > 12 hours
    if (diffMins < 90) {
      status = "fresh";
    } else if (diffHours < 6) {
      status = "okay";
    } else if (diffHours < 12) {
      status = "stale";
    } else {
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
            <div className="h-8 w-8 rounded-md bg-faction-muted flex items-center justify-center">
              <Clock className="h-4 w-4 text-faction" />
            </div>
            <span>Scan Status</span>
          </CardTitle>
          <CardDescription className="mt-1.5">
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
                // Use lastScan.createdAt for scan age (when the OCR scan actually happened)
                // Fall back to updatedAt only if no scan exists
                const scanTime = stockpile.lastScan?.createdAt || stockpile.updatedAt;
                const timeInfo = getTimeInfo(scanTime);

                return (
                  <div
                    key={stockpile.id}
                    className={cn(
                      "p-3 rounded-lg border border-border/50 cursor-pointer transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-md group",
                      getStatusBg(timeInfo.status),
                      timeInfo.status === "fresh" && "hover:status-glow-green",
                      timeInfo.status === "okay" && "hover:status-glow-yellow",
                      timeInfo.status === "stale" && "hover:status-glow-orange",
                      timeInfo.status === "old" && "hover:status-glow-red"
                    )}
                    onClick={() => router.push(`/stockpiles/${stockpile.id}`)}
                  >
                    {/* Stockpile Name & Location */}
                    <div className="mb-2">
                      <div className="font-semibold truncate group-hover:text-foreground transition-colors">{stockpile.name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {stockpile.hex} - {stockpile.locationName}
                      </div>
                    </div>

                    {/* Scan Age - Prominently displayed */}
                    <div className={cn(
                      "text-xl font-bold mb-2 tracking-tight",
                      getStatusColor(timeInfo.status)
                    )}>
                      {timeInfo.text}
                    </div>

                    {/* Scanner Info */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {stockpile.lastScan?.scannedBy ? (
                          <>
                            <Avatar className="h-6 w-6 ring-1 ring-border/50">
                              <AvatarImage
                                src={stockpile.lastScan.scannedBy.image || undefined}
                                alt={stockpile.lastScan.scannedBy.name || "Scanner"}
                              />
                              <AvatarFallback className="text-xs bg-muted">
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
                      <Badge variant="outline" className="text-xs font-medium">
                        {stockpile.totalCrates.toLocaleString()} crates
                      </Badge>
                    </div>

                    {/* Refresh Timer - separate from scan */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/30">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Timer className="h-3 w-3" />
                        <span>Refresh:</span>
                        <StockpileRefreshTimer
                          lastRefreshedAt={stockpile.lastRefreshedAt}
                          variant="compact"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs hover:bg-faction-muted hover:text-faction"
                        onClick={(e) => handleRefresh(e, stockpile.id)}
                        disabled={refreshingId === stockpile.id}
                      >
                        <img
                          src="/icons/ui/btReserve.png"
                          alt="Refresh"
                          className={cn(
                            "h-4 w-4 mr-1",
                            refreshingId === stockpile.id && "animate-spin"
                          )}
                        />
                        Refresh
                      </Button>
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

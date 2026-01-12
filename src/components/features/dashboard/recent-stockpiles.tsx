"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, MapPin, Package, RefreshCw, Upload } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  onQuickUpdate?: (stockpileId: string, stockpileName: string) => void;
  refreshTrigger?: number;
}

export function RecentStockpiles({ onQuickUpdate, refreshTrigger = 0 }: RecentStockpilesProps) {
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
        // Take only the 5 most recent
        setStockpiles(data.slice(0, 5));
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

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Stockpiles
          </CardTitle>
          <CardDescription>
            Quickly update your recently modified stockpiles
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
              <Button
                variant="link"
                className="mt-2"
                onClick={() => router.push("/upload")}
              >
                Upload your first screenshot
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {stockpiles.map((stockpile) => (
                <div
                  key={stockpile.id}
                  className="flex items-center gap-3 p-3 rounded-lg border transition-all duration-200"
                >
                  <div
                    className="flex-1 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => router.push(`/stockpiles/${stockpile.id}`)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{stockpile.hex}</span>
                      <span className="text-muted-foreground">-</span>
                      <span className="font-medium truncate">{stockpile.locationName}</span>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {stockpile.type === "SEAPORT" ? "Seaport" : "Depot"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                      <span className="truncate">{stockpile.name}</span>
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {stockpile._count.items} items
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatRelativeTime(stockpile.updatedAt)}
                      </span>
                      {stockpile.lastScan?.scannedBy && (
                        <span className="flex items-center gap-1">
                          by {stockpile.lastScan.scannedBy.name || "Unknown"}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="shrink-0"
                    onClick={() => {
                      if (onQuickUpdate) {
                        onQuickUpdate(stockpile.id, stockpile.name);
                      } else {
                        router.push(`/upload?stockpileId=${stockpile.id}`);
                      }
                    }}
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    Update
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

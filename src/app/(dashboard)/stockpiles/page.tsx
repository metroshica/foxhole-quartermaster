"use client";

import { useState, useEffect } from "react";
import { Package, Plus, RefreshCw, Clock, MapPin, ChevronRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { getItemDisplayName } from "@/lib/foxhole/item-names";

/**
 * Stockpiles List Page
 *
 * Shows all stockpiles for the current regiment with item counts
 * and last updated timestamps.
 */

interface StockpileItem {
  id: string;
  itemCode: string;
  quantity: number;
  crated: boolean;
  confidence: number | null;
}

interface Stockpile {
  id: string;
  name: string;
  type: string;
  hex: string;
  locationName: string;
  code: string | null;
  createdAt: string;
  updatedAt: string;
  items: StockpileItem[];
  _count: { items: number };
}

const TYPE_LABELS: Record<string, string> = {
  STORAGE_DEPOT: "Storage Depot",
  SEAPORT: "Seaport",
};

export default function StockpilesPage() {
  const [stockpiles, setStockpiles] = useState<Stockpile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStockpiles();
  }, []);

  async function fetchStockpiles() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/stockpiles");
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to fetch stockpiles");
      }
      const data = await response.json();
      setStockpiles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stockpiles");
    } finally {
      setIsLoading(false);
    }
  }

  function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  function getTotalQuantity(items: StockpileItem[]): number {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Package className="h-6 w-6" />
              Stockpiles
            </h1>
            <p className="text-muted-foreground">
              View and manage your regiment&apos;s stockpiles
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Package className="h-6 w-6" />
              Stockpiles
            </h1>
            <p className="text-muted-foreground">
              View and manage your regiment&apos;s stockpiles
            </p>
          </div>
        </div>
        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
            <Button variant="outline" onClick={fetchStockpiles} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Package className="h-6 w-6" />
            Stockpiles
          </h1>
          <p className="text-muted-foreground">
            View and manage your regiment&apos;s stockpiles
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchStockpiles}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button asChild>
            <Link href="/upload">
              <Plus className="h-4 w-4 mr-2" />
              Add Stockpile
            </Link>
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {stockpiles.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>No Stockpiles Yet</CardTitle>
            <CardDescription>
              Start by uploading a stockpile screenshot to create your first
              stockpile
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">
                Stockpiles will appear here once you&apos;ve uploaded inventory
                data
              </p>
              <Button asChild>
                <Link href="/upload">Upload Screenshot</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stockpiles Grid */}
      {stockpiles.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stockpiles.map((stockpile) => (
            <Link
              key={stockpile.id}
              href={`/stockpiles/${stockpile.id}`}
              className="block"
            >
              <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">
                        {stockpile.name}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {TYPE_LABELS[stockpile.type] || stockpile.type}
                        </Badge>
                      </CardDescription>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {stockpile.items.length}
                        </span>
                        <span className="text-muted-foreground">items</span>
                      </div>
                      <div className="text-muted-foreground">
                        {getTotalQuantity(stockpile.items).toLocaleString()} total
                      </div>
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {stockpile.locationName}, {stockpile.hex}
                    </div>

                    {/* Last Updated */}
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      Updated {formatRelativeTime(stockpile.updatedAt)}
                    </div>

                    {/* Top items preview */}
                    {stockpile.items.length > 0 && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground mb-2">
                          Top items:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {stockpile.items.slice(0, 4).map((item, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="text-xs"
                            >
                              {getItemDisplayName(item.itemCode)}: {item.quantity}
                            </Badge>
                          ))}
                          {stockpile.items.length > 4 && (
                            <Badge variant="outline" className="text-xs">
                              +{stockpile.items.length - 4} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

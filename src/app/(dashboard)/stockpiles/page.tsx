"use client";

import { useState, useEffect, useMemo } from "react";
import { Package, Plus, RefreshCw, Clock, MapPin, ChevronRight, Search } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { getItemDisplayName } from "@/lib/foxhole/item-names";

/**
 * Stockpiles List Page
 *
 * Shows all stockpiles for the current regiment grouped by hex,
 * with hex as the primary identifier.
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
  STORAGE_DEPOT: "Depot",
  SEAPORT: "Seaport",
};

export default function StockpilesPage() {
  const [stockpiles, setStockpiles] = useState<Stockpile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

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

  // Group stockpiles by hex and filter by search
  const groupedStockpiles = useMemo(() => {
    const searchLower = search.toLowerCase().trim();

    // Filter stockpiles by search
    const filtered = stockpiles.filter((sp) => {
      if (!searchLower) return true;
      return (
        sp.hex.toLowerCase().includes(searchLower) ||
        sp.name.toLowerCase().includes(searchLower) ||
        sp.locationName.toLowerCase().includes(searchLower)
      );
    });

    // Group by hex
    const groups = new Map<string, Stockpile[]>();
    for (const sp of filtered) {
      const existing = groups.get(sp.hex) || [];
      existing.push(sp);
      groups.set(sp.hex, existing);
    }

    // Sort groups by hex name, then stockpiles within each group by updatedAt
    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([hex, sps]) => ({
        hex,
        stockpiles: sps.sort((a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        ),
      }));
  }, [stockpiles, search]);

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

      {/* Search */}
      {stockpiles.length > 0 && (
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by hex, location, or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

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

      {/* No Results */}
      {stockpiles.length > 0 && groupedStockpiles.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No stockpiles found matching &quot;{search}&quot;</p>
        </div>
      )}

      {/* Stockpiles Grouped by Hex */}
      {groupedStockpiles.map(({ hex, stockpiles: hexStockpiles }) => (
        <div key={hex} className="space-y-3">
          {/* Hex Header */}
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">{hex}</h2>
            <Badge variant="secondary">
              {hexStockpiles.length} stockpile{hexStockpiles.length !== 1 ? "s" : ""}
            </Badge>
          </div>

          {/* Stockpiles in this Hex */}
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {hexStockpiles.map((stockpile) => (
              <Link
                key={stockpile.id}
                href={`/stockpiles/${stockpile.id}`}
                className="block"
              >
                <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {/* Location & Type */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold truncate">
                            {stockpile.locationName}
                          </span>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {TYPE_LABELS[stockpile.type] || stockpile.type}
                          </Badge>
                        </div>

                        {/* Stockpile Name */}
                        <p className="text-sm text-muted-foreground truncate">
                          {stockpile.name}
                        </p>

                        {/* Stats Row */}
                        <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Package className="h-3.5 w-3.5" />
                            {stockpile.items.length} items
                          </span>
                          <span>
                            {getTotalQuantity(stockpile.items).toLocaleString()} total
                          </span>
                        </div>

                        {/* Last Updated */}
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatRelativeTime(stockpile.updatedAt)}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

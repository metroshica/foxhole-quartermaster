"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { Search, Package, Loader2, RefreshCw, Car } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getItemIconUrl } from "@/lib/foxhole/item-icons";
import { ItemDetailDialog } from "./item-detail-dialog";

interface AggregatedItem {
  itemCode: string;
  displayName: string;
  totalQuantity: number;
  cratedQuantity: number;
  looseQuantity: number;
  stockpileCount: number;
  matchedTag?: string | null;
}

interface InventorySearchProps {
  initialItems?: AggregatedItem[];
  refreshTrigger?: number;
}

export function InventorySearch({ initialItems = [], refreshTrigger = 0 }: InventorySearchProps) {
  const [items, setItems] = useState<AggregatedItem[]>(initialItems);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showVehiclesOnly, setShowVehiclesOnly] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const fetchItems = useCallback(async (searchTerm: string, vehiclesOnly: boolean, animate = false) => {
    const startTime = Date.now();

    if (animate) {
      setIsTransitioning(true);
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set("search", searchTerm);
      if (vehiclesOnly) params.set("category", "vehicles");
      params.set("limit", "500"); // Get all items, we'll scroll

      const response = await fetch(`/api/inventory/aggregate?${params}`);
      if (response.ok) {
        const data = await response.json();
        setItems(data.items);
      }
    } catch (error) {
      console.error("Error fetching inventory:", error);
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

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchItems(search, showVehiclesOnly);
    }, 300);

    return () => clearTimeout(timeout);
  }, [search, showVehiclesOnly, fetchItems]);

  // Initial load
  useEffect(() => {
    if (initialItems.length === 0) {
      fetchItems("", showVehiclesOnly);
    }
  }, [initialItems.length, showVehiclesOnly, fetchItems]);

  // Refresh when trigger changes (with animation)
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchItems(search, showVehiclesOnly, true);
    }
  }, [refreshTrigger, search, showVehiclesOnly, fetchItems]);

  const formatQuantity = (num: number) => {
    return num.toLocaleString();
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Inventory Overview
            </CardTitle>
            <CardDescription>
              Search items across all stockpiles. Click an item to see locations.
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={() => fetchItems(search, showVehiclesOnly, true)} disabled={loading || isTransitioning}>
            <RefreshCw className={`h-4 w-4 ${loading || isTransitioning ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="inventory-search"
                name="inventory-search"
                placeholder="Search items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                autoComplete="off"
              />
              {loading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            <Button
              variant={showVehiclesOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setShowVehiclesOnly(!showVehiclesOnly)}
              className="shrink-0"
            >
              <Car className="h-4 w-4 mr-1" />
              Vehicles
            </Button>
          </div>

          <div
            ref={contentRef}
            className={`transition-opacity duration-150 ${isTransitioning ? "opacity-60" : "opacity-100"}`}
          >
            {items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {search ? "No items found" : showVehiclesOnly ? "No vehicles in inventory" : "No inventory yet"}
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto pr-1 scrollbar-thin">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {items.map((item) => (
                    <button
                      key={item.itemCode}
                      onClick={() => setSelectedItem(item.itemCode)}
                      className="flex items-center gap-2 p-2 rounded-lg border hover:bg-accent transition-colors text-left"
                    >
                      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0">
                        <img
                          src={getItemIconUrl(item.itemCode)}
                          alt=""
                          className="h-8 w-8 object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate flex items-center gap-1.5">
                          {item.displayName}
                          {item.matchedTag && (
                            <span className="text-[10px] px-1 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-normal shrink-0">
                              {item.matchedTag}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatQuantity(item.totalQuantity)} in {item.stockpileCount} stockpile{item.stockpileCount !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <ItemDetailDialog
        itemCode={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </>
  );
}

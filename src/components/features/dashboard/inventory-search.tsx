"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, Package, ChevronRight, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getItemIconUrl } from "@/lib/foxhole/item-icons";
import { ItemDetailDialog } from "./item-detail-dialog";

interface AggregatedItem {
  itemCode: string;
  displayName: string;
  totalQuantity: number;
  cratedQuantity: number;
  looseQuantity: number;
  stockpileCount: number;
}

interface InventorySearchProps {
  initialItems?: AggregatedItem[];
}

export function InventorySearch({ initialItems = [] }: InventorySearchProps) {
  const [items, setItems] = useState<AggregatedItem[]>(initialItems);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const fetchItems = useCallback(async (searchTerm: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set("search", searchTerm);
      params.set("limit", "20");

      const response = await fetch(`/api/inventory/aggregate?${params}`);
      if (response.ok) {
        const data = await response.json();
        setItems(data.items);
      }
    } catch (error) {
      console.error("Error fetching inventory:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchItems(search);
    }, 300);

    return () => clearTimeout(timeout);
  }, [search, fetchItems]);

  // Initial load
  useEffect(() => {
    if (initialItems.length === 0) {
      fetchItems("");
    }
  }, [initialItems.length, fetchItems]);

  const formatQuantity = (num: number) => {
    return num.toLocaleString();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventory Overview
          </CardTitle>
          <CardDescription>
            Search items across all stockpiles. Click an item to see locations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search ? "No items found" : "No inventory yet"}
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <button
                  key={item.itemCode}
                  onClick={() => setSelectedItem(item.itemCode)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors text-left"
                >
                  <div className="h-10 w-10 rounded bg-muted flex items-center justify-center overflow-hidden">
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
                    <div className="font-medium truncate">{item.displayName}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.stockpileCount} stockpile{item.stockpileCount !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatQuantity(item.totalQuantity)}</div>
                    {item.cratedQuantity > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {formatQuantity(item.cratedQuantity)} crated
                      </Badge>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ItemDetailDialog
        itemCode={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </>
  );
}

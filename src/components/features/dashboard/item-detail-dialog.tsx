"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Package, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getItemIconUrl } from "@/lib/foxhole/item-icons";

interface StockpileLocation {
  id: string;
  name: string;
  type: string;
  hex: string;
  locationName: string;
  updatedAt: string;
  looseQuantity: number;
  cratedQuantity: number;
  totalQuantity: number;
}

interface ItemDetails {
  itemCode: string;
  displayName: string;
  totalQuantity: number;
  totalCrated: number;
  totalLoose: number;
  stockpileCount: number;
  stockpiles: StockpileLocation[];
}

interface ItemDetailDialogProps {
  itemCode: string | null;
  onClose: () => void;
}

export function ItemDetailDialog({ itemCode, onClose }: ItemDetailDialogProps) {
  const router = useRouter();
  const [details, setDetails] = useState<ItemDetails | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!itemCode) {
      setDetails(null);
      return;
    }

    async function fetchDetails() {
      if (!itemCode) return;
      setLoading(true);
      try {
        const response = await fetch(`/api/inventory/item/${encodeURIComponent(itemCode)}`);
        if (response.ok) {
          const data = await response.json();
          setDetails(data);
        }
      } catch (error) {
        console.error("Error fetching item details:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDetails();
  }, [itemCode]);

  const formatQuantity = (num: number) => {
    return num.toLocaleString();
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Dialog open={!!itemCode} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : details ? (
          <>
            <DialogHeader>
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center">
                  <img
                    src={getItemIconUrl(details.itemCode)}
                    alt=""
                    className="h-12 w-12 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
                <div>
                  <DialogTitle className="text-xl">{details.displayName}</DialogTitle>
                  <DialogDescription className="text-base">
                    {formatQuantity(details.totalQuantity)} total across {details.stockpileCount} stockpile{details.stockpileCount !== 1 ? "s" : ""}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="flex gap-4 mt-2">
              {details.totalLoose > 0 && (
                <Badge variant="outline">
                  {formatQuantity(details.totalLoose)} loose
                </Badge>
              )}
              {details.totalCrated > 0 && (
                <Badge variant="secondary">
                  {formatQuantity(details.totalCrated)} crated
                </Badge>
              )}
            </div>

            <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto">
              {details.stockpiles.map((stockpile) => (
                <button
                  key={stockpile.id}
                  onClick={() => {
                    router.push(`/stockpiles/${stockpile.id}`);
                    onClose();
                  }}
                  className="w-full flex items-start gap-3 p-3 rounded-lg border hover:bg-accent transition-colors text-left"
                >
                  <Package className="h-5 w-5 mt-0.5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{stockpile.name}</div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {stockpile.locationName}, {stockpile.hex}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Updated {formatRelativeTime(stockpile.updatedAt)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatQuantity(stockpile.totalQuantity)}</div>
                    <div className="text-xs text-muted-foreground">
                      {stockpile.cratedQuantity > 0 && (
                        <span>{formatQuantity(stockpile.cratedQuantity)} crated</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t">
              <Button variant="outline" className="w-full" onClick={onClose}>
                Close
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Item not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

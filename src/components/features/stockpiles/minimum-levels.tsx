"use client";

import { useState, useEffect } from "react";
import {
  Check,
  AlertTriangle,
  Pencil,
  X,
  Save,
  Loader2,
  Trash2,
  Plus,
  Package,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { getItemDisplayName } from "@/lib/foxhole/item-names";
import { getItemIconUrl } from "@/lib/foxhole/item-icons";
import { ItemSelector } from "@/components/features/items/item-selector";
import Link from "next/link";

interface FulfillmentItem {
  itemCode: string;
  required: number;
  current: number;
  fulfilled: boolean;
  deficit: number;
}

interface StandingOrderData {
  id: string;
  name: string;
  status: string;
  items: { id: string; itemCode: string; quantityRequired: number }[];
  createdBy: { id: string; name: string | null; image: string | null };
}

interface MinimumLevelsData {
  stockpileId: string;
  standingOrder: StandingOrderData | null;
  fulfillment: {
    items: FulfillmentItem[];
    allFulfilled: boolean;
    percentage: number;
  } | null;
}

interface EditItem {
  itemCode: string;
  minimumQuantity: number;
}

interface MinimumLevelsProps {
  stockpileId: string;
  canManage: boolean;
}

export function MinimumLevels({ stockpileId, canManage }: MinimumLevelsProps) {
  const [data, setData] = useState<MinimumLevelsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editItems, setEditItems] = useState<EditItem[]>([]);

  useEffect(() => {
    fetchMinimums();
  }, [stockpileId]);

  async function fetchMinimums() {
    setLoading(true);
    try {
      const response = await fetch(`/api/stockpiles/${stockpileId}/minimums`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error("Error fetching minimums:", error);
    } finally {
      setLoading(false);
    }
  }

  function startEditing() {
    if (data?.standingOrder) {
      setEditItems(
        data.standingOrder.items.map((item) => ({
          itemCode: item.itemCode,
          minimumQuantity: item.quantityRequired,
        }))
      );
    } else {
      setEditItems([]);
    }
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setEditItems([]);
  }

  function addItem(itemCode: string) {
    if (editItems.some((i) => i.itemCode === itemCode)) return;
    setEditItems([...editItems, { itemCode, minimumQuantity: 1 }]);
  }

  function removeItem(itemCode: string) {
    setEditItems(editItems.filter((i) => i.itemCode !== itemCode));
  }

  function updateQuantity(itemCode: string, quantity: number) {
    setEditItems(
      editItems.map((i) =>
        i.itemCode === itemCode
          ? { ...i, minimumQuantity: Math.max(1, quantity) }
          : i
      )
    );
  }

  async function saveMinimums() {
    setSaving(true);
    try {
      const response = await fetch(`/api/stockpiles/${stockpileId}/minimums`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: editItems }),
      });

      if (response.ok) {
        const result = await response.json();
        setData(result);
        setEditing(false);
        setEditItems([]);
      }
    } catch (error) {
      console.error("Error saving minimums:", error);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // No minimums set and not editing
  if (!data?.standingOrder && !editing) {
    if (!canManage) return null; // Don't show empty card to non-managers

    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center mb-3">
            <Package className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            No minimum inventory levels set for this stockpile
          </p>
          <Button variant="outline" size="sm" onClick={startEditing}>
            <Plus className="h-4 w-4 mr-1" />
            Set Minimum Levels
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Edit mode
  if (editing) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              Edit Minimum Levels
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={cancelEditing}
                disabled={saving}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button
                variant="faction"
                size="sm"
                onClick={saveMinimums}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Save
              </Button>
            </div>
          </div>
          <CardDescription>
            Set the minimum quantity for each item. A standing production order will be created automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing items */}
          {editItems.length > 0 && (
            <div className="space-y-2">
              {editItems.map((item) => (
                <div
                  key={item.itemCode}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                >
                  <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                    <img
                      src={getItemIconUrl(item.itemCode)}
                      alt=""
                      className="h-6 w-6 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                  <span className="flex-1 text-sm font-medium truncate">
                    {getItemDisplayName(item.itemCode)}
                  </span>
                  <Input
                    type="number"
                    min="1"
                    value={item.minimumQuantity}
                    onChange={(e) =>
                      updateQuantity(item.itemCode, parseInt(e.target.value) || 1)
                    }
                    className="w-24 h-8 text-center text-sm"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeItem(item.itemCode)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add item */}
          <div className="border-t pt-4">
            <p className="text-xs text-muted-foreground mb-2">Add item:</p>
            <ItemSelector
              onSelect={(itemCode) => addItem(itemCode)}
              excludeItems={editItems.map((i) => i.itemCode)}
              placeholder="Search items to add..."
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  // View mode with fulfillment
  const fulfillment = data!.fulfillment!;
  const standingOrder = data!.standingOrder!;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5" />
            Minimum Levels
            {fulfillment.allFulfilled ? (
              <Badge
                variant="outline"
                className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
              >
                <Check className="h-3 w-3 mr-1" />
                All Met
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                {fulfillment.percentage}% Stocked
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/orders/production/${standingOrder.id}`}>
                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                View Order
              </Link>
            </Button>
            {canManage && (
              <Button variant="outline" size="sm" onClick={startEditing}>
                <Pencil className="h-3.5 w-3.5 mr-1" />
                Edit
              </Button>
            )}
          </div>
        </div>
        <CardDescription>
          Minimum inventory requirements for this stockpile
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Overall progress */}
        <div className="mb-4">
          <Progress
            value={fulfillment.percentage}
            className={cn(
              "h-2",
              fulfillment.allFulfilled && "[&>div]:bg-emerald-500"
            )}
          />
        </div>

        {/* Item list */}
        <div className="space-y-2">
          {fulfillment.items.map((item) => (
            <div
              key={item.itemCode}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                item.fulfilled
                  ? "bg-emerald-500/5 border-emerald-500/20"
                  : item.current > 0
                    ? "bg-amber-500/5 border-amber-500/20"
                    : "bg-red-500/5 border-red-500/20"
              )}
            >
              <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                <img
                  src={getItemIconUrl(item.itemCode)}
                  alt=""
                  className="h-6 w-6 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
              <span className="flex-1 text-sm font-medium truncate">
                {getItemDisplayName(item.itemCode)}
              </span>
              <div className="flex items-center gap-2 text-sm tabular-nums">
                <span
                  className={cn(
                    "font-bold",
                    item.fulfilled
                      ? "text-emerald-600 dark:text-emerald-400"
                      : item.current > 0
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-red-600 dark:text-red-400"
                  )}
                >
                  {item.current.toLocaleString()}
                </span>
                <span className="text-muted-foreground">/</span>
                <span className="text-muted-foreground">
                  {item.required.toLocaleString()}
                </span>
              </div>
              {item.fulfilled ? (
                <div className="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 text-white" />
                </div>
              ) : (
                <Badge
                  variant="outline"
                  className="shrink-0 bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 text-xs"
                >
                  -{item.deficit.toLocaleString()}
                </Badge>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

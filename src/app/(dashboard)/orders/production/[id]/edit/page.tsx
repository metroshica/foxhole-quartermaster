"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Loader2, Factory, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getItemIconUrl } from "@/lib/foxhole/item-icons";
import { getItemDisplayName } from "@/lib/foxhole/item-names";
import { ItemSelector } from "@/components/features/items/item-selector";
import { MultiStockpileSelector } from "@/components/features/stockpiles/multi-stockpile-selector";
import { DurationInput } from "@/components/features/mpf/duration-input";
import { cn } from "@/lib/utils";

interface OrderItem {
  id: string;
  itemCode: string;
  displayName: string;
  quantityRequired: number;
  quantityProduced: number;
}

interface InventoryItem {
  itemCode: string;
  displayName: string;
  totalQuantity: number;
}

interface Stockpile {
  id: string;
  name: string;
  hex: string;
  locationName: string;
  type: string;
}

interface ProductionOrder {
  id: string;
  name: string;
  description: string | null;
  status: string;
  priority: number;
  isMpf: boolean;
  mpfSubmittedAt: string | null;
  mpfReadyAt: string | null;
  items: {
    id: string;
    itemCode: string;
    quantityRequired: number;
    quantityProduced: number;
  }[];
  targetStockpiles: {
    stockpile: {
      id: string;
      name: string;
      hex: string;
      locationName: string;
    };
  }[];
}

const PRIORITY_LABELS: Record<number, string> = {
  0: "Low",
  1: "Medium",
  2: "High",
  3: "Critical",
};

const PRIORITY_COLORS: Record<number, string> = {
  0: "bg-slate-500",
  1: "bg-blue-500",
  2: "bg-orange-500",
  3: "bg-red-500",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  READY_FOR_PICKUP: "Ready for Pickup",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-slate-500",
  IN_PROGRESS: "bg-blue-500",
  READY_FOR_PICKUP: "bg-emerald-500",
  COMPLETED: "bg-green-500",
  CANCELLED: "bg-red-500",
};

export default function EditProductionOrderPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [stockpiles, setStockpiles] = useState<Stockpile[]>([]);
  const [originalOrder, setOriginalOrder] = useState<ProductionOrder | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState(1);
  const [status, setStatus] = useState("PENDING");
  const [items, setItems] = useState<OrderItem[]>([]);
  const [isMpf, setIsMpf] = useState(false);
  const [targetStockpileIds, setTargetStockpileIds] = useState<string[]>([]);

  // MPF timer state
  const [mpfDurationSeconds, setMpfDurationSeconds] = useState<number | null>(null);
  const [resetMpfTimer, setResetMpfTimer] = useState(false);

  // Add item state
  const [pendingItem, setPendingItem] = useState<{ code: string; name: string } | null>(null);
  const [pendingQuantity, setPendingQuantity] = useState("");
  const quantityInputRef = useRef<HTMLInputElement>(null);

  // Fetch order data
  useEffect(() => {
    async function fetchOrder() {
      try {
        const response = await fetch(`/api/orders/production/${orderId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch order");
        }
        const data: ProductionOrder = await response.json();
        setOriginalOrder(data);

        // Populate form
        setName(data.name);
        setDescription(data.description || "");
        setPriority(data.priority);
        setStatus(data.status);
        setIsMpf(data.isMpf);
        setTargetStockpileIds(data.targetStockpiles.map(ts => ts.stockpile.id));
        setItems(data.items.map(item => ({
          id: item.id,
          itemCode: item.itemCode,
          displayName: getItemDisplayName(item.itemCode),
          quantityRequired: item.quantityRequired,
          quantityProduced: item.quantityProduced,
        })));

        // Calculate remaining MPF time if applicable
        if (data.isMpf && data.mpfSubmittedAt && data.mpfReadyAt) {
          const submittedAt = new Date(data.mpfSubmittedAt);
          const readyAt = new Date(data.mpfReadyAt);
          const totalDuration = Math.floor((readyAt.getTime() - submittedAt.getTime()) / 1000);
          setMpfDurationSeconds(totalDuration);
        }
      } catch (error) {
        console.error("Error fetching order:", error);
        setError("Failed to load order");
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();
  }, [orderId]);

  // Fetch inventory and stockpiles
  useEffect(() => {
    async function fetchData() {
      try {
        const [inventoryRes, stockpilesRes] = await Promise.all([
          fetch("/api/inventory/aggregate?limit=500"),
          fetch("/api/stockpiles"),
        ]);

        if (inventoryRes.ok) {
          const data = await inventoryRes.json();
          setInventoryItems(data.items || []);
        }

        if (stockpilesRes.ok) {
          const data = await stockpilesRes.json();
          setStockpiles(data);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }
    fetchData();
  }, []);

  // Focus quantity input when item is selected
  useEffect(() => {
    if (pendingItem && quantityInputRef.current) {
      quantityInputRef.current.focus();
    }
  }, [pendingItem]);

  const handleItemSelect = (itemCode: string, displayName: string) => {
    setPendingItem({ code: itemCode, name: displayName });
    setPendingQuantity("");
  };

  const handleAddItem = () => {
    if (!pendingItem || !pendingQuantity) return;

    const quantity = parseInt(pendingQuantity);
    if (isNaN(quantity) || quantity <= 0) return;

    setItems([
      ...items,
      {
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        itemCode: pendingItem.code,
        displayName: pendingItem.name,
        quantityRequired: quantity,
        quantityProduced: 0,
      },
    ]);

    setPendingItem(null);
    setPendingQuantity("");
  };

  const handleQuantityKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddItem();
    } else if (e.key === "Escape") {
      setPendingItem(null);
      setPendingQuantity("");
    }
  };

  const updateItemQuantity = (id: string, quantity: number) => {
    if (quantity > 0) {
      setItems(
        items.map((item) =>
          item.id === id ? { ...item, quantityRequired: quantity } : item
        )
      );
    }
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  // Handle status change - special logic for MPF orders
  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);

    // If changing from COMPLETED/CANCELLED back to an active state for MPF orders,
    // offer to reset the timer
    if (isMpf && originalOrder) {
      const wasCompleted = originalOrder.status === "COMPLETED" || originalOrder.status === "CANCELLED";
      const goingActive = newStatus === "IN_PROGRESS" || newStatus === "READY_FOR_PICKUP";
      if (wasCompleted && goingActive) {
        setResetMpfTimer(true);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Order name is required");
      return;
    }

    if (items.length === 0) {
      setError("At least one item is required");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/orders/production/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          priority,
          status,
          items: items.map((item) => ({
            itemCode: item.itemCode,
            quantityRequired: item.quantityRequired,
            quantityProduced: item.quantityProduced,
          })),
          targetStockpileIds,
          // MPF timer - if resetting, include the new duration
          ...(resetMpfTimer && mpfDurationSeconds && {
            mpfDurationSeconds,
            resetMpfTimer: true,
          }),
        }),
      });

      if (!response.ok) {
        let errorMsg = `HTTP ${response.status}`;
        try {
          const data = await response.json();
          errorMsg = data.details ? `${data.error}: ${data.details}` : data.error || errorMsg;
        } catch {
          // Response wasn't JSON
        }
        throw new Error(errorMsg);
      }

      router.push(`/orders/production/${orderId}`);
    } catch (error) {
      console.error("Error updating order:", error);
      setError(error instanceof Error ? error.message : "Failed to update order");
    } finally {
      setSaving(false);
    }
  };

  const usedItemCodes = items.map((i) => i.itemCode);
  const totalRequired = items.reduce((sum, item) => sum + item.quantityRequired, 0);
  const totalProduced = items.reduce((sum, item) => sum + item.quantityProduced, 0);

  // Get available statuses based on current state
  const getAvailableStatuses = () => {
    if (isMpf) {
      return ["PENDING", "IN_PROGRESS", "READY_FOR_PICKUP", "COMPLETED", "CANCELLED"];
    }
    return ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Factory className="h-6 w-6" />
            Edit Production Order
          </h1>
          <p className="text-muted-foreground">
            Modify order details, items, and status
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
            <CardDescription>
              Basic information about this production order
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Rifle Resupply, Tank Production"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional notes about this order..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={priority.toString()}
                  onValueChange={(v) => setPriority(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        <div className="flex items-center gap-2">
                          <div className={cn("h-2 w-2 rounded-full", PRIORITY_COLORS[parseInt(value)])} />
                          {label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={status}
                  onValueChange={handleStatusChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableStatuses().map((s) => (
                      <SelectItem key={s} value={s}>
                        <div className="flex items-center gap-2">
                          <div className={cn("h-2 w-2 rounded-full", STATUS_COLORS[s])} />
                          {STATUS_LABELS[s]}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* MPF Info */}
            {isMpf && (
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Factory className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">MPF Order</span>
                </div>

                {/* Show current timer status */}
                {originalOrder?.mpfSubmittedAt && originalOrder?.mpfReadyAt && (
                  <div className="text-sm text-muted-foreground">
                    <p>Submitted: {new Date(originalOrder.mpfSubmittedAt).toLocaleString()}</p>
                    <p>Ready at: {new Date(originalOrder.mpfReadyAt).toLocaleString()}</p>
                  </div>
                )}

                {/* Reset timer option */}
                {(status === "IN_PROGRESS" || resetMpfTimer) && (
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <Label className="text-sm">Reset MPF Timer</Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Enter a new duration to reset the timer. Leave empty to keep existing timer.
                    </p>
                    <DurationInput
                      value={resetMpfTimer ? mpfDurationSeconds : null}
                      onChange={(seconds) => {
                        setMpfDurationSeconds(seconds);
                        if (seconds !== null) {
                          setResetMpfTimer(true);
                        }
                      }}
                      placeholder="HH:MM:SS"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Target Stockpiles */}
            <div className="space-y-2">
              <Label>Target Stockpiles</Label>
              <p className="text-sm text-muted-foreground">
                Where should the produced items be delivered?
              </p>
              <MultiStockpileSelector
                stockpiles={stockpiles}
                selectedIds={targetStockpileIds}
                onSelectionChange={setTargetStockpileIds}
                placeholder="Search stockpiles..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card>
          <CardHeader>
            <CardTitle>Items to Produce</CardTitle>
            <CardDescription>
              {totalProduced > 0 && (
                <span className="text-muted-foreground">
                  Progress: {totalProduced.toLocaleString()} / {totalRequired.toLocaleString()} produced
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add Item Section */}
            <div className="p-4 rounded-lg border-2 border-dashed bg-muted/30">
              {!pendingItem ? (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Add Item</Label>
                  <ItemSelector
                    onSelect={handleItemSelect}
                    excludeItems={usedItemCodes}
                    inventoryItems={inventoryItems}
                    placeholder="Search for an item..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Search by name or slang (e.g., &quot;mammon&quot;, &quot;bmat&quot;)
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={getItemIconUrl(pendingItem.code)}
                      alt=""
                      className="h-8 w-8 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{pendingItem.name}</p>
                      <p className="text-xs text-muted-foreground">How many to produce?</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPendingItem(null);
                        setPendingQuantity("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      ref={quantityInputRef}
                      type="number"
                      min="1"
                      placeholder="Enter quantity..."
                      value={pendingQuantity}
                      onChange={(e) => setPendingQuantity(e.target.value)}
                      onKeyDown={handleQuantityKeyDown}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      onClick={handleAddItem}
                      disabled={!pendingQuantity || parseInt(pendingQuantity) <= 0}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Items List */}
            {items.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    Items ({items.length})
                  </Label>
                  <span className="text-sm text-muted-foreground">
                    {totalRequired.toLocaleString()} total required
                  </span>
                </div>
                <div className="rounded-lg border divide-y">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3"
                    >
                      <img
                        src={getItemIconUrl(item.itemCode)}
                        alt=""
                        className="h-8 w-8 object-contain shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.displayName}</p>
                        {item.quantityProduced > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {item.quantityProduced} produced
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          value={item.quantityRequired}
                          onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 0)}
                          className="w-24 h-8 text-center text-sm"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive shrink-0"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {items.length === 0 && !pendingItem && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No items added yet. Search for items above to add them.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || items.length === 0}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}

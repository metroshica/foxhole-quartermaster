"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Loader2, Factory, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getItemIconUrl } from "@/lib/foxhole/item-icons";
import { ItemSelector } from "@/components/features/items/item-selector";
import { MultiStockpileSelector } from "@/components/features/stockpiles/multi-stockpile-selector";
import { cn } from "@/lib/utils";

interface OrderItem {
  id: string;
  itemCode: string;
  displayName: string;
  quantityRequired: number;
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

export default function NewProductionOrderPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [stockpiles, setStockpiles] = useState<Stockpile[]>([]);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState(1); // Default to Medium
  const [items, setItems] = useState<OrderItem[]>([]);

  // MPF fields
  const [isMpf, setIsMpf] = useState(false);
  const [targetStockpileIds, setTargetStockpileIds] = useState<string[]>([]);

  // Add item state
  const [pendingItem, setPendingItem] = useState<{ code: string; name: string } | null>(null);
  const [pendingQuantity, setPendingQuantity] = useState("");
  const quantityInputRef = useRef<HTMLInputElement>(null);

  // Fetch inventory and stockpiles on mount
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
      const response = await fetch("/api/orders/production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          priority,
          items: items.map((item) => ({
            itemCode: item.itemCode,
            quantityRequired: item.quantityRequired,
          })),
          isMpf,
          targetStockpileIds: targetStockpileIds.length > 0 ? targetStockpileIds : undefined,
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

      const order = await response.json();
      router.push(`/orders/production/${order.id}`);
    } catch (error) {
      console.error("Error creating order:", error);
      setError(error instanceof Error ? error.message : "Failed to create order");
    } finally {
      setSaving(false);
    }
  };

  const usedItemCodes = items.map((i) => i.itemCode);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantityRequired, 0);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="h-10 w-10 rounded-lg bg-faction-muted flex items-center justify-center">
          <Factory className="h-5 w-5 text-faction" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            New Production Order
          </h1>
          <p className="text-sm text-muted-foreground">
            Create an order for items that need to be produced
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
            {error}
          </div>
        )}

        {/* Basic Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-md bg-faction-muted flex items-center justify-center">
                <Factory className="h-4 w-4 text-faction" />
              </div>
              Order Details
            </CardTitle>
            <CardDescription className="mt-1.5">
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

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={priority.toString()}
                onValueChange={(v) => setPriority(parseInt(v))}
              >
                <SelectTrigger className="w-40">
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

            {/* MPF Toggle */}
            <div className={cn(
              "flex items-center justify-between rounded-lg border p-4 transition-colors duration-150",
              isMpf ? "border-indigo-500/30 bg-indigo-500/5" : "border-border"
            )}>
              <div className="space-y-0.5">
                <Label htmlFor="mpf-toggle" className="text-base font-medium">
                  Mass Production Factory (MPF)
                </Label>
                <p className="text-sm text-muted-foreground">
                  Enable for bulk orders with timer-based production
                </p>
              </div>
              <Switch
                id="mpf-toggle"
                checked={isMpf}
                onCheckedChange={setIsMpf}
              />
            </div>

            {/* MPF Info */}
            {isMpf && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-sm">
                <div className="h-8 w-8 rounded-md bg-indigo-500/20 flex items-center justify-center shrink-0">
                  <Info className="h-4 w-4 text-indigo-500" />
                </div>
                <div className="text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">MPF orders follow a different workflow:</p>
                  <ol className="list-decimal ml-4 space-y-1">
                    <li>Create the order with target stockpiles</li>
                    <li>Someone submits it to an MPF and enters the production time</li>
                    <li>When the timer completes, it&apos;s ready for pickup</li>
                    <li>After delivery to a stockpile, mark as completed</li>
                  </ol>
                </div>
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
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-md bg-faction-muted flex items-center justify-center">
                <Plus className="h-4 w-4 text-faction" />
              </div>
              Items to Produce
            </CardTitle>
            <CardDescription className="mt-1.5">
              Add items and quantities that need to be produced
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add Item Section */}
            <div className={cn(
              "p-4 rounded-lg border-2 border-dashed transition-colors duration-150",
              pendingItem ? "border-faction/30 bg-faction-muted/30" : "bg-muted/30"
            )}>
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
                    <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                      <img
                        src={getItemIconUrl(pendingItem.code)}
                        alt=""
                        className="h-8 w-8 object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{pendingItem.name}</p>
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
                      variant="faction"
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
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    Items ({items.length})
                  </Label>
                  <span className="text-sm font-semibold">
                    {totalQuantity.toLocaleString()} total
                  </span>
                </div>
                <div className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card hover:bg-muted/30 transition-colors duration-150"
                    >
                      <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0">
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
                        <p className="font-semibold truncate">{item.displayName}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          value={item.quantityRequired}
                          onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 0)}
                          className="w-24 h-8 text-center text-sm font-medium"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
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
              <div className="text-center py-8">
                <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center mx-auto mb-3">
                  <Factory className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  No items added yet. Search for items above to add them.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" variant="faction" disabled={saving || items.length === 0}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Order
          </Button>
        </div>
      </form>
    </div>
  );
}

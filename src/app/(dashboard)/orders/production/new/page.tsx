"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Loader2, Factory } from "lucide-react";
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
import { ItemSelector } from "@/components/features/items/item-selector";
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

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState(1); // Default to Medium
  const [items, setItems] = useState<OrderItem[]>([]);

  // Add item state
  const [pendingItem, setPendingItem] = useState<{ code: string; name: string } | null>(null);
  const [pendingQuantity, setPendingQuantity] = useState("");
  const quantityInputRef = useRef<HTMLInputElement>(null);

  // Fetch inventory on mount
  useEffect(() => {
    async function fetchInventory() {
      try {
        const response = await fetch("/api/inventory/aggregate?limit=500");
        if (response.ok) {
          const data = await response.json();
          setInventoryItems(data.items || []);
        }
      } catch (error) {
        console.error("Error fetching inventory:", error);
      }
    }
    fetchInventory();
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Factory className="h-6 w-6" />
            New Production Order
          </h1>
          <p className="text-muted-foreground">
            Create an order for items that need to be produced
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
          </CardContent>
        </Card>

        {/* Items */}
        <Card>
          <CardHeader>
            <CardTitle>Items to Produce</CardTitle>
            <CardDescription>
              Add items and quantities that need to be produced
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
                    {totalQuantity.toLocaleString()} total
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
            Create Order
          </Button>
        </div>
      </form>
    </div>
  );
}

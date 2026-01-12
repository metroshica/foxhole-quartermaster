"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { getItemDisplayName } from "@/lib/foxhole/item-names";
import { getItemIconUrl } from "@/lib/foxhole/item-icons";
import { ItemSelector } from "@/components/features/items/item-selector";
import { StockpileSelector } from "@/components/features/stockpiles/stockpile-selector";
import { HexSelector } from "@/components/features/hex/hex-selector";
import { DateTimeRangePicker } from "@/components/features/datetime/datetime-range-picker";

interface Requirement {
  id: string;
  itemCode: string;
  displayName: string;
  quantity: number;
  priority: number;
}

interface Stockpile {
  id: string;
  name: string;
  hex: string;
  locationName: string;
  type: string;
}

interface InventoryItem {
  itemCode: string;
  displayName: string;
  totalQuantity: number;
}

interface Operation {
  id: string;
  name: string;
  description: string | null;
  status: string;
  scheduledFor: string | null;
  scheduledEndAt: string | null;
  location: string | null;
  destinationStockpileId: string | null;
  requirements: {
    id: string;
    itemCode: string;
    required: number;
    priority: number;
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

export default function EditOperationPage() {
  const router = useRouter();
  const params = useParams();
  const operationId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stockpiles, setStockpiles] = useState<Stockpile[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledFor, setScheduledFor] = useState<Date | undefined>();
  const [scheduledEndAt, setScheduledEndAt] = useState<Date | undefined>();
  const [location, setLocation] = useState("");
  const [destinationStockpileId, setDestinationStockpileId] = useState("");
  const [requirements, setRequirements] = useState<Requirement[]>([]);

  // Add item state
  const [pendingItem, setPendingItem] = useState<{ code: string; name: string } | null>(null);
  const [pendingQuantity, setPendingQuantity] = useState("");
  const quantityInputRef = useRef<HTMLInputElement>(null);

  // Fetch operation data
  useEffect(() => {
    async function fetchOperation() {
      try {
        const response = await fetch(`/api/operations/${operationId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch operation");
        }
        const data: Operation = await response.json();

        setName(data.name);
        setDescription(data.description || "");
        setLocation(data.location || "");
        setDestinationStockpileId(data.destinationStockpileId || "");

        // Parse scheduled date/time
        if (data.scheduledFor) {
          setScheduledFor(new Date(data.scheduledFor));
        }
        if (data.scheduledEndAt) {
          setScheduledEndAt(new Date(data.scheduledEndAt));
        }

        // Map requirements
        setRequirements(
          data.requirements.map((req) => ({
            id: req.id,
            itemCode: req.itemCode,
            displayName: getItemDisplayName(req.itemCode),
            quantity: req.required,
            priority: req.priority,
          }))
        );
      } catch (error) {
        console.error("Error fetching operation:", error);
        setError("Failed to load operation");
      } finally {
        setLoading(false);
      }
    }
    fetchOperation();
  }, [operationId]);

  // Fetch stockpiles and inventory
  useEffect(() => {
    async function fetchData() {
      try {
        const [stockpilesRes, inventoryRes] = await Promise.all([
          fetch("/api/stockpiles"),
          fetch("/api/inventory/aggregate?limit=500"),
        ]);

        if (stockpilesRes.ok) {
          const data = await stockpilesRes.json();
          setStockpiles(data);
        }

        if (inventoryRes.ok) {
          const data = await inventoryRes.json();
          setInventoryItems(data.items || []);
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

  const handleAddRequirement = () => {
    if (!pendingItem || !pendingQuantity) return;

    const quantity = parseInt(pendingQuantity);
    if (isNaN(quantity) || quantity <= 0) return;

    setRequirements([
      ...requirements,
      {
        id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        itemCode: pendingItem.code,
        displayName: pendingItem.name,
        quantity,
        priority: 1,
      },
    ]);

    setPendingItem(null);
    setPendingQuantity("");
  };

  const handleQuantityKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddRequirement();
    } else if (e.key === "Escape") {
      setPendingItem(null);
      setPendingQuantity("");
    }
  };

  const updateRequirementPriority = (id: string, priority: number) => {
    setRequirements(
      requirements.map((req) =>
        req.id === id ? { ...req, priority } : req
      )
    );
  };

  const updateRequirementQuantity = (id: string, quantity: number) => {
    if (quantity > 0) {
      setRequirements(
        requirements.map((req) =>
          req.id === id ? { ...req, quantity } : req
        )
      );
    }
  };

  const removeRequirement = (id: string) => {
    setRequirements(requirements.filter((req) => req.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Operation name is required");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/operations/${operationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          scheduledFor: scheduledFor?.toISOString() || null,
          scheduledEndAt: scheduledEndAt?.toISOString() || null,
          location: location || null,
          destinationStockpileId: destinationStockpileId || null,
          requirements: requirements.map((req) => ({
            itemCode: req.itemCode,
            quantity: req.quantity,
            priority: req.priority,
          })),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update operation");
      }

      router.push(`/operations/${operationId}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to update operation");
    } finally {
      setSaving(false);
    }
  };

  const usedItemCodes = requirements.map((r) => r.itemCode);

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
          <h1 className="text-2xl font-bold tracking-tight">Edit Operation</h1>
          <p className="text-muted-foreground">
            Update operation details and requirements
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
            <CardTitle>Operation Details</CardTitle>
            <CardDescription>
              Basic information about the operation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Night Assault on Jade Cove"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Operation objectives and notes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Scheduled Time</Label>
              <DateTimeRangePicker
                startValue={scheduledFor}
                endValue={scheduledEndAt}
                onStartChange={setScheduledFor}
                onEndChange={setScheduledEndAt}
                placeholder="Select date & time range..."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Target Location (Hex)</Label>
                <HexSelector
                  value={location}
                  onSelect={setLocation}
                  placeholder="Search hex..."
                />
              </div>

              <div className="space-y-2">
                <Label>Destination Stockpile</Label>
                <StockpileSelector
                  stockpiles={stockpiles}
                  value={destinationStockpileId}
                  onSelect={setDestinationStockpileId}
                  placeholder="Search by hex..."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Requirements */}
        <Card>
          <CardHeader>
            <CardTitle>Equipment Requirements</CardTitle>
            <CardDescription>
              Items needed for this operation (crates)
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
                    Items in your inventory are shown first with quantities
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
                      <p className="text-xs text-muted-foreground">How many crates?</p>
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
                      onClick={handleAddRequirement}
                      disabled={!pendingQuantity || parseInt(pendingQuantity) <= 0}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Requirements List */}
            {requirements.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Requirements ({requirements.length} items)
                </Label>
                <div className="rounded-lg border divide-y">
                  {requirements.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center gap-3 p-3"
                    >
                      <img
                        src={getItemIconUrl(req.itemCode)}
                        alt=""
                        className="h-8 w-8 object-contain shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{req.displayName}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min="1"
                          value={req.quantity}
                          onChange={(e) => updateRequirementQuantity(req.id, parseInt(e.target.value) || 0)}
                          className="w-20 h-8 text-center text-sm"
                        />
                        <span className="text-sm text-muted-foreground">crates</span>
                      </div>
                      <Select
                        value={req.priority.toString()}
                        onValueChange={(v) =>
                          updateRequirementPriority(req.id, parseInt(v))
                        }
                      >
                        <SelectTrigger className="w-28">
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
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive shrink-0"
                        onClick={() => removeRequirement(req.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {requirements.length === 0 && !pendingItem && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No requirements added yet. Search for items above to add them.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}

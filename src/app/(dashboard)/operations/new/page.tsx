"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getHexNames } from "@/lib/foxhole/regions";
import { getItemDisplayName } from "@/lib/foxhole/item-names";
import { ItemSelector } from "@/components/features/items/item-selector";

interface Requirement {
  id: string;
  itemCode: string;
  quantity: number;
  priority: number;
}

interface Stockpile {
  id: string;
  name: string;
  hex: string;
  locationName: string;
}

const PRIORITY_LABELS: Record<number, string> = {
  0: "Low",
  1: "Medium",
  2: "High",
  3: "Critical",
};

export default function NewOperationPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stockpiles, setStockpiles] = useState<Stockpile[]>([]);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [scheduledTime, setScheduledTime] = useState("12:00");
  const [location, setLocation] = useState("");
  const [destinationStockpileId, setDestinationStockpileId] = useState("");
  const [requirements, setRequirements] = useState<Requirement[]>([]);

  // Fetch stockpiles for dropdown
  useEffect(() => {
    async function fetchStockpiles() {
      try {
        const response = await fetch("/api/stockpiles");
        if (response.ok) {
          const data = await response.json();
          setStockpiles(data);
        }
      } catch (error) {
        console.error("Error fetching stockpiles:", error);
      }
    }
    fetchStockpiles();
  }, []);

  const addRequirement = () => {
    setRequirements([
      ...requirements,
      {
        id: crypto.randomUUID(),
        itemCode: "",
        quantity: 1,
        priority: 1,
      },
    ]);
  };

  const updateRequirement = (id: string, updates: Partial<Requirement>) => {
    setRequirements(
      requirements.map((req) =>
        req.id === id ? { ...req, ...updates } : req
      )
    );
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

    // Filter out empty requirements
    const validRequirements = requirements.filter(
      (req) => req.itemCode && req.quantity > 0
    );

    setSaving(true);

    try {
      // Combine date and time
      let scheduledFor: string | null = null;
      if (scheduledDate) {
        const [hours, minutes] = scheduledTime.split(":").map(Number);
        const combined = new Date(scheduledDate);
        combined.setHours(hours, minutes, 0, 0);
        scheduledFor = combined.toISOString();
      }

      const response = await fetch("/api/operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          scheduledFor,
          location: location || null,
          destinationStockpileId: destinationStockpileId || null,
          requirements: validRequirements.map((req) => ({
            itemCode: req.itemCode,
            quantity: req.quantity,
            priority: req.priority,
          })),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create operation");
      }

      const operation = await response.json();
      router.push(`/operations/${operation.id}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to create operation");
    } finally {
      setSaving(false);
    }
  };

  const hexNames = getHexNames();
  const usedItemCodes = requirements.map((r) => r.itemCode).filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Operation</h1>
          <p className="text-muted-foreground">
            Plan a military operation with equipment requirements
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

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Scheduled Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !scheduledDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {scheduledDate ? format(scheduledDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={scheduledDate}
                      onSelect={setScheduledDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">Scheduled Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Target Location (Hex)</Label>
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select hex..." />
                  </SelectTrigger>
                  <SelectContent>
                    {hexNames.map((hex) => (
                      <SelectItem key={hex} value={hex}>
                        {hex}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Destination Stockpile</Label>
                <Select
                  value={destinationStockpileId}
                  onValueChange={setDestinationStockpileId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Where to deliver supplies..." />
                  </SelectTrigger>
                  <SelectContent>
                    {stockpiles.map((sp) => (
                      <SelectItem key={sp.id} value={sp.id}>
                        {sp.name} ({sp.locationName})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Requirements */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Equipment Requirements</CardTitle>
              <CardDescription>
                Items needed for this operation
              </CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addRequirement}>
              <Plus className="h-4 w-4 mr-1" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent>
            {requirements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No requirements added yet</p>
                <Button
                  type="button"
                  variant="link"
                  className="mt-2"
                  onClick={addRequirement}
                >
                  Add your first requirement
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {requirements.map((req, index) => (
                  <div
                    key={req.id}
                    className="flex items-end gap-3 p-3 rounded-lg border bg-muted/30"
                  >
                    <div className="flex-1 space-y-2">
                      <Label className="text-xs">Item</Label>
                      <ItemSelector
                        value={req.itemCode}
                        onSelect={(code) => updateRequirement(req.id, { itemCode: code })}
                        excludeItems={usedItemCodes.filter((c) => c !== req.itemCode)}
                      />
                    </div>

                    <div className="w-24 space-y-2">
                      <Label className="text-xs">Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={req.quantity}
                        onChange={(e) =>
                          updateRequirement(req.id, {
                            quantity: parseInt(e.target.value) || 1,
                          })
                        }
                      />
                    </div>

                    <div className="w-32 space-y-2">
                      <Label className="text-xs">Priority</Label>
                      <Select
                        value={req.priority.toString()}
                        onValueChange={(v) =>
                          updateRequirement(req.id, { priority: parseInt(v) })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeRequirement(req.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
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
            Create Operation
          </Button>
        </div>
      </form>
    </div>
  );
}

"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Factory,
  RefreshCw,
  Check,
  Minus,
  Plus,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getItemIconUrl } from "@/lib/foxhole/item-icons";
import { getItemDisplayName } from "@/lib/foxhole/item-names";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface ProductionOrderItem {
  id: string;
  itemCode: string;
  quantityRequired: number;
  quantityProduced: number;
}

interface ProductionOrder {
  id: string;
  name: string;
  description: string | null;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  priority: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  createdBy: {
    id: string;
    name: string | null;
    image: string | null;
  };
  items: ProductionOrderItem[];
  progress: {
    totalRequired: number;
    totalProduced: number;
    percentage: number;
    itemsComplete: number;
    itemsTotal: number;
  };
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
  IN_PROGRESS: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  COMPLETED: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  CANCELLED: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20",
};

const PRIORITY_LABELS: Record<number, string> = {
  0: "Low",
  1: "Medium",
  2: "High",
  3: "Critical",
};

const PRIORITY_COLORS: Record<number, string> = {
  0: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  1: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  2: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  3: "bg-red-500/10 text-red-600 dark:text-red-400",
};

export default function ProductionOrderDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [order, setOrder] = useState<ProductionOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Track pending changes for debounced save
  const [pendingChanges, setPendingChanges] = useState<Map<string, number>>(new Map());

  const fetchOrder = useCallback(async () => {
    try {
      const response = await fetch(`/api/orders/production/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError("Order not found");
        } else {
          throw new Error("Failed to load order");
        }
        return;
      }
      const data = await response.json();
      setOrder(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load order");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Debounced save for quantity changes
  useEffect(() => {
    if (pendingChanges.size === 0) return;

    const timeout = setTimeout(async () => {
      setSaving(true);
      try {
        const items = Array.from(pendingChanges.entries()).map(([itemCode, quantityProduced]) => ({
          itemCode,
          quantityProduced,
        }));

        const response = await fetch(`/api/orders/production/${id}/items`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });

        if (response.ok) {
          const updatedOrder = await response.json();
          setOrder(updatedOrder);
          setPendingChanges(new Map());
        }
      } catch (err) {
        console.error("Error saving changes:", err);
      } finally {
        setSaving(false);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [pendingChanges, id]);

  const updateItemQuantity = (itemCode: string, newQuantity: number) => {
    if (!order || order.status === "CANCELLED") return;

    const item = order.items.find((i) => i.itemCode === itemCode);
    if (!item) return;

    // Clamp to valid range
    const quantity = Math.max(0, Math.min(newQuantity, item.quantityRequired));

    // Update local state immediately for responsive UI
    setOrder({
      ...order,
      items: order.items.map((i) =>
        i.itemCode === itemCode ? { ...i, quantityProduced: quantity } : i
      ),
    });

    // Queue for debounced save
    setPendingChanges((prev) => {
      const next = new Map(prev);
      next.set(itemCode, quantity);
      return next;
    });
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/orders/production/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.push("/orders/production");
      } else {
        const data = await response.json();
        setError(data.error || "Failed to delete order");
      }
    } catch (err) {
      setError("Failed to delete order");
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Production Order</h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{error || "Order not found"}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push("/orders/production")}
            >
              Back to Orders
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isEditable = order.status !== "CANCELLED" && order.status !== "COMPLETED";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Factory className="h-6 w-6" />
                {order.name}
              </h1>
              <Badge variant="outline" className={STATUS_COLORS[order.status]}>
                {STATUS_LABELS[order.status]}
              </Badge>
              <Badge variant="secondary" className={PRIORITY_COLORS[order.priority]}>
                {PRIORITY_LABELS[order.priority]}
              </Badge>
              {saving && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Saving...
                </span>
              )}
            </div>
            {order.description && (
              <p className="text-muted-foreground mt-1">{order.description}</p>
            )}
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Production Order</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{order.name}&quot;? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Overall Progress */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Overall Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {order.progress.itemsComplete} of {order.progress.itemsTotal} items complete
            </span>
            <span className="font-medium">{order.progress.percentage}%</span>
          </div>
          <Progress value={order.progress.percentage} className="h-3" />
          <div className="text-xs text-muted-foreground">
            {order.progress.totalProduced.toLocaleString()} / {order.progress.totalRequired.toLocaleString()} total items produced
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
          <CardDescription>
            {isEditable
              ? "Update quantities as items are produced"
              : "This order is no longer editable"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {order.items.map((item) => {
              const isComplete = item.quantityProduced >= item.quantityRequired;
              const percentage = Math.round(
                (item.quantityProduced / item.quantityRequired) * 100
              );

              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-lg border transition-colors",
                    isComplete && "bg-green-500/5 border-green-500/20"
                  )}
                >
                  {/* Icon */}
                  <div className="relative shrink-0">
                    <img
                      src={getItemIconUrl(item.itemCode)}
                      alt=""
                      className="h-12 w-12 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    {isComplete && (
                      <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {getItemDisplayName(item.itemCode)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress value={percentage} className="h-2 flex-1" />
                      <span className="text-xs text-muted-foreground w-12 text-right">
                        {percentage}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.quantityProduced.toLocaleString()} / {item.quantityRequired.toLocaleString()}
                    </p>
                  </div>

                  {/* Controls */}
                  {isEditable && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateItemQuantity(item.itemCode, item.quantityProduced - 10)}
                        disabled={item.quantityProduced <= 0}
                      >
                        <span className="text-xs">-10</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateItemQuantity(item.itemCode, item.quantityProduced - 1)}
                        disabled={item.quantityProduced <= 0}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        min="0"
                        max={item.quantityRequired}
                        value={item.quantityProduced}
                        onChange={(e) => updateItemQuantity(item.itemCode, parseInt(e.target.value) || 0)}
                        className="w-20 h-8 text-center text-sm"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateItemQuantity(item.itemCode, item.quantityProduced + 1)}
                        disabled={item.quantityProduced >= item.quantityRequired}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateItemQuantity(item.itemCode, item.quantityProduced + 10)}
                        disabled={item.quantityProduced >= item.quantityRequired}
                      >
                        <span className="text-xs">+10</span>
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Created by</p>
              <div className="flex items-center gap-2 mt-1">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={order.createdBy.image || undefined} />
                  <AvatarFallback className="text-xs">
                    {order.createdBy.name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <span>{order.createdBy.name || "Unknown"}</span>
              </div>
            </div>
            <div>
              <p className="text-muted-foreground">Created</p>
              <p className="mt-1">{formatDate(order.createdAt)}</p>
            </div>
            {order.completedAt && (
              <div>
                <p className="text-muted-foreground">Completed</p>
                <p className="mt-1">{formatDate(order.completedAt)}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

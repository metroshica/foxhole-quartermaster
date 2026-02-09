"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Factory,
  Check,
  Plus,
  Trash2,
  AlertCircle,
  Timer,
  MapPin,
  Package,
  Clock,
  Pencil,
  Loader2,
  ChevronRight,
  Share2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getItemIconUrl } from "@/lib/foxhole/item-icons";
import { getItemDisplayName } from "@/lib/foxhole/item-names";
import { cn } from "@/lib/utils";
import { DurationInput, formatDuration } from "@/components/features/mpf/duration-input";
import { CountdownTimer } from "@/components/features/mpf/countdown-timer";
import { StockpileSelector } from "@/components/features/stockpiles/stockpile-selector";
import { useToast } from "@/hooks/use-toast";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface ProductionOrderItem {
  id: string;
  itemCode: string;
  quantityRequired: number;
  quantityProduced: number;
}

interface Stockpile {
  id: string;
  name: string;
  hex: string;
  locationName: string;
}

interface TargetStockpile {
  stockpile: Stockpile;
}

interface FulfillmentItem {
  itemCode: string;
  required: number;
  current: number;
  fulfilled: boolean;
  deficit: number;
}

interface ProductionOrder {
  id: string;
  shortId: string | null;
  name: string;
  description: string | null;
  status: "PENDING" | "IN_PROGRESS" | "READY_FOR_PICKUP" | "COMPLETED" | "CANCELLED" | "FULFILLED";
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
  // MPF fields
  isMpf: boolean;
  mpfSubmittedAt: string | null;
  mpfReadyAt: string | null;
  deliveredAt: string | null;
  deliveryStockpile: Stockpile | null;
  targetStockpiles: TargetStockpile[];
  // Standing order fields
  isStandingOrder: boolean;
  linkedStockpileId: string | null;
  linkedStockpile: Stockpile | null;
  fulfillment?: {
    items: FulfillmentItem[];
    allFulfilled: boolean;
    percentage: number;
  };
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  READY_FOR_PICKUP: "Ready for Pickup",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  FULFILLED: "Fulfilled",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
  IN_PROGRESS: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  READY_FOR_PICKUP: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
  COMPLETED: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  CANCELLED: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20",
  FULFILLED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
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
  const { toast } = useToast();
  const { data: session } = useSession();

  const permissions = session?.user?.permissions ?? [];
  const canUpdate = permissions.includes("production.update");
  const canDelete = permissions.includes("production.delete");
  const canUpdateItems = permissions.includes("production.update_items");
  const [order, setOrder] = useState<ProductionOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [stockpiles, setStockpiles] = useState<(Stockpile & { type: string })[]>([]);

  // MPF submission dialog state
  const [showMpfSubmitDialog, setShowMpfSubmitDialog] = useState(false);
  const [mpfDuration, setMpfDuration] = useState<number | null>(null);
  const [submittingMpf, setSubmittingMpf] = useState(false);

  // Delivery dialog state
  const [showDeliveryDialog, setShowDeliveryDialog] = useState(false);
  const [deliveryStockpileId, setDeliveryStockpileId] = useState("");
  const [completing, setCompleting] = useState(false);

  // Track pending changes for debounced save
  const [pendingChanges, setPendingChanges] = useState<Map<string, number>>(new Map());

  // Stockpile selection for inventory updates
  const [showStockpileSelectDialog, setShowStockpileSelectDialog] = useState(false);
  const [selectedTargetStockpileId, setSelectedTargetStockpileId] = useState<string | null>(null);
  const [stockpileUpdateFeedback, setStockpileUpdateFeedback] = useState<string | null>(null);

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

  // Fetch stockpiles for delivery selector
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

  // Auto-refresh for MPF orders in progress (to check timer status)
  useEffect(() => {
    if (!order?.isMpf || order.status !== "IN_PROGRESS") return;

    const interval = setInterval(() => {
      fetchOrder();
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [order?.isMpf, order?.status, fetchOrder]);

  // Debounced save for quantity changes
  useEffect(() => {
    if (pendingChanges.size === 0) return;

    const timeout = setTimeout(async () => {
      // Determine which stockpile to update
      const targetStockpiles = order?.targetStockpiles || [];
      let targetStockpileId: string | undefined;

      if (targetStockpiles.length === 1) {
        // Auto-select single target
        targetStockpileId = targetStockpiles[0].stockpile.id;
      } else if (targetStockpiles.length > 1) {
        // Multiple targets - need selection
        if (selectedTargetStockpileId) {
          targetStockpileId = selectedTargetStockpileId;
        } else {
          // Show selection dialog and defer save
          setShowStockpileSelectDialog(true);
          return;
        }
      }
      // If no targets, targetStockpileId remains undefined (stockpile update skipped)

      setSaving(true);
      try {
        const items = Array.from(pendingChanges.entries()).map(([itemCode, quantityProduced]) => ({
          itemCode,
          quantityProduced,
        }));

        const response = await fetch(`/api/orders/production/${id}/items`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items, targetStockpileId }),
        });

        if (response.ok) {
          const updatedOrder = await response.json();
          setOrder(updatedOrder);
          setPendingChanges(new Map());

          // Show feedback if stockpile was updated
          if (updatedOrder.stockpileUpdated) {
            setStockpileUpdateFeedback(
              `Added ${updatedOrder.stockpileUpdated.itemsUpdated} items to ${updatedOrder.stockpileUpdated.stockpileName}`
            );
            // Clear feedback after 3 seconds
            setTimeout(() => setStockpileUpdateFeedback(null), 3000);
          }
        } else {
          const errorData = await response.json();
          // Handle case where API requires stockpile selection
          if (errorData.targetStockpiles) {
            setShowStockpileSelectDialog(true);
          } else {
            console.error("Error saving changes:", errorData.error);
          }
        }
      } catch (err) {
        console.error("Error saving changes:", err);
      } finally {
        setSaving(false);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [pendingChanges, id, order?.targetStockpiles, selectedTargetStockpileId]);

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

  // Submit order to MPF with duration
  const handleMpfSubmit = async () => {
    if (!mpfDuration || mpfDuration <= 0) return;

    setSubmittingMpf(true);
    try {
      const response = await fetch(`/api/orders/production/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mpfDurationSeconds: mpfDuration,
        }),
      });

      if (response.ok) {
        await fetchOrder();
        setShowMpfSubmitDialog(false);
        setMpfDuration(null);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to submit to MPF");
      }
    } catch (err) {
      setError("Failed to submit to MPF");
    } finally {
      setSubmittingMpf(false);
    }
  };

  // Mark MPF order as delivered
  const handleDelivery = async () => {
    if (!deliveryStockpileId) return;

    setCompleting(true);
    try {
      const response = await fetch(`/api/orders/production/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "COMPLETED",
          deliveryStockpileId,
        }),
      });

      if (response.ok) {
        await fetchOrder();
        setShowDeliveryDialog(false);
        setDeliveryStockpileId("");
      } else {
        const data = await response.json();
        setError(data.error || "Failed to complete delivery");
      }
    } catch (err) {
      setError("Failed to complete delivery");
    } finally {
      setCompleting(false);
    }
  };

  // Handle timer expiry (refresh to get updated status)
  const handleTimerExpire = () => {
    fetchOrder();
  };

  // Handle stockpile selection for inventory updates
  const handleStockpileSelect = (stockpileId: string) => {
    setSelectedTargetStockpileId(stockpileId);
    setShowStockpileSelectDialog(false);
    // The useEffect will trigger the save now that we have a selection
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
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-faction-muted flex items-center justify-center">
              <Factory className="h-5 w-5 text-faction" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Production Order</h1>
          </div>
        </div>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-12 w-12 rounded-lg bg-destructive/10 flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <p className="text-muted-foreground">{error || "Order not found"}</p>
            <Button
              variant="faction"
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

  const isEditable = order.status !== "CANCELLED" && order.status !== "COMPLETED" && canUpdateItems;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="h-10 w-10 rounded-lg bg-faction-muted flex items-center justify-center">
            <Factory className="h-5 w-5 text-faction" />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">
                {order.name}
              </h1>
              <Badge variant="outline" className={cn("font-medium", STATUS_COLORS[order.status])}>
                {STATUS_LABELS[order.status]}
              </Badge>
              <Badge variant="secondary" className={cn("font-medium", PRIORITY_COLORS[order.priority])}>
                {PRIORITY_LABELS[order.priority]}
              </Badge>
              {order.isStandingOrder && (
                <Badge variant="outline" className="bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30 font-medium">
                  <Package className="h-3 w-3 mr-1" />
                  Standing Order
                </Badge>
              )}
              {order.isMpf && (
                <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 font-medium">
                  <Factory className="h-3 w-3 mr-1" />
                  MPF
                </Badge>
              )}
              {saving && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving...
                </span>
              )}
              {stockpileUpdateFeedback && (
                <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 font-medium">
                  <Check className="h-3 w-3" />
                  {stockpileUpdateFeedback}
                </span>
              )}
            </div>
            {order.description && (
              <p className="text-sm text-muted-foreground mt-1">{order.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {order.shortId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const shortUrl = `https://foxhole-quartermaster.com/p/${order.shortId}`;
                navigator.clipboard.writeText(shortUrl);
                toast({
                  title: "Link copied",
                  description: shortUrl,
                });
              }}
            >
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
          )}
          {canUpdate && (
            <Button
              variant="outline"
              size="sm"
              className="hover:border-faction/50"
              onClick={() => router.push(`/orders/production/${id}/edit`)}
            >
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}
          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive hover:border-destructive/50">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="glass-overlay">
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
          )}
        </div>
      </div>

      {/* Standing Order Summary (compact) */}
      {order.isStandingOrder && (
        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Progress
                value={order.progress.percentage}
                className={cn("h-2 w-28", order.progress.percentage === 100 && "[&>div]:bg-emerald-500")}
              />
              <span className="text-sm font-medium">
                {order.progress.percentage}% stocked
              </span>
              <span className="text-xs text-muted-foreground">
                ({order.progress.itemsComplete}/{order.progress.itemsTotal} met)
              </span>
            </div>
            {order.linkedStockpile && (
              <>
                <span className="text-muted-foreground text-xs">|</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={() => router.push(`/stockpiles/${order.linkedStockpile!.id}`)}
                >
                  <MapPin className="h-3 w-3 mr-1 text-teal-500" />
                  {order.linkedStockpile.hex} - {order.linkedStockpile.name}
                </Button>
              </>
            )}
            {order.targetStockpiles && order.targetStockpiles.length > 0 && (
              <>
                <span className="text-muted-foreground text-xs">|</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Deliver to:</span>
                  {order.targetStockpiles.map((ts) => (
                    <Badge key={ts.stockpile.id} variant="secondary" className="text-xs font-normal py-0">
                      {ts.stockpile.name}
                    </Badge>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Overall Progress (non-standing orders) */}
      {!order.isStandingOrder && (
        <Card variant="interactive" className="group">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="h-8 w-8 rounded-md bg-faction-muted flex items-center justify-center transition-colors group-hover:bg-faction/20">
                <ChevronRight className="h-4 w-4 text-faction" />
              </div>
              Overall Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {order.progress.itemsComplete} of {order.progress.itemsTotal} items complete
              </span>
              <span className="text-xl font-bold">{order.progress.percentage}%</span>
            </div>
            <Progress
              value={order.progress.percentage}
              className={cn(
                "h-3",
                order.progress.percentage === 100 && "[&>div]:bg-emerald-500"
              )}
            />
            <div className="text-xs text-muted-foreground">
              {order.progress.totalProduced.toLocaleString()} / {order.progress.totalRequired.toLocaleString()} total items produced
            </div>
          </CardContent>
        </Card>
      )}

      {/* MPF Status Card */}
      {order.isMpf && (
        <Card className={cn(
          "transition-colors duration-150",
          order.status === "READY_FOR_PICKUP" && "border-green-500/50 bg-green-500/5"
        )}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className={cn(
                "h-8 w-8 rounded-md flex items-center justify-center",
                order.status === "READY_FOR_PICKUP"
                  ? "bg-green-500/20"
                  : "bg-indigo-500/10"
              )}>
                <Timer className={cn(
                  "h-4 w-4",
                  order.status === "READY_FOR_PICKUP"
                    ? "text-green-500"
                    : "text-indigo-500"
                )} />
              </div>
              MPF Production
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* PENDING - Show submit button */}
            {order.status === "PENDING" && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  This order needs to be submitted to a Mass Production Factory.
                </p>
                {canUpdate && (
                  <Button variant="faction" onClick={() => setShowMpfSubmitDialog(true)}>
                    <Clock className="h-4 w-4 mr-2" />
                    Submit to MPF
                  </Button>
                )}
              </div>
            )}

            {/* IN_PROGRESS - Show countdown */}
            {order.status === "IN_PROGRESS" && order.mpfReadyAt && (
              <div className="space-y-3">
                <CountdownTimer
                  targetTime={order.mpfReadyAt}
                  startTime={order.mpfSubmittedAt}
                  onExpire={handleTimerExpire}
                  variant="default"
                />
                {order.mpfSubmittedAt && (
                  <p className="text-xs text-muted-foreground">
                    Submitted {formatDate(order.mpfSubmittedAt)}
                  </p>
                )}
              </div>
            )}

            {/* READY_FOR_PICKUP - Show delivery button */}
            {order.status === "READY_FOR_PICKUP" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check className="h-4 w-4" />
                  </div>
                  <span className="font-semibold text-lg">Ready for pickup!</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Pick up the items from the MPF and deliver to a stockpile.
                </p>
                {canUpdate && (
                  <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => setShowDeliveryDialog(true)}>
                    <Package className="h-4 w-4 mr-2" />
                    Mark as Delivered
                  </Button>
                )}
              </div>
            )}

            {/* COMPLETED - Show delivery info */}
            {order.status === "COMPLETED" && order.deliveryStockpile && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check className="h-4 w-4" />
                  </div>
                  <span className="font-semibold">Delivered</span>
                </div>
                <div className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/50">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>
                    {order.deliveryStockpile.hex} - {order.deliveryStockpile.locationName} - {order.deliveryStockpile.name}
                  </span>
                </div>
                {order.deliveredAt && (
                  <p className="text-xs text-muted-foreground">
                    {formatDate(order.deliveredAt)}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Target Stockpiles (non-standing orders) */}
      {!order.isStandingOrder && order.targetStockpiles && order.targetStockpiles.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="h-8 w-8 rounded-md bg-faction-muted flex items-center justify-center">
                <MapPin className="h-4 w-4 text-faction" />
              </div>
              Target Stockpiles
            </CardTitle>
            <CardDescription className="mt-1.5">
              Where items should be delivered
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {order.targetStockpiles.map((ts) => (
                <div
                  key={ts.stockpile.id}
                  className="flex items-center gap-2 text-sm p-3 rounded-lg bg-muted/50 border border-border/50"
                >
                  <MapPin className="h-4 w-4 text-faction shrink-0" />
                  <span>
                    {ts.stockpile.hex} - {ts.stockpile.locationName} - <span className="font-medium">{ts.stockpile.name}</span>
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Items */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-faction-muted flex items-center justify-center">
              <Package className="h-4 w-4 text-faction" />
            </div>
            Items
          </CardTitle>
          <CardDescription className="mt-1.5">
            {order.isStandingOrder
              ? "Track production progress. Stockpile levels shown from latest scan."
              : isEditable
                ? "Update quantities as items are produced"
                : "This order is no longer editable"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {/* Standing order: compact fulfillment + editable quantities */}
            {order.isStandingOrder && order.fulfillment ? (
              order.fulfillment.items.map((fi) => {
                const orderItem = order.items.find((i) => i.itemCode === fi.itemCode);
                if (!orderItem) return null;

                return (
                  <div
                    key={fi.itemCode}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-lg border transition-all duration-150",
                      fi.fulfilled
                        ? "bg-emerald-500/5 border-emerald-500/30"
                        : fi.current > 0
                          ? "bg-amber-500/5 border-amber-500/20"
                          : "border-border/50"
                    )}
                  >
                    {/* Icon */}
                    <div className="relative shrink-0">
                      <div className={cn(
                        "h-8 w-8 rounded flex items-center justify-center",
                        fi.fulfilled ? "bg-emerald-500/10" : "bg-muted"
                      )}>
                        <img
                          src={getItemIconUrl(fi.itemCode)}
                          alt=""
                          className="h-6 w-6 object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </div>
                      {fi.fulfilled && (
                        <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 flex items-center justify-center">
                          <Check className="h-2.5 w-2.5 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Name + stockpile status */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {getItemDisplayName(fi.itemCode)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <span className={cn(
                          "font-medium",
                          fi.fulfilled
                            ? "text-emerald-600 dark:text-emerald-400"
                            : fi.current > 0
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-red-600 dark:text-red-400"
                        )}>
                          {fi.current.toLocaleString()}
                        </span>
                        {" / "}
                        {fi.required.toLocaleString()} in stockpile
                        {!fi.fulfilled && (
                          <span className="text-red-600 dark:text-red-400 ml-1">
                            (-{fi.deficit.toLocaleString()})
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Edit controls */}
                    {isEditable && (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min="0"
                          max={orderItem.quantityRequired}
                          value={orderItem.quantityProduced}
                          onChange={(e) => updateItemQuantity(orderItem.itemCode, parseInt(e.target.value) || 0)}
                          className="w-16 h-7 text-center text-xs font-medium"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 hover:border-faction/50"
                          onClick={() => updateItemQuantity(orderItem.itemCode, orderItem.quantityProduced + 1)}
                          disabled={orderItem.quantityProduced >= orderItem.quantityRequired}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 hover:border-faction/50"
                          onClick={() => updateItemQuantity(orderItem.itemCode, orderItem.quantityProduced + 10)}
                          disabled={orderItem.quantityProduced >= orderItem.quantityRequired}
                        >
                          <span className="text-xs font-medium">+10</span>
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              /* Regular order: show editable quantities */
              order.items.map((item) => {
                const isComplete = item.quantityProduced >= item.quantityRequired;

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-lg border border-border/50 transition-all duration-150",
                      isComplete
                        ? "bg-green-500/5 border-green-500/30"
                        : "hover:bg-muted/30"
                    )}
                  >
                    {/* Icon */}
                    <div className="relative shrink-0">
                      <div className={cn(
                        "h-8 w-8 rounded flex items-center justify-center",
                        isComplete ? "bg-green-500/10" : "bg-muted"
                      )}>
                        <img
                          src={getItemIconUrl(item.itemCode)}
                          alt=""
                          className="h-6 w-6 object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </div>
                      {isComplete && (
                        <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-green-500 flex items-center justify-center">
                          <Check className="h-2.5 w-2.5 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {getItemDisplayName(item.itemCode)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantityProduced.toLocaleString()} / {item.quantityRequired.toLocaleString()}
                      </p>
                    </div>

                    {/* Controls */}
                    {isEditable && (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min="0"
                          max={item.quantityRequired}
                          value={item.quantityProduced}
                          onChange={(e) => updateItemQuantity(item.itemCode, parseInt(e.target.value) || 0)}
                          className="w-16 h-7 text-center text-xs font-medium"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 hover:border-faction/50"
                          onClick={() => updateItemQuantity(item.itemCode, item.quantityProduced + 1)}
                          disabled={item.quantityProduced >= item.quantityRequired}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 hover:border-faction/50"
                          onClick={() => updateItemQuantity(item.itemCode, item.quantityProduced + 10)}
                          disabled={item.quantityProduced >= item.quantityRequired}
                        >
                          <span className="text-xs font-medium">+10</span>
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Metadata */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center">
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Created by</p>
              <div className="flex items-center gap-2 mt-1.5">
                <Avatar className="h-6 w-6 ring-1 ring-border/50">
                  <AvatarImage src={order.createdBy.image || undefined} />
                  <AvatarFallback className="text-xs bg-muted">
                    {order.createdBy.name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">{order.createdBy.name || "Unknown"}</span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Created</p>
              <p className="mt-1.5 font-medium">{formatDate(order.createdAt)}</p>
            </div>
            {order.completedAt && (
              <div className="p-3 rounded-lg bg-green-500/10">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Completed</p>
                <p className="mt-1.5 font-medium text-green-600 dark:text-green-400">{formatDate(order.completedAt)}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* MPF Submit Dialog */}
      <Dialog open={showMpfSubmitDialog} onOpenChange={setShowMpfSubmitDialog}>
        <DialogContent className="glass-overlay">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-md bg-indigo-500/10 flex items-center justify-center">
                <Timer className="h-4 w-4 text-indigo-500" />
              </div>
              Submit to MPF
            </DialogTitle>
            <DialogDescription>
              Enter the production time shown in the Mass Production Factory interface.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Production Time (HH:MM:SS)</Label>
              <DurationInput
                value={mpfDuration}
                onChange={setMpfDuration}
                placeholder="0:00:00"
              />
              <p className="text-xs text-muted-foreground">
                Enter the time exactly as shown in Foxhole (e.g., 3:55:32)
              </p>
            </div>
            {mpfDuration && mpfDuration > 0 && (
              <p className="text-sm text-muted-foreground">
                Order will be ready in {formatDuration(mpfDuration)}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowMpfSubmitDialog(false);
                setMpfDuration(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="faction"
              onClick={handleMpfSubmit}
              disabled={!mpfDuration || mpfDuration <= 0 || submittingMpf}
            >
              {submittingMpf ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Start Production"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delivery Dialog */}
      <Dialog open={showDeliveryDialog} onOpenChange={setShowDeliveryDialog}>
        <DialogContent className="glass-overlay">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-md bg-green-500/10 flex items-center justify-center">
                <Package className="h-4 w-4 text-green-500" />
              </div>
              Mark as Delivered
            </DialogTitle>
            <DialogDescription>
              Select the stockpile where the items were delivered.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Delivery Stockpile</Label>
              <StockpileSelector
                stockpiles={stockpiles}
                value={deliveryStockpileId}
                onSelect={setDeliveryStockpileId}
                placeholder="Search stockpiles..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeliveryDialog(false);
                setDeliveryStockpileId("");
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleDelivery}
              disabled={!deliveryStockpileId || completing}
            >
              {completing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Completing...
                </>
              ) : (
                "Complete Delivery"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stockpile Selection Dialog (for multi-target orders) */}
      <Dialog open={showStockpileSelectDialog} onOpenChange={setShowStockpileSelectDialog}>
        <DialogContent className="glass-overlay">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-md bg-faction-muted flex items-center justify-center">
                <MapPin className="h-4 w-4 text-faction" />
              </div>
              Select Target Stockpile
            </DialogTitle>
            <DialogDescription>
              This order has multiple target stockpiles. Select which stockpile should receive the produced items.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            {order?.targetStockpiles?.map((ts) => (
              <Button
                key={ts.stockpile.id}
                variant="outline"
                className="w-full justify-start h-auto py-3 hover:border-faction/50 hover:bg-faction-muted/50"
                onClick={() => handleStockpileSelect(ts.stockpile.id)}
              >
                <MapPin className="h-4 w-4 mr-2 shrink-0 text-faction" />
                <span className="text-left">
                  {ts.stockpile.hex} - <span className="font-medium">{ts.stockpile.name}</span>
                </span>
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowStockpileSelectDialog(false);
                setPendingChanges(new Map()); // Clear pending changes if cancelled
              }}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

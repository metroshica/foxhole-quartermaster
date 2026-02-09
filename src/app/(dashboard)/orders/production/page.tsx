"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Factory, RefreshCw, Loader2, Archive, Package } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { CountdownTimer } from "@/components/features/mpf/countdown-timer";
import { cn } from "@/lib/utils";

interface ProductionOrderItem {
  id: string;
  itemCode: string;
  quantityRequired: number;
  quantityProduced: number;
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
  // Standing order fields
  isStandingOrder: boolean;
  linkedStockpileId: string | null;
  linkedStockpile: { id: string; name: string; hex: string; locationName: string } | null;
  archivedAt: string | null;
  fulfillment?: {
    items: FulfillmentItem[];
    allFulfilled: boolean;
    percentage: number;
  };
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  READY_FOR_PICKUP: "Ready",
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

export default function ProductionOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter === "archived") {
        params.set("archived", "true");
      } else if (filter !== "all") {
        params.set("status", filter);
      }
      const response = await fetch(`/api/orders/production?${params}`);
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [filter]);

  // Auto-refresh for MPF orders (to check timer status)
  useEffect(() => {
    const hasMpfInProgress = orders.some(
      (order) => order.isMpf && order.status === "IN_PROGRESS"
    );
    if (!hasMpfInProgress) return;

    const interval = setInterval(() => {
      fetchOrders();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [orders]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-faction-muted flex items-center justify-center">
            <Factory className="h-5 w-5 text-faction" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Production Orders
            </h1>
            <p className="text-sm text-muted-foreground">
              Track item production progress for your regiment
            </p>
          </div>
        </div>
        {filter !== "archived" && (
          <Button variant="faction" onClick={() => router.push("/orders/production/new")}>
            <Plus className="h-4 w-4 mr-2" />
            New Order
          </Button>
        )}
      </div>

      {/* Filters */}
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="PENDING">Pending</TabsTrigger>
          <TabsTrigger value="IN_PROGRESS">In Progress</TabsTrigger>
          <TabsTrigger value="READY_FOR_PICKUP">Ready for Pickup</TabsTrigger>
          <TabsTrigger value="COMPLETED">Completed</TabsTrigger>
          <TabsTrigger value="archived" className="gap-1.5">
            <Archive className="h-3.5 w-3.5" />
            Archived
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Orders List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : orders.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center mb-4">
              <Factory className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-center">
              {filter === "all"
                ? "No production orders yet. Create one to get started."
                : `No ${STATUS_LABELS[filter]?.toLowerCase()} orders.`}
            </p>
            {filter === "all" && (
              <Button
                variant="faction"
                className="mt-4"
                onClick={() => router.push("/orders/production/new")}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Order
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {orders.map((order) => (
            <Card
              key={order.id}
              variant="interactive"
              className="cursor-pointer group"
              onClick={() => router.push(`/orders/production/${order.id}`)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-lg group-hover:text-foreground transition-colors">
                  {order.name}
                </CardTitle>
                <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                  {order.isStandingOrder ? (
                    <Badge variant="outline" className={cn(
                      "font-medium",
                      order.fulfillment?.allFulfilled
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                    )}>
                      {order.fulfillment?.allFulfilled ? "Fulfilled" : "In Deficit"}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className={cn("font-medium", STATUS_COLORS[order.status])}>
                      {STATUS_LABELS[order.status]}
                    </Badge>
                  )}
                  {order.isStandingOrder && (
                    <Badge variant="outline" className="bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30 font-medium">
                      <Package className="h-3 w-3 mr-1" />
                      Standing
                    </Badge>
                  )}
                  {order.isMpf && (
                    <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 font-medium">
                      <Factory className="h-3 w-3 mr-1" />
                      MPF
                    </Badge>
                  )}
                </div>
                {order.description && (
                  <CardDescription className="line-clamp-2 mt-1.5">
                    {order.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* MPF Timer Preview */}
                {order.isMpf && order.status === "IN_PROGRESS" && order.mpfReadyAt && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/20">
                    <CountdownTimer
                      targetTime={order.mpfReadyAt}
                      startTime={order.mpfSubmittedAt}
                      variant="compact"
                      expiredText="Ready!"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">MPF In Progress</span>
                      <span className="text-xs text-muted-foreground">Production timer</span>
                    </div>
                  </div>
                )}

                {/* Ready for Pickup Notice */}
                {order.isMpf && order.status === "READY_FOR_PICKUP" && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Factory className="h-4 w-4 text-green-500" />
                    </div>
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                      Ready for pickup!
                    </span>
                  </div>
                )}

                {/* Progress / Fulfillment */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {order.isStandingOrder ? "Fulfillment" : "Progress"}
                    </span>
                    <span className="font-semibold">
                      {order.progress.itemsComplete} / {order.progress.itemsTotal} items
                    </span>
                  </div>
                  <Progress
                    value={order.progress.percentage}
                    className={cn(
                      "h-2",
                      order.progress.percentage === 100 && "[&>div]:bg-green-500"
                    )}
                  />
                  <div className="text-xs text-muted-foreground text-right">
                    {order.isStandingOrder
                      ? `${order.progress.percentage}% stocked`
                      : `${order.progress.totalProduced.toLocaleString()} / ${order.progress.totalRequired.toLocaleString()} total`}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6 ring-1 ring-border/50">
                      <AvatarImage src={order.createdBy.image || undefined} />
                      <AvatarFallback className="text-xs bg-muted">
                        {order.createdBy.name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </span>
                  </div>
                  <Badge variant="secondary" className={cn("font-medium", PRIORITY_COLORS[order.priority])}>
                    {PRIORITY_LABELS[order.priority]}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

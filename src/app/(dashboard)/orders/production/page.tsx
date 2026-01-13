"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Factory, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

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

export default function ProductionOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") {
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Factory className="h-6 w-6" />
            Production Orders
          </h1>
          <p className="text-muted-foreground">
            Track item production progress for your regiment.
          </p>
        </div>
        <Button onClick={() => router.push("/orders/production/new")}>
          <Plus className="h-4 w-4 mr-2" />
          New Order
        </Button>
      </div>

      {/* Filters */}
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="PENDING">Pending</TabsTrigger>
          <TabsTrigger value="IN_PROGRESS">In Progress</TabsTrigger>
          <TabsTrigger value="COMPLETED">Completed</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Orders List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Factory className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              {filter === "all"
                ? "No production orders yet. Create one to get started."
                : `No ${STATUS_LABELS[filter]?.toLowerCase()} orders.`}
            </p>
            {filter === "all" && (
              <Button
                variant="outline"
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
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => router.push(`/orders/production/${order.id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg truncate">{order.name}</CardTitle>
                  <Badge variant="outline" className={STATUS_COLORS[order.status]}>
                    {STATUS_LABELS[order.status]}
                  </Badge>
                </div>
                {order.description && (
                  <CardDescription className="line-clamp-2">
                    {order.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">
                      {order.progress.itemsComplete} / {order.progress.itemsTotal} items
                    </span>
                  </div>
                  <Progress value={order.progress.percentage} className="h-2" />
                  <div className="text-xs text-muted-foreground text-right">
                    {order.progress.totalProduced.toLocaleString()} / {order.progress.totalRequired.toLocaleString()} total
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={order.createdBy.image || undefined} />
                      <AvatarFallback className="text-xs">
                        {order.createdBy.name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </span>
                  </div>
                  <Badge variant="secondary" className={PRIORITY_COLORS[order.priority]}>
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

"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Plus, Target, Calendar, MapPin, Package, RefreshCw, Archive } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Operation {
  id: string;
  name: string;
  description: string | null;
  status: "PLANNING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  scheduledFor: string | null;
  location: string | null;
  createdAt: string;
  createdBy: {
    id: string;
    name: string | null;
    image: string | null;
  };
  destinationStockpile: {
    id: string;
    name: string;
    hex: string;
    locationName: string;
  } | null;
  _count: {
    requirements: number;
  };
}

const STATUS_COLORS: Record<string, string> = {
  PLANNING: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  ACTIVE: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  COMPLETED: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20",
  CANCELLED: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
};

export default function OperationsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const canCreate = session?.user?.permissions?.includes("operation.create") ?? false;

  const fetchOperations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter === "archived") {
        params.set("archived", "true");
      } else if (filter !== "all") {
        params.set("status", filter);
      }
      const response = await fetch(`/api/operations?${params}`);
      if (response.ok) {
        const data = await response.json();
        setOperations(data);
      }
    } catch (error) {
      console.error("Error fetching operations:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOperations();
  }, [filter]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 1) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Operations</h1>
          <p className="text-muted-foreground">
            Plan and track military operations with equipment requirements
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchOperations} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          {filter !== "archived" && canCreate && (
            <Button onClick={() => router.push("/operations/new")}>
              <Plus className="h-4 w-4 mr-2" />
              New Operation
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="PLANNING">Planning</TabsTrigger>
          <TabsTrigger value="ACTIVE">Active</TabsTrigger>
          <TabsTrigger value="COMPLETED">Completed</TabsTrigger>
          <TabsTrigger value="archived" className="gap-1.5">
            <Archive className="h-3.5 w-3.5" />
            Archived
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Operations List */}
      {operations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg">No operations yet</h3>
            <p className="text-muted-foreground text-center mt-2">
              Create your first operation to start planning equipment requirements
            </p>
            {canCreate && (
              <Button className="mt-4" onClick={() => router.push("/operations/new")}>
                <Plus className="h-4 w-4 mr-2" />
                Create Operation
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {operations.map((operation) => (
            <Card
              key={operation.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => router.push(`/operations/${operation.id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{operation.name}</CardTitle>
                  <Badge variant="outline" className={STATUS_COLORS[operation.status]}>
                    {operation.status.toLowerCase()}
                  </Badge>
                </div>
                {operation.description && (
                  <CardDescription className="line-clamp-2">
                    {operation.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {operation.scheduledFor && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDate(operation.scheduledFor)}</span>
                  </div>
                )}

                {operation.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{operation.location}</span>
                  </div>
                )}

                {operation.destinationStockpile && (
                  <div className="flex items-center gap-2 text-sm">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">
                      Supplies to: {operation.destinationStockpile.name}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Target className="h-4 w-4" />
                    <span>{operation._count.requirements} requirements</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(operation.createdAt)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

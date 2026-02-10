"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Package,
  Target,
  Loader2,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getItemIconUrl } from "@/lib/foxhole/item-icons";

interface Requirement {
  id: string;
  itemCode: string;
  displayName: string;
  required: number;
  available: number;
  deficit: number;
  fulfilled: boolean;
}

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
    type: string;
    hex: string;
    locationName: string;
  } | null;
  requirements: Requirement[];
  summary: {
    totalRequired: number;
    totalAvailable: number;
    totalDeficit: number;
    itemsWithDeficit: number;
    totalItems: number;
    fulfillmentPercent: number;
  };
}

const STATUS_COLORS: Record<string, string> = {
  PLANNING: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  ACTIVE: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  COMPLETED: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20",
  CANCELLED: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
};

export default function OperationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const operationId = params.id as string;

  const [operation, setOperation] = useState<Operation | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const permissions = session?.user?.permissions ?? [];
  const canUpdate = permissions.includes("operation.update");
  const canDelete = permissions.includes("operation.delete");

  const fetchOperation = async () => {
    try {
      const response = await fetch(`/api/operations/${operationId}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError("Operation not found");
        } else {
          throw new Error("Failed to fetch operation");
        }
        return;
      }
      const data = await response.json();
      setOperation(data);
    } catch (error) {
      console.error("Error fetching operation:", error);
      setError("Failed to load operation");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOperation();

    // Auto-refresh every 60 seconds to pick up scan updates
    const interval = setInterval(() => {
      fetchOperation();
    }, 60_000);

    return () => clearInterval(interval);
  }, [operationId]);

  const updateStatus = async (status: string) => {
    setUpdating(true);
    try {
      const response = await fetch(`/api/operations/${operationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      await fetchOperation();
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setUpdating(false);
    }
  };

  const deleteOperation = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/operations/${operationId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete operation");
      }

      router.push("/operations");
    } catch (error) {
      console.error("Error deleting operation:", error);
      setError(error instanceof Error ? error.message : "Failed to delete operation");
      setDeleting(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !operation) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Operation Not Found</h1>
          </div>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{error || "Operation not found"}</p>
            <Button className="mt-4" onClick={() => router.push("/operations")}>
              Back to Operations
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const deficitItems = operation.requirements.filter((r) => r.deficit > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{operation.name}</h1>
              <Badge variant="outline" className={STATUS_COLORS[operation.status]}>
                {operation.status.toLowerCase()}
              </Badge>
            </div>
            {operation.description && (
              <p className="text-muted-foreground mt-1">{operation.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canUpdate && (
            <Select
              value={operation.status}
              onValueChange={updateStatus}
              disabled={updating}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PLANNING">Planning</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          )}

          {canUpdate && (
            <Button
              variant="outline"
              onClick={() => router.push(`/operations/${operationId}/edit`)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}

          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={deleting}>
                  {deleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Operation</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete &quot;{operation.name}&quot;? This action
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteOperation}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {operation.scheduledFor && (
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Scheduled</p>
                <p className="font-medium">{formatDate(operation.scheduledFor)}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {operation.location && (
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Target Location</p>
                <p className="font-medium">{operation.location}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {operation.destinationStockpile && (
          <Link href={`/stockpiles/${operation.destinationStockpile.id}`}>
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardContent className="flex items-center gap-3 pt-6">
                <Package className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Supply Destination</p>
                  <p className="font-medium">{operation.destinationStockpile.hex} - {operation.destinationStockpile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {operation.destinationStockpile.locationName}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>

      {/* Fulfillment Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Equipment Status
          </CardTitle>
          <CardDescription>
            {operation.summary.fulfillmentPercent}% of requirements can be fulfilled from {operation.destinationStockpile ? `${operation.destinationStockpile.hex} - ${operation.destinationStockpile.name}` : "inventory (no destination set)"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={operation.summary.fulfillmentPercent} className="h-3" />

          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Required</p>
              <p className="text-2xl font-bold">{operation.summary.totalRequired.toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Available</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {operation.summary.totalAvailable.toLocaleString()}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Deficit</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {operation.summary.totalDeficit.toLocaleString()}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Items Needing Production</p>
              <p className="text-2xl font-bold">
                {operation.summary.itemsWithDeficit} / {operation.summary.totalItems}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requirements Table */}
      <Card>
        <CardHeader>
          <CardTitle>Requirements</CardTitle>
          <CardDescription>
            Items needed for this operation with deficit calculation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {operation.requirements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No requirements added</p>
              {canUpdate && (
                <Button
                  variant="link"
                  className="mt-2"
                  onClick={() => router.push(`/operations/${operationId}/edit`)}
                >
                  Add requirements
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium">Item</th>
                    <th className="pb-3 font-medium text-right">Required</th>
                    <th className="pb-3 font-medium text-right">Available</th>
                    <th className="pb-3 font-medium text-right">Deficit</th>
                    <th className="pb-3 font-medium text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {operation.requirements.map((req) => (
                    <tr
                      key={req.id}
                      className={`border-b last:border-0 ${
                        req.deficit > 0 ? "bg-red-500/5" : ""
                      }`}
                    >
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={getItemIconUrl(req.itemCode)}
                            alt=""
                            className="h-8 w-8 object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                          <div>
                            <p className="font-medium">{req.displayName}</p>
                            <p className="text-xs text-muted-foreground">{req.itemCode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-right font-mono">
                        {req.required.toLocaleString()}
                      </td>
                      <td className="py-3 text-right font-mono text-green-600 dark:text-green-400">
                        {req.available.toLocaleString()}
                      </td>
                      <td className="py-3 text-right font-mono">
                        {req.deficit > 0 ? (
                          <span className="text-red-600 dark:text-red-400">
                            -{req.deficit.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="py-3 text-center">
                        {req.fulfilled ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mx-auto" />
                        ) : (
                          <Clock className="h-5 w-5 text-orange-500 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Production Order Summary */}
      {deficitItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Production Order
            </CardTitle>
            <CardDescription>
              Items that need to be produced to fulfill requirements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {deficitItems.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
                >
                  <img
                    src={getItemIconUrl(req.itemCode)}
                    alt=""
                    className="h-10 w-10 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{req.displayName}</p>
                    <p className="text-sm text-red-600 dark:text-red-400">
                      Need {req.deficit.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Created Info */}
      <div className="text-sm text-muted-foreground">
        Created by {operation.createdBy.name || "Unknown"} on{" "}
        {new Date(operation.createdAt).toLocaleDateString()}
      </div>
    </div>
  );
}

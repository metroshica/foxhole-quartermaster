"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  ArrowLeft,
  RefreshCw,
  Clock,
  MapPin,
  Trash2,
  Upload,
  History,
  Search,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { getItemDisplayName } from "@/lib/foxhole/item-names";
import { getItemIconUrl } from "@/lib/foxhole/item-icons";
import { getItemCodesByTag } from "@/lib/foxhole/item-tags";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { StockpileHistory } from "@/components/features/history/stockpile-history";
import { MinimumLevels } from "@/components/features/stockpiles/minimum-levels";

/**
 * Stockpile Detail Page
 *
 * Shows all items in a stockpile with quantities and confidence scores.
 */

interface StockpileItem {
  id: string;
  itemCode: string;
  quantity: number;
  crated: boolean;
  confidence: number | null;
}

interface Stockpile {
  id: string;
  name: string;
  type: string;
  hex: string;
  locationName: string;
  code: string | null;
  createdAt: string;
  updatedAt: string;
  items: StockpileItem[];
}

const TYPE_LABELS: Record<string, string> = {
  STORAGE_DEPOT: "Storage Depot",
  SEAPORT: "Seaport",
};

function ItemCard({ item }: { item: StockpileItem }) {
  const [imgError, setImgError] = useState(false);
  const iconUrl = getItemIconUrl(item.itemCode);
  const displayName = getItemDisplayName(item.itemCode);

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="relative h-10 w-10 flex-shrink-0 bg-muted rounded flex items-center justify-center overflow-hidden">
        {!imgError ? (
          // Using regular img tag to avoid Next.js Image optimization issues with external URLs
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={iconUrl}
            alt={displayName}
            width={40}
            height={40}
            className="object-contain"
            onError={() => setImgError(true)}
          />
        ) : (
          <Package className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{displayName}</p>
      </div>
      <div className="text-right">
        <p className="font-bold text-lg tabular-nums">{item.quantity.toLocaleString()}</p>
      </div>
    </div>
  );
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function StockpileDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const { data: session } = useSession();

  const [stockpile, setStockpile] = useState<Stockpile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [itemSearch, setItemSearch] = useState("");

  const permissions = session?.user?.permissions ?? [];
  const canUpload = permissions.includes("scanner.upload");
  const canDelete = permissions.includes("stockpile.delete");

  useEffect(() => {
    fetchStockpile();
  }, [id]);

  async function fetchStockpile() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/stockpiles/${id}`);
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to fetch stockpile");
      }
      const data = await response.json();
      setStockpile(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load stockpile"
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/stockpiles/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to delete stockpile");
      }
      toast({
        title: "Stockpile deleted",
        description: `"${stockpile?.name}" has been deleted`,
      });
      router.push("/stockpiles");
    } catch (err) {
      toast({
        title: "Delete failed",
        description:
          err instanceof Error ? err.message : "Failed to delete stockpile",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  function getTotalQuantity(): number {
    if (!stockpile) return 0;
    return stockpile.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  const filteredItems = stockpile
    ? stockpile.items.filter((item) => {
        if (!itemSearch) return true;
        const term = itemSearch.toLowerCase();
        const displayName = getItemDisplayName(item.itemCode).toLowerCase();
        if (displayName.includes(term) || item.itemCode.toLowerCase().includes(term)) return true;
        const tagMatches = getItemCodesByTag(term);
        return tagMatches.includes(item.itemCode);
      })
    : [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild>
          <Link href="/stockpiles">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Stockpiles
          </Link>
        </Button>
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !stockpile) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild>
          <Link href="/stockpiles">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Stockpiles
          </Link>
        </Button>
        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <p className="text-destructive">{error || "Stockpile not found"}</p>
            <Button variant="outline" onClick={fetchStockpile} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" asChild>
        <Link href="/stockpiles">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Stockpiles
        </Link>
      </Button>

      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Package className="h-6 w-6" />
                {stockpile.name}
              </CardTitle>
              <CardDescription className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {TYPE_LABELS[stockpile.type] || stockpile.type}
                  </Badge>
                  {stockpile.code && (
                    <Badge variant="outline">Code: {stockpile.code}</Badge>
                  )}
                </div>
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={fetchStockpile}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              {canUpload && (
                <Button variant="outline" asChild>
                  <Link href="/upload">
                    <Upload className="h-4 w-4 mr-2" />
                    Update
                  </Link>
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{stockpile.locationName}, {stockpile.hex}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{stockpile.items.length}</span>
              <span className="text-muted-foreground">unique items</span>
            </div>
            <div className="text-muted-foreground">
              {getTotalQuantity().toLocaleString()} total quantity
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-4 w-4" />
              Updated {formatDate(stockpile.updatedAt)}
            </div>
            <button
              onClick={() => {
                document.getElementById("scan-history")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <History className="h-4 w-4" />
              <span>View history</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Items Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory</CardTitle>
          <CardDescription>
            {itemSearch
              ? `Showing ${filteredItems.length} of ${stockpile.items.length} items`
              : `All ${stockpile.items.length} items in this stockpile sorted by quantity`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {stockpile.items.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items (e.g. bmat, rifle, HE)..."
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                className="pl-10"
                autoComplete="off"
              />
            </div>
          )}
          {stockpile.items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No items in this stockpile</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No items matching &quot;{itemSearch}&quot;</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredItems.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Minimum Levels */}
      <MinimumLevels
        stockpileId={id}
        canManage={
          session?.user?.permissions?.includes("stockpile.manage_minimums") ?? false
        }
      />

      {/* Scan History */}
      <div id="scan-history">
        <StockpileHistory stockpileId={id} />
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Stockpile</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{stockpile.name}&quot;? This
              action cannot be undone and all inventory data will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

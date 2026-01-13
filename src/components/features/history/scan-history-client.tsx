"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  MapPin,
  Package,
  Plus,
  Minus,
  RefreshCw,
  User,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getItemIconUrl } from "@/lib/foxhole/item-icons";

interface ItemDiff {
  itemCode: string;
  displayName: string;
  previousQuantity: number;
  currentQuantity: number;
  change: number;
  crated: boolean;
}

interface ScanEntry {
  id: string;
  stockpileId: string;
  stockpileName: string;
  stockpileHex: string;
  stockpileLocationName: string;
  scannedById: string;
  scannerName: string | null;
  scannerImage: string | null;
  itemCount: number;
  ocrConfidence: number | null;
  createdAt: string;
  diffs: ItemDiff[];
  totalAdded: number;
  totalRemoved: number;
  netChange: number;
}

interface ScanDetail {
  id: string;
  stockpile: {
    id: string;
    name: string;
    hex: string;
    locationName: string;
    type: string;
  };
  scanner: {
    id: string;
    name: string | null;
    image: string | null;
  };
  itemCount: number;
  ocrConfidence: number | null;
  createdAt: string;
  items: Array<{
    itemCode: string;
    displayName: string;
    quantity: number;
    crated: boolean;
    confidence: number | null;
  }>;
}

export function ScanHistoryClient() {
  const router = useRouter();
  const [scans, setScans] = useState<ScanEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [expandedScan, setExpandedScan] = useState<string | null>(null);
  const [scanDetails, setScanDetails] = useState<Record<string, ScanDetail>>({});
  const [loadingDetails, setLoadingDetails] = useState<string | null>(null);

  const fetchScans = useCallback(async (offset = 0, append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await fetch(`/api/history?limit=20&offset=${offset}`);
      if (response.ok) {
        const data = await response.json();
        if (append) {
          setScans((prev) => [...prev, ...data.scans]);
        } else {
          setScans(data.scans);
        }
        setTotal(data.total);
      }
    } catch (error) {
      console.error("Error fetching scan history:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchScans();
  }, [fetchScans]);

  const fetchScanDetails = useCallback(async (scanId: string) => {
    if (scanDetails[scanId]) return; // Already loaded

    setLoadingDetails(scanId);
    try {
      const response = await fetch(`/api/history/${scanId}`);
      if (response.ok) {
        const data = await response.json();
        setScanDetails((prev) => ({ ...prev, [scanId]: data }));
      }
    } catch (error) {
      console.error("Error fetching scan details:", error);
    } finally {
      setLoadingDetails(null);
    }
  }, [scanDetails]);

  const toggleExpand = (scanId: string) => {
    if (expandedScan === scanId) {
      setExpandedScan(null);
    } else {
      setExpandedScan(scanId);
      fetchScanDetails(scanId);
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const formatQuantity = (num: number) => num.toLocaleString();

  const hasMore = scans.length < total;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (scans.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium">No scan history yet</p>
          <p className="text-sm mt-1">
            Scan a stockpile to start building your audit trail.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Refresh button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchScans()}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Scan entries */}
      <div className="space-y-3">
        {scans.map((scan) => (
          <Card key={scan.id} className="overflow-hidden">
            <button
              onClick={() => toggleExpand(scan.id)}
              className="w-full text-left"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5">
                      {expandedScan === scan.id ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base font-medium truncate">
                        {scan.stockpileName}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" />
                        {scan.stockpileLocationName}, {scan.stockpileHex}
                      </CardDescription>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    {/* Net change summary */}
                    <div className="text-right">
                      {scan.diffs.length > 0 ? (
                        <div className="flex items-center gap-2">
                          {scan.totalAdded > 0 && (
                            <span className="flex items-center text-sm text-green-600 dark:text-green-400">
                              <Plus className="h-3 w-3 mr-0.5" />
                              {formatQuantity(scan.totalAdded)}
                            </span>
                          )}
                          {scan.totalRemoved > 0 && (
                            <span className="flex items-center text-sm text-red-600 dark:text-red-400">
                              <Minus className="h-3 w-3 mr-0.5" />
                              {formatQuantity(scan.totalRemoved)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Initial scan
                        </span>
                      )}
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {scan.itemCount} items
                      </div>
                    </div>

                    {/* Scanner info */}
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={scan.scannerImage || undefined} />
                        <AvatarFallback>
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-right">
                        <div className="text-sm font-medium truncate max-w-24">
                          {scan.scannerName || "Unknown"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatRelativeTime(scan.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Diff preview (top 5 changes) */}
                {scan.diffs.length > 0 && (
                  <div className="mt-3 ml-8 flex flex-wrap gap-2">
                    {scan.diffs.slice(0, 5).map((diff, i) => (
                      <div
                        key={`${diff.itemCode}-${diff.crated}-${i}`}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs ${
                          diff.change > 0
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                        }`}
                      >
                        <img
                          src={getItemIconUrl(diff.itemCode)}
                          alt=""
                          className="h-4 w-4 object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                        <span className="font-medium">
                          {diff.change > 0 ? "+" : ""}
                          {formatQuantity(diff.change)}
                        </span>
                        <span className="truncate max-w-20">{diff.displayName}</span>
                        {diff.crated && (
                          <span className="text-[10px] opacity-70">(C)</span>
                        )}
                      </div>
                    ))}
                    {scan.diffs.length > 5 && (
                      <div className="px-2 py-1 rounded-md text-xs bg-muted text-muted-foreground">
                        +{scan.diffs.length - 5} more
                      </div>
                    )}
                  </div>
                )}
              </CardHeader>
            </button>

            {/* Expanded details */}
            {expandedScan === scan.id && (
              <CardContent className="pt-0 border-t">
                {loadingDetails === scan.id ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : scanDetails[scan.id] ? (
                  <div className="pt-4 space-y-4">
                    {/* All diffs */}
                    {scan.diffs.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Changes from previous scan</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {scan.diffs.map((diff, i) => (
                            <div
                              key={`${diff.itemCode}-${diff.crated}-${i}`}
                              className={`flex items-center gap-2 p-2 rounded-md border ${
                                diff.change > 0
                                  ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/20"
                                  : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20"
                              }`}
                            >
                              <div className="h-8 w-8 rounded bg-background flex items-center justify-center shrink-0">
                                <img
                                  src={getItemIconUrl(diff.itemCode)}
                                  alt=""
                                  className="h-6 w-6 object-contain"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = "none";
                                  }}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">
                                  {diff.displayName}
                                  {diff.crated && (
                                    <span className="text-xs text-muted-foreground ml-1">(crated)</span>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {formatQuantity(diff.previousQuantity)} → {formatQuantity(diff.currentQuantity)}
                                </div>
                              </div>
                              <div
                                className={`text-sm font-bold ${
                                  diff.change > 0
                                    ? "text-green-600 dark:text-green-400"
                                    : "text-red-600 dark:text-red-400"
                                }`}
                              >
                                {diff.change > 0 ? "+" : ""}
                                {formatQuantity(diff.change)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Full scan contents */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">Full scan contents ({scanDetails[scan.id].items.length} items)</h4>
                      <div className="max-h-64 overflow-y-auto scrollbar-thin">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
                          {scanDetails[scan.id].items.map((item, i) => (
                            <div
                              key={`${item.itemCode}-${item.crated}-${i}`}
                              className="flex items-center gap-2 p-1.5 rounded bg-muted/50"
                            >
                              <div className="h-6 w-6 rounded bg-background flex items-center justify-center shrink-0">
                                <img
                                  src={getItemIconUrl(item.itemCode)}
                                  alt=""
                                  className="h-5 w-5 object-contain"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = "none";
                                  }}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs truncate">{item.displayName}</div>
                              </div>
                              <div className="text-xs font-medium shrink-0">
                                {formatQuantity(item.quantity)}
                                {item.crated && <span className="text-muted-foreground ml-0.5">C</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Navigate to stockpile */}
                    <div className="pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/stockpiles/${scan.stockpileId}`);
                        }}
                      >
                        <Package className="h-4 w-4 mr-2" />
                        View Stockpile
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    Failed to load scan details
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => fetchScans(scans.length, true)}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Load more ({total - scans.length} remaining)
          </Button>
        </div>
      )}
    </div>
  );
}

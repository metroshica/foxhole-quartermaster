"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Plus,
  Minus,
  User,
  History,
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
  items: Array<{
    itemCode: string;
    displayName: string;
    quantity: number;
    crated: boolean;
    confidence: number | null;
  }>;
}

interface StockpileHistoryProps {
  stockpileId: string;
}

export function StockpileHistory({ stockpileId }: StockpileHistoryProps) {
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
      const response = await fetch(`/api/history?stockpileId=${stockpileId}&limit=10&offset=${offset}`);
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
  }, [stockpileId]);

  useEffect(() => {
    fetchScans();
  }, [fetchScans]);

  const fetchScanDetails = useCallback(async (scanId: string) => {
    if (scanDetails[scanId]) return;

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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Scan History
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Scan History
        </CardTitle>
        <CardDescription>
          {total === 0
            ? "No scans recorded yet"
            : `${total} scan${total !== 1 ? "s" : ""} recorded for this stockpile`
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {scans.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-sm">Scan history will appear here after uploading scans.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {scans.map((scan) => (
              <div key={scan.id} className="border rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleExpand(scan.id)}
                  className="w-full text-left p-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {expandedScan === scan.id ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarImage src={scan.scannerImage || undefined} />
                        <AvatarFallback>
                          <User className="h-3 w-3" />
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium truncate">
                        {scan.scannerName || "Unknown"}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatRelativeTime(scan.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {scan.diffs.length > 0 ? (
                        <div className="flex items-center gap-2">
                          {scan.totalAdded > 0 && (
                            <span className="flex items-center text-xs text-green-600 dark:text-green-400">
                              <Plus className="h-3 w-3 mr-0.5" />
                              {formatQuantity(scan.totalAdded)}
                            </span>
                          )}
                          {scan.totalRemoved > 0 && (
                            <span className="flex items-center text-xs text-red-600 dark:text-red-400">
                              <Minus className="h-3 w-3 mr-0.5" />
                              {formatQuantity(scan.totalRemoved)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Initial scan</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {scan.itemCount} items
                      </span>
                    </div>
                  </div>

                  {/* Diff preview */}
                  {scan.diffs.length > 0 && (
                    <div className="mt-2 ml-6 flex flex-wrap gap-1.5">
                      {scan.diffs.slice(0, 4).map((diff, i) => (
                        <div
                          key={`${diff.itemCode}-${diff.crated}-${i}`}
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${
                            diff.change > 0
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                          }`}
                        >
                          <img
                            src={getItemIconUrl(diff.itemCode)}
                            alt=""
                            className="h-3 w-3 object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                          <span className="font-medium">
                            {diff.change > 0 ? "+" : ""}
                            {formatQuantity(diff.change)}
                          </span>
                        </div>
                      ))}
                      {scan.diffs.length > 4 && (
                        <span className="text-xs text-muted-foreground px-1">
                          +{scan.diffs.length - 4} more
                        </span>
                      )}
                    </div>
                  )}
                </button>

                {/* Expanded details */}
                {expandedScan === scan.id && (
                  <div className="border-t px-3 py-3 bg-muted/30">
                    {loadingDetails === scan.id ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : scanDetails[scan.id] ? (
                      <div className="space-y-3">
                        {/* All diffs */}
                        {scan.diffs.length > 0 && (
                          <div>
                            <h4 className="text-xs font-medium mb-2 text-muted-foreground">Changes</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {scan.diffs.map((diff, i) => (
                                <div
                                  key={`${diff.itemCode}-${diff.crated}-${i}`}
                                  className={`flex items-center gap-2 p-1.5 rounded text-xs ${
                                    diff.change > 0
                                      ? "bg-green-50 dark:bg-green-900/20"
                                      : "bg-red-50 dark:bg-red-900/20"
                                  }`}
                                >
                                  <img
                                    src={getItemIconUrl(diff.itemCode)}
                                    alt=""
                                    className="h-5 w-5 object-contain shrink-0"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = "none";
                                    }}
                                  />
                                  <span className="truncate flex-1">{diff.displayName}</span>
                                  <span className="text-muted-foreground">
                                    {formatQuantity(diff.previousQuantity)} → {formatQuantity(diff.currentQuantity)}
                                  </span>
                                  <span
                                    className={`font-medium ${
                                      diff.change > 0
                                        ? "text-green-600 dark:text-green-400"
                                        : "text-red-600 dark:text-red-400"
                                    }`}
                                  >
                                    {diff.change > 0 ? "+" : ""}
                                    {formatQuantity(diff.change)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Full contents (collapsed by default, show count) */}
                        <div className="text-xs text-muted-foreground">
                          Full scan: {scanDetails[scan.id].items.length} items totaling{" "}
                          {formatQuantity(
                            scanDetails[scan.id].items.reduce((sum, item) => sum + item.quantity, 0)
                          )} quantity
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        Failed to load details
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Load more */}
            {hasMore && (
              <div className="pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
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
        )}
      </CardContent>
    </Card>
  );
}

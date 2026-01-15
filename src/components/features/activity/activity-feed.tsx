"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Activity, Scan, Factory, Target, ArrowUp, ArrowDown, ChevronDown, ChevronUp, Timer } from "lucide-react";
import Link from "next/link";
import { getItemIconUrl } from "@/lib/foxhole/item-icons";

type ActivityType = "SCAN" | "PRODUCTION" | "OPERATION" | "STOCKPILE_REFRESH";

interface ItemChange {
  itemCode: string;
  displayName: string;
  change: number;
  crated: boolean;
}

interface BaseActivity {
  id: string;
  type: ActivityType;
  userId: string;
  userName: string;
  userAvatar: string | null;
  timestamp: string;
}

interface ScanActivity extends BaseActivity {
  type: "SCAN";
  scan: {
    stockpileName: string;
    stockpileHex: string;
    totalAdded: number;
    totalRemoved: number;
    points: number;
    itemChanges: ItemChange[];
  };
}

interface ProductionActivity extends BaseActivity {
  type: "PRODUCTION";
  production: {
    orderName: string;
    itemCode: string;
    itemName: string;
    quantity: number;
  };
}

interface OperationActivity extends BaseActivity {
  type: "OPERATION";
  operation: {
    operationName: string;
    action: "CREATED" | "STARTED" | "COMPLETED" | "CANCELLED";
  };
}

interface StockpileRefreshActivity extends BaseActivity {
  type: "STOCKPILE_REFRESH";
  refresh: {
    stockpileName: string;
    stockpileHex: string;
    points: number;
  };
}

type ActivityItem = ScanActivity | ProductionActivity | OperationActivity | StockpileRefreshActivity;

interface ActivityFeedProps {
  compact?: boolean;
  limit?: number;
  autoRefresh?: boolean;
  refreshTrigger?: number;
}

function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getActivityIcon(type: ActivityType) {
  switch (type) {
    case "SCAN":
      return <Scan className="h-4 w-4" />;
    case "PRODUCTION":
      return <Factory className="h-4 w-4" />;
    case "OPERATION":
      return <Target className="h-4 w-4" />;
    case "STOCKPILE_REFRESH":
      return <Timer className="h-4 w-4" />;
  }
}

function getOperationActionLabel(action: string): { label: string; color: string } {
  switch (action) {
    case "CREATED":
      return { label: "created", color: "text-blue-500" };
    case "STARTED":
      return { label: "started", color: "text-green-500" };
    case "COMPLETED":
      return { label: "completed", color: "text-emerald-500" };
    case "CANCELLED":
      return { label: "cancelled", color: "text-red-500" };
    default:
      return { label: action.toLowerCase(), color: "text-muted-foreground" };
  }
}

function formatQuantity(num: number): string {
  if (Math.abs(num) >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (Math.abs(num) >= 1000) {
    return (num / 1000).toFixed(1) + "k";
  }
  return num.toString();
}

function ActivityItemComponent({
  activity,
  isExpanded,
  onToggle
}: {
  activity: ActivityItem;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const hasExpandableContent = activity.type === "SCAN" && activity.scan.itemChanges.length > 0;

  return (
    <div className={hasExpandableContent ? "cursor-pointer" : ""}>
      <div
        className="flex items-start gap-3 p-2 hover:bg-muted/50 rounded-md"
        onClick={hasExpandableContent ? onToggle : undefined}
      >
        <Avatar className="h-8 w-8 mt-0.5">
          <AvatarImage src={activity.userAvatar || undefined} />
          <AvatarFallback>
            {activity.userName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{activity.userName}</span>
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(activity.timestamp)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {getActivityIcon(activity.type)}
            {activity.type === "SCAN" && (
              <span className="truncate">
                scanned <span className="font-medium text-foreground">{activity.scan.stockpileName}</span>
                {activity.scan.points > 0 && (
                  <span className="ml-1">
                    {activity.scan.totalAdded > 0 && (
                      <span className="text-green-500 inline-flex items-center">
                        <ArrowUp className="h-3 w-3" />
                        {activity.scan.totalAdded}
                      </span>
                    )}
                    {activity.scan.totalRemoved > 0 && (
                      <span className="text-red-500 inline-flex items-center ml-1">
                        <ArrowDown className="h-3 w-3" />
                        {activity.scan.totalRemoved}
                      </span>
                    )}
                  </span>
                )}
              </span>
            )}
            {activity.type === "PRODUCTION" && (
              <span className="truncate">
                produced{" "}
                <span className="font-medium text-foreground">
                  {activity.production.quantity}x {activity.production.itemName}
                </span>
              </span>
            )}
            {activity.type === "OPERATION" && (
              <span className="truncate">
                <span className={getOperationActionLabel(activity.operation.action).color}>
                  {getOperationActionLabel(activity.operation.action).label}
                </span>{" "}
                <span className="font-medium text-foreground">{activity.operation.operationName}</span>
              </span>
            )}
            {activity.type === "STOCKPILE_REFRESH" && (
              <span className="truncate">
                refreshed <span className="font-medium text-foreground">{activity.refresh.stockpileName}</span>
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {activity.type === "SCAN" && activity.scan.points > 0 && (
            <Badge variant="outline" className="font-mono text-xs">
              +{activity.scan.points}
            </Badge>
          )}
          {activity.type === "STOCKPILE_REFRESH" && (
            <Badge variant="outline" className="font-mono text-xs">
              +{activity.refresh.points}
            </Badge>
          )}
          {hasExpandableContent && (
            isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )
          )}
        </div>
      </div>

      {/* Expanded item changes for scans */}
      {isExpanded && activity.type === "SCAN" && activity.scan.itemChanges.length > 0 && (
        <div className="ml-11 mr-2 mb-2 p-3 bg-muted/30 rounded-md">
          <div className="flex flex-wrap gap-1.5">
            {activity.scan.itemChanges.map((item, i) => (
              <div
                key={`${item.itemCode}-${item.crated}-${i}`}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${
                  item.change > 0
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                }`}
              >
                <img
                  src={getItemIconUrl(item.itemCode)}
                  alt=""
                  className="h-4 w-4 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <span className="font-medium">
                  {item.change > 0 ? "+" : ""}
                  {formatQuantity(item.change)}
                </span>
                {item.crated && (
                  <span className="text-[10px] opacity-70">(C)</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ActivityFeed({
  compact = false,
  limit = 10,
  autoRefresh = true,
  refreshTrigger = 0,
}: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const fetchActivities = useCallback(async () => {
    try {
      const response = await fetch(`/api/activity?limit=${limit}`);
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities);
      }
    } catch (error) {
      console.error("Failed to fetch activities:", error);
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchActivities();

    if (autoRefresh) {
      const interval = setInterval(fetchActivities, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [fetchActivities, autoRefresh]);

  // Refresh when triggered by parent (e.g., after a new scan)
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchActivities();
    }
  }, [refreshTrigger, fetchActivities]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No recent activity</p>
            <p className="text-sm">Activity will appear here as your regiment works</p>
          </div>
        ) : (
          <div className="space-y-1">
            {activities.map((activity) => (
              <ActivityItemComponent
                key={activity.id}
                activity={activity}
                isExpanded={expandedId === activity.id}
                onToggle={() => toggleExpanded(activity.id)}
              />
            ))}
            {compact && (
              <Link
                href="/activity"
                className="block text-center text-sm text-primary hover:underline mt-3"
              >
                View all activity
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

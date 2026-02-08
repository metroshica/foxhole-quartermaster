"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Target, Clock, Boxes, Loader2 } from "lucide-react";
import Link from "next/link";

interface DashboardStats {
  stockpileCount: number;
  totalItems: number;
  operationCount: number;
  lastUpdated: string | null;
}

interface DashboardStatsProps {
  refreshTrigger: number;
  initialStats: DashboardStats;
}

export function DashboardStats({ refreshTrigger, initialStats }: DashboardStatsProps) {
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Skip initial render (refreshTrigger starts at 0)
    if (refreshTrigger === 0) return;

    async function fetchStats() {
      setIsRefreshing(true);
      try {
        const response = await fetch("/api/dashboard/stats");
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
      } finally {
        setIsRefreshing(false);
      }
    }

    fetchStats();
  }, [refreshTrigger]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card variant="interactive" className="group">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Stockpiles</CardTitle>
          <div className="h-8 w-8 rounded-md bg-faction-muted flex items-center justify-center transition-colors group-hover:bg-faction/20">
            <Package className="h-4 w-4 text-faction" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold tracking-tight flex items-center gap-2">
            {stats.stockpileCount}
            {isRefreshing && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            across all locations
          </p>
        </CardContent>
      </Card>
      <Card variant="interactive" className="group">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Crates</CardTitle>
          <div className="h-8 w-8 rounded-md bg-faction-muted flex items-center justify-center transition-colors group-hover:bg-faction/20">
            <Boxes className="h-4 w-4 text-faction" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold tracking-tight flex items-center gap-2">
            {stats.totalItems.toLocaleString()}
            {isRefreshing && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            crates in inventory
          </p>
        </CardContent>
      </Card>
      <Card variant="interactive" className="group">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Active Operations</CardTitle>
          <div className="h-8 w-8 rounded-md bg-faction-muted flex items-center justify-center transition-colors group-hover:bg-faction/20">
            <Target className="h-4 w-4 text-faction" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold tracking-tight flex items-center gap-2">
            {stats.operationCount}
            {isRefreshing && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            <Link href="/operations" className="hover:text-faction transition-colors">
              planned or in progress
            </Link>
          </p>
        </CardContent>
      </Card>
      <Card variant="interactive" className="group">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Last Updated</CardTitle>
          <div className="h-8 w-8 rounded-md bg-faction-muted flex items-center justify-center transition-colors group-hover:bg-faction/20">
            <Clock className="h-4 w-4 text-faction" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold tracking-tight flex items-center gap-2">
            {stats.lastUpdated || "Never"}
            {isRefreshing && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.lastUpdated ? "most recent scan" : "no scans yet"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

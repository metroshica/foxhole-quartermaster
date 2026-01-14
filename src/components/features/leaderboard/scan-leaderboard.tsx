"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Scan, Trophy, Medal, Award } from "lucide-react";
import Link from "next/link";

interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  userAvatar: string | null;
  points: number;
  scanCount: number;
}

interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  currentUserRank: LeaderboardEntry | null;
  period: string;
  currentUserId: string;
}

interface ScanLeaderboardProps {
  compact?: boolean;
  limit?: number;
  refreshTrigger?: number;
}

function getRankIcon(rank: number) {
  switch (rank) {
    case 1:
      return <Trophy className="h-4 w-4 text-yellow-500" />;
    case 2:
      return <Medal className="h-4 w-4 text-gray-400" />;
    case 3:
      return <Award className="h-4 w-4 text-amber-600" />;
    default:
      return <span className="text-sm text-muted-foreground w-4 text-center">{rank}</span>;
  }
}

export function ScanLeaderboard({
  compact = false,
  limit = 10,
  refreshTrigger = 0,
}: ScanLeaderboardProps) {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<"weekly" | "war">("weekly");

  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/leaderboard/scans?period=${period}&limit=${limit}`
      );
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error("Failed to fetch scan leaderboard:", error);
    } finally {
      setIsLoading(false);
    }
  }, [period, limit]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Refresh when triggered by parent (e.g., after a new scan)
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchLeaderboard();
    }
  }, [refreshTrigger, fetchLeaderboard]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Scan className="h-5 w-5" />
            Scan Leaderboard
          </CardTitle>
          {!compact && (
            <Tabs value={period} onValueChange={(v) => setPeriod(v as "weekly" | "war")}>
              <TabsList className="h-8">
                <TabsTrigger value="weekly" className="text-xs px-2">
                  Weekly
                </TabsTrigger>
                <TabsTrigger value="war" className="text-xs px-2">
                  War
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !data || data.entries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No scan activity yet</p>
            <p className="text-sm">Start scanning stockpiles to earn points!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.entries.map((entry) => (
              <div
                key={entry.userId}
                className={`flex items-center gap-3 p-2 rounded-md ${
                  entry.userId === data.currentUserId
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-muted/50"
                }`}
              >
                <div className="w-6 flex justify-center">
                  {getRankIcon(entry.rank)}
                </div>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={entry.userAvatar || undefined} />
                  <AvatarFallback>
                    {entry.userName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{entry.userName}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.scanCount} scan{entry.scanCount !== 1 ? "s" : ""}
                  </p>
                </div>
                <Badge variant="secondary" className="font-mono">
                  {entry.points.toLocaleString()} pts
                </Badge>
              </div>
            ))}

            {data.currentUserRank && (
              <>
                <div className="border-t my-2" />
                <div className="flex items-center gap-3 p-2 rounded-md bg-primary/10 border border-primary/20">
                  <div className="w-6 flex justify-center">
                    <span className="text-sm text-muted-foreground">
                      {data.currentUserRank.rank}
                    </span>
                  </div>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={data.currentUserRank.userAvatar || undefined} />
                    <AvatarFallback>
                      {data.currentUserRank.userName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {data.currentUserRank.userName} (You)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {data.currentUserRank.scanCount} scan
                      {data.currentUserRank.scanCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <Badge variant="secondary" className="font-mono">
                    {data.currentUserRank.points.toLocaleString()} pts
                  </Badge>
                </div>
              </>
            )}

            {compact && (
              <Link
                href="/leaderboard"
                className="block text-center text-sm text-primary hover:underline mt-2"
              >
                View full leaderboard
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";

// 50 hours in milliseconds
const REFRESH_EXPIRY_MS = 50 * 60 * 60 * 1000;

interface StockpileRefreshTimerProps {
  lastRefreshedAt: Date | string | null;
  className?: string;
  variant?: "default" | "compact" | "badge";
}

/**
 * Format remaining time as HH:MM:SS or Xh Xm for longer durations
 */
function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return "Expired";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Get color class based on time remaining until expiration
 * Inverted from production timer - green when plenty of time, red when low
 */
function getExpirationColor(hoursRemaining: number): {
  bg: string;
  text: string;
  status: "safe" | "warning" | "urgent" | "critical" | "expired";
} {
  if (hoursRemaining <= 0) {
    return {
      bg: "bg-red-500/20",
      text: "text-red-600 dark:text-red-400",
      status: "expired",
    };
  }
  if (hoursRemaining < 6) {
    return {
      bg: "bg-red-500/10",
      text: "text-red-600 dark:text-red-400",
      status: "critical",
    };
  }
  if (hoursRemaining < 20) {
    return {
      bg: "bg-orange-500/10",
      text: "text-orange-600 dark:text-orange-400",
      status: "urgent",
    };
  }
  if (hoursRemaining < 40) {
    return {
      bg: "bg-yellow-500/10",
      text: "text-yellow-600 dark:text-yellow-400",
      status: "warning",
    };
  }
  return {
    bg: "bg-green-500/10",
    text: "text-green-600 dark:text-green-400",
    status: "safe",
  };
}

export function StockpileRefreshTimer({
  lastRefreshedAt,
  className,
  variant = "default",
}: StockpileRefreshTimerProps) {
  const [remaining, setRemaining] = useState<number | null>(null);

  // Calculate expiration time
  const expiresAt = useMemo(() => {
    if (!lastRefreshedAt) return null;
    const refreshed =
      typeof lastRefreshedAt === "string"
        ? new Date(lastRefreshedAt)
        : lastRefreshedAt;
    return new Date(refreshed.getTime() + REFRESH_EXPIRY_MS);
  }, [lastRefreshedAt]);

  useEffect(() => {
    if (!expiresAt) {
      setRemaining(null);
      return;
    }

    const updateRemaining = () => {
      const diff = expiresAt.getTime() - Date.now();
      setRemaining(Math.max(0, Math.ceil(diff / 1000)));
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  // Not refreshed yet
  if (!lastRefreshedAt || remaining === null) {
    if (variant === "badge") {
      return (
        <span
          className={cn(
            "text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground",
            className
          )}
        >
          Never
        </span>
      );
    }

    return (
      <span className={cn("text-sm text-muted-foreground", className)}>
        Never refreshed
      </span>
    );
  }

  const hoursRemaining = remaining / 3600;
  const colors = getExpirationColor(hoursRemaining);
  const timeText = formatTimeRemaining(remaining);

  // Badge variant - very compact for list views
  if (variant === "badge") {
    return (
      <span
        className={cn(
          "text-xs px-1.5 py-0.5 rounded font-medium",
          colors.bg,
          colors.text,
          className
        )}
      >
        {timeText}
      </span>
    );
  }

  // Compact variant - small inline display
  if (variant === "compact") {
    return (
      <span className={cn("text-sm font-medium", colors.text, className)}>
        {timeText}
      </span>
    );
  }

  // Default variant - includes label
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-xs text-muted-foreground">Expires:</span>
      <span className={cn("text-sm font-medium", colors.text)}>{timeText}</span>
    </div>
  );
}

/**
 * Calculate remaining time until refresh expires
 * Returns null if not refreshed, 0 if expired, or remaining seconds
 */
export function getRefreshRemainingSeconds(
  lastRefreshedAt: Date | string | null
): number | null {
  if (!lastRefreshedAt) return null;
  const refreshed =
    typeof lastRefreshedAt === "string"
      ? new Date(lastRefreshedAt)
      : lastRefreshedAt;
  const expiresAt = refreshed.getTime() + REFRESH_EXPIRY_MS;
  const diff = expiresAt - Date.now();
  return Math.max(0, Math.ceil(diff / 1000));
}

/**
 * Get refresh status for sorting/filtering
 */
export function getRefreshStatus(
  lastRefreshedAt: Date | string | null
): "expired" | "critical" | "urgent" | "warning" | "safe" | "never" {
  if (!lastRefreshedAt) return "never";
  const remaining = getRefreshRemainingSeconds(lastRefreshedAt);
  if (remaining === null) return "never";
  const hoursRemaining = remaining / 3600;
  return getExpirationColor(hoursRemaining).status;
}

"use client";

import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { formatDuration } from "./duration-input";

interface CountdownTimerProps {
  targetTime: Date | string;
  startTime?: Date | string | null;
  onExpire?: () => void;
  className?: string;
  expiredText?: string;
  showProgress?: boolean;
  variant?: "default" | "compact";
}

/**
 * Get color class based on progress percentage (positive framing)
 * Progress goes from 0% (just started) to 100% (complete)
 */
function getProgressColor(percentComplete: number): {
  bg: string;
  stroke: string;
  text: string;
} {
  if (percentComplete >= 100) {
    return {
      bg: "bg-green-500",
      stroke: "stroke-green-500",
      text: "text-green-500",
    };
  }
  if (percentComplete >= 75) {
    return {
      bg: "bg-emerald-500",
      stroke: "stroke-emerald-500",
      text: "text-emerald-500",
    };
  }
  if (percentComplete >= 50) {
    return {
      bg: "bg-orange-500",
      stroke: "stroke-orange-500",
      text: "text-orange-500",
    };
  }
  if (percentComplete >= 25) {
    return {
      bg: "bg-yellow-500",
      stroke: "stroke-yellow-500",
      text: "text-yellow-500",
    };
  }
  return {
    bg: "bg-blue-500",
    stroke: "stroke-blue-500",
    text: "text-blue-500",
  };
}

/**
 * Circular progress ring for compact variant
 */
function CircularProgress({
  progress,
  colorClass,
  children,
  isNearlyComplete,
}: {
  progress: number;
  colorClass: string;
  children: React.ReactNode;
  isNearlyComplete: boolean;
}) {
  // SVG circle math: circumference = 2 * PI * radius
  // For a circle with r=16 in a 36x36 viewBox, circumference ≈ 100.53
  // We'll use strokeDasharray of 100 for easier percentage calculation
  const circumference = 2 * Math.PI * 16;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        viewBox="0 0 36 36"
        className={cn(
          "w-14 h-14 -rotate-90",
          isNearlyComplete && "animate-pulse"
        )}
      >
        {/* Background ring */}
        <circle
          cx="18"
          cy="18"
          r="16"
          fill="none"
          className="stroke-muted/30"
          strokeWidth="3"
        />
        {/* Progress ring */}
        <circle
          cx="18"
          cy="18"
          r="16"
          fill="none"
          className={cn(colorClass, "transition-all duration-1000 ease-linear")}
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

/**
 * Linear progress bar for default variant
 */
function LinearProgress({
  progress,
  colorClass,
  isNearlyComplete,
}: {
  progress: number;
  colorClass: string;
  isNearlyComplete: boolean;
}) {
  return (
    <div className="w-full">
      <div
        className={cn(
          "relative h-2 w-full overflow-hidden rounded-full bg-muted/30",
          isNearlyComplete && "shadow-[0_0_8px_rgba(16,185,129,0.5)]"
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-1000 ease-linear",
            colorClass,
            isNearlyComplete && "animate-pulse"
          )}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );
}

export function CountdownTimer({
  targetTime,
  startTime,
  onExpire,
  className,
  expiredText = "Ready for pickup!",
  showProgress = true,
  variant = "default",
}: CountdownTimerProps) {
  const [remaining, setRemaining] = useState<number>(0);
  const [isExpired, setIsExpired] = useState(false);

  // Parse dates once
  const { target, totalDuration } = useMemo(() => {
    const t = typeof targetTime === "string" ? new Date(targetTime) : targetTime;
    const s = startTime
      ? typeof startTime === "string"
        ? new Date(startTime)
        : startTime
      : null;
    const total = s ? t.getTime() - s.getTime() : null;
    return { target: t, totalDuration: total };
  }, [targetTime, startTime]);

  useEffect(() => {
    const updateRemaining = () => {
      const diff = target.getTime() - Date.now();
      if (diff <= 0) {
        setRemaining(0);
        if (!isExpired) {
          setIsExpired(true);
          onExpire?.();
        }
      } else {
        setRemaining(Math.ceil(diff / 1000));
      }
    };

    // Initial update
    updateRemaining();

    // Update every second
    const interval = setInterval(updateRemaining, 1000);

    return () => clearInterval(interval);
  }, [target, onExpire, isExpired]);

  // Calculate progress percentage (0-100, where 100 = complete)
  const progress = useMemo(() => {
    if (!totalDuration || totalDuration <= 0) return null;
    const elapsed = totalDuration - remaining * 1000;
    return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
  }, [totalDuration, remaining]);

  const colors = progress !== null ? getProgressColor(progress) : null;
  const isNearlyComplete = progress !== null && progress >= 90;

  // Expired state
  if (isExpired) {
    if (variant === "compact") {
      return (
        <div className="flex flex-col items-center gap-1">
          <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <span className="text-xs font-medium text-green-600">Ready!</span>
        </div>
      );
    }

    return (
      <div className={cn("space-y-2", className)}>
        {showProgress && (
          <LinearProgress
            progress={100}
            colorClass="bg-green-500"
            isNearlyComplete={false}
          />
        )}
        <div className="flex items-center justify-between">
          <span className="text-green-600 font-semibold text-2xl">
            {expiredText}
          </span>
        </div>
      </div>
    );
  }

  // Compact variant - circular ring
  if (variant === "compact") {
    const canShowProgress = showProgress && progress !== null && colors;

    if (canShowProgress) {
      return (
        <CircularProgress
          progress={progress}
          colorClass={colors.stroke}
          isNearlyComplete={isNearlyComplete}
        >
          <div className="flex flex-col items-center">
            <span className={cn("text-[10px] font-mono font-bold tabular-nums leading-none", colors.text)}>
              {formatDuration(remaining)}
            </span>
          </div>
        </CircularProgress>
      );
    }

    // No progress data - just show timer text
    return (
      <span className={cn("font-mono tabular-nums text-sm", className)}>
        {formatDuration(remaining)}
      </span>
    );
  }

  // Default variant - linear bar
  const canShowProgress = showProgress && progress !== null && colors;

  return (
    <div className={cn("space-y-3", className)}>
      {canShowProgress && (
        <LinearProgress
          progress={progress}
          colorClass={colors.bg}
          isNearlyComplete={isNearlyComplete}
        />
      )}
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "font-mono tabular-nums text-2xl font-bold",
            canShowProgress && colors.text
          )}
        >
          {formatDuration(remaining)}
        </span>
        {canShowProgress && (
          <span className="text-sm text-muted-foreground">
            {Math.round(progress)}% complete
          </span>
        )}
      </div>
    </div>
  );
}

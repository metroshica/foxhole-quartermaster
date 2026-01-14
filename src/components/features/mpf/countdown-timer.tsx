"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { formatDuration } from "./duration-input";

interface CountdownTimerProps {
  targetTime: Date | string;
  onExpire?: () => void;
  className?: string;
  expiredText?: string;
}

export function CountdownTimer({
  targetTime,
  onExpire,
  className,
  expiredText = "Ready for pickup!",
}: CountdownTimerProps) {
  const [remaining, setRemaining] = useState<number>(0);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const target = typeof targetTime === "string" ? new Date(targetTime) : targetTime;

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
  }, [targetTime, onExpire, isExpired]);

  if (isExpired) {
    return (
      <span className={cn("text-green-600 font-semibold", className)}>
        {expiredText}
      </span>
    );
  }

  return (
    <span className={cn("font-mono tabular-nums", className)}>
      {formatDuration(remaining)}
    </span>
  );
}

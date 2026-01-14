"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface DurationInputProps {
  value: number | null; // Total seconds
  onChange: (seconds: number | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Parses a duration string in HH:MM:SS, H:MM:SS, MM:SS, or M:SS format to seconds
 */
function parseDuration(str: string): number | null {
  const trimmed = str.trim();
  if (!trimmed) return null;

  // Match patterns like 1:23:45 (h:mm:ss), 23:45 (mm:ss), etc.
  const parts = trimmed.split(":").map((p) => parseInt(p, 10));

  if (parts.some(isNaN)) return null;

  if (parts.length === 3) {
    // HH:MM:SS
    const [hours, minutes, seconds] = parts;
    if (minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) return null;
    return hours * 3600 + minutes * 60 + seconds;
  } else if (parts.length === 2) {
    // MM:SS
    const [minutes, seconds] = parts;
    if (seconds < 0 || seconds > 59) return null;
    return minutes * 60 + seconds;
  } else if (parts.length === 1) {
    // Just seconds
    return parts[0];
  }

  return null;
}

/**
 * Formats seconds to HH:MM:SS display string
 */
export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function DurationInput({
  value,
  onChange,
  placeholder = "0:00:00",
  disabled = false,
  className,
}: DurationInputProps) {
  // Track the display value separately from the actual value
  const [displayValue, setDisplayValue] = useState<string>("");

  // Sync display value when controlled value changes externally
  useEffect(() => {
    if (value !== null && value >= 0) {
      setDisplayValue(formatDuration(value));
    } else {
      setDisplayValue("");
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDisplayValue = e.target.value;
    setDisplayValue(newDisplayValue);

    const seconds = parseDuration(newDisplayValue);
    onChange(seconds);
  };

  const handleBlur = () => {
    // On blur, format the value nicely if valid
    if (value !== null && value >= 0) {
      setDisplayValue(formatDuration(value));
    }
  };

  return (
    <Input
      type="text"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      disabled={disabled}
      className={cn("font-mono", className)}
    />
  );
}

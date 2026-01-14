"use client";

interface LocalTimeProps {
  date: string | Date;
  format?: "datetime" | "date" | "time";
  className?: string;
}

/**
 * Formats a date/time in the user's local timezone.
 * Must be a client component to access the browser's timezone.
 */
export function LocalTime({ date, format = "datetime", className }: LocalTimeProps) {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  const options: Intl.DateTimeFormatOptions = {
    ...(format === "datetime" || format === "date"
      ? { dateStyle: "medium" as const }
      : {}),
    ...(format === "datetime" || format === "time"
      ? { timeStyle: "short" as const }
      : {}),
  };

  const formatted = new Intl.DateTimeFormat(undefined, options).format(dateObj);

  return <span className={className}>{formatted}</span>;
}

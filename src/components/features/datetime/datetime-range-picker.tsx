"use client";

import { useState, useMemo, useEffect } from "react";
import { CalendarIcon, Clock, Globe, X, ArrowRight } from "lucide-react";
import { format, addHours } from "date-fns";
import { formatInTimeZone, toZonedTime, fromZonedTime } from "date-fns-tz";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";

// Common timezones for gaming communities (ordered by popularity/region)
const TIMEZONES = [
  // North America
  { value: "America/New_York", label: "Eastern (ET)", offset: "EST/EDT" },
  { value: "America/Chicago", label: "Central (CT)", offset: "CST/CDT" },
  { value: "America/Denver", label: "Mountain (MT)", offset: "MST/MDT" },
  { value: "America/Los_Angeles", label: "Pacific (PT)", offset: "PST/PDT" },
  // Europe
  { value: "Europe/London", label: "UK (GMT/BST)", offset: "GMT/BST" },
  { value: "Europe/Paris", label: "Central EU (CET)", offset: "CET/CEST" },
  { value: "Europe/Berlin", label: "Germany (CET)", offset: "CET/CEST" },
  { value: "Europe/Helsinki", label: "Eastern EU (EET)", offset: "EET/EEST" },
  // Asia/Pacific
  { value: "Asia/Dubai", label: "Gulf (GST)", offset: "GST" },
  { value: "Asia/Kolkata", label: "India (IST)", offset: "IST" },
  { value: "Asia/Singapore", label: "Singapore (SGT)", offset: "SGT" },
  { value: "Asia/Tokyo", label: "Japan (JST)", offset: "JST" },
  { value: "Australia/Sydney", label: "Australia (AEST)", offset: "AEST/AEDT" },
  { value: "Pacific/Auckland", label: "New Zealand (NZST)", offset: "NZST/NZDT" },
  // South America
  { value: "America/Sao_Paulo", label: "Brazil (BRT)", offset: "BRT" },
];

// Duration presets in hours
const DURATION_PRESETS = [
  { label: "1h", hours: 1 },
  { label: "2h", hours: 2 },
  { label: "3h", hours: 3 },
  { label: "4h", hours: 4 },
  { label: "6h", hours: 6 },
  { label: "8h", hours: 8 },
];

interface DateTimeRangePickerProps {
  startValue?: Date;
  endValue?: Date;
  onStartChange: (date: Date | undefined) => void;
  onEndChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function DateTimeRangePicker({
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  placeholder = "Select date & time range...",
  disabled = false,
}: DateTimeRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(startValue);
  const [startTime, setStartTime] = useState("20:00");
  const [endTime, setEndTime] = useState("22:00");
  const [timezone, setTimezone] = useState(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const found = TIMEZONES.find((t) => t.value === tz);
      return found?.value || "America/New_York";
    } catch {
      return "America/New_York";
    }
  });
  const [showTimezones, setShowTimezones] = useState(false);

  // Sync internal state with prop values
  useEffect(() => {
    if (startValue) {
      setSelectedDate(startValue);
      const zonedDate = toZonedTime(startValue, timezone);
      const hours = zonedDate.getHours().toString().padStart(2, "0");
      const mins = zonedDate.getMinutes().toString().padStart(2, "0");
      setStartTime(`${hours}:${mins}`);
    }
    if (endValue) {
      const zonedDate = toZonedTime(endValue, timezone);
      const hours = zonedDate.getHours().toString().padStart(2, "0");
      const mins = zonedDate.getMinutes().toString().padStart(2, "0");
      setEndTime(`${hours}:${mins}`);
    }
  }, [startValue, endValue, timezone]);

  // Get current timezone label
  const currentTz = useMemo(() => {
    return TIMEZONES.find((t) => t.value === timezone) || TIMEZONES[0];
  }, [timezone]);

  // Format display value
  const displayValue = useMemo(() => {
    if (!startValue) return "";
    const startFormatted = formatInTimeZone(startValue, timezone, "MMM d, h:mm a");
    if (!endValue) return startFormatted;
    const endFormatted = formatInTimeZone(endValue, timezone, "h:mm a zzz");
    return `${startFormatted} - ${endFormatted}`;
  }, [startValue, endValue, timezone]);

  // Handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      updateDateTimes(date, startTime, endTime);
    }
  };

  // Handle start time change
  const handleStartTimeChange = (time: string) => {
    setStartTime(time);
    if (selectedDate) {
      updateDateTimes(selectedDate, time, endTime);
    }
  };

  // Handle end time change
  const handleEndTimeChange = (time: string) => {
    setEndTime(time);
    if (selectedDate) {
      updateDateTimes(selectedDate, startTime, time);
    }
  };

  // Apply duration preset
  const applyDuration = (hours: number) => {
    const [startHours, startMinutes] = startTime.split(":").map(Number);
    let endHours = startHours + hours;
    const endMinutes = startMinutes;

    // Handle overflow past midnight
    if (endHours >= 24) {
      endHours = endHours - 24;
    }

    const newEndTime = `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`;
    setEndTime(newEndTime);
    if (selectedDate) {
      updateDateTimes(selectedDate, startTime, newEndTime);
    }
  };

  // Update both start and end times
  const updateDateTimes = (date: Date, start: string, end: string) => {
    const [startHours, startMinutes] = start.split(":").map(Number);
    const [endHours, endMinutes] = end.split(":").map(Number);

    // Create start date in selected timezone
    const startZoned = new Date(date);
    startZoned.setHours(startHours, startMinutes, 0, 0);
    const utcStart = fromZonedTime(startZoned, timezone);
    onStartChange(utcStart);

    // Create end date in selected timezone (same day, or next day if end < start)
    const endZoned = new Date(date);
    endZoned.setHours(endHours, endMinutes, 0, 0);

    // If end time is before start time, assume it's the next day
    if (endHours < startHours || (endHours === startHours && endMinutes < startMinutes)) {
      endZoned.setDate(endZoned.getDate() + 1);
    }

    const utcEnd = fromZonedTime(endZoned, timezone);
    onEndChange(utcEnd);
  };

  // Handle timezone change
  const handleTimezoneChange = (tz: string) => {
    setTimezone(tz);
    setShowTimezones(false);

    if (selectedDate && startTime && endTime) {
      const [startHours, startMinutes] = startTime.split(":").map(Number);
      const [endHours, endMinutes] = endTime.split(":").map(Number);

      const startZoned = new Date(selectedDate);
      startZoned.setHours(startHours, startMinutes, 0, 0);
      const utcStart = fromZonedTime(startZoned, tz);
      onStartChange(utcStart);

      const endZoned = new Date(selectedDate);
      endZoned.setHours(endHours, endMinutes, 0, 0);
      if (endHours < startHours || (endHours === startHours && endMinutes < startMinutes)) {
        endZoned.setDate(endZoned.getDate() + 1);
      }
      const utcEnd = fromZonedTime(endZoned, tz);
      onEndChange(utcEnd);
    }
  };

  // Clear selection
  const handleClear = () => {
    setSelectedDate(undefined);
    setStartTime("20:00");
    setEndTime("22:00");
    onStartChange(undefined);
    onEndChange(undefined);
    setIsOpen(false);
  };

  // Quick start time buttons
  const quickStartTimes = ["18:00", "19:00", "20:00", "21:00", "22:00"];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !startValue && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {startValue ? displayValue : placeholder}
          {startValue && (
            <X
              className="ml-auto h-4 w-4 opacity-50 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          {/* Calendar */}
          <div className="border-r">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              initialFocus
            />
          </div>

          {/* Time Range & Timezone Panel */}
          <div className="p-3 w-56 space-y-4">
            {/* Start Time */}
            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Start Time
              </Label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-center accent-primary"
                style={{ colorScheme: "dark" }}
              />

              {/* Quick Start Times */}
              <div className="flex flex-wrap gap-1">
                {quickStartTimes.map((time) => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => handleStartTimeChange(time)}
                    className={cn(
                      "text-xs py-1 px-2 rounded border transition-colors",
                      startTime === time
                        ? "bg-primary text-primary-foreground border-primary"
                        : "hover:bg-accent border-transparent"
                    )}
                  >
                    {format(new Date(`2000-01-01T${time}`), "h a")}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration Presets */}
            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-1">
                <ArrowRight className="h-3 w-3" />
                Duration
              </Label>
              <div className="flex flex-wrap gap-1">
                {DURATION_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => applyDuration(preset.hours)}
                    className="text-xs py-1 px-2 rounded border border-transparent hover:bg-accent transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* End Time */}
            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-1">
                <Clock className="h-3 w-3" />
                End Time
              </Label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => handleEndTimeChange(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-center accent-primary"
                style={{ colorScheme: "dark" }}
              />
            </div>

            {/* Timezone Selector */}
            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-1">
                <Globe className="h-3 w-3" />
                Timezone
              </Label>

              {!showTimezones ? (
                <button
                  type="button"
                  onClick={() => setShowTimezones(true)}
                  className="w-full text-left text-sm p-2 rounded border hover:bg-accent transition-colors"
                >
                  <div className="font-medium">{currentTz.label}</div>
                  <div className="text-xs text-muted-foreground">{currentTz.offset}</div>
                </button>
              ) : (
                <div className="max-h-32 overflow-y-auto border rounded">
                  {TIMEZONES.map((tz) => (
                    <button
                      key={tz.value}
                      type="button"
                      onClick={() => handleTimezoneChange(tz.value)}
                      className={cn(
                        "w-full text-left text-xs p-2 hover:bg-accent transition-colors",
                        timezone === tz.value && "bg-primary/10"
                      )}
                    >
                      <div className="font-medium">{tz.label}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Done Button */}
            <Button
              type="button"
              size="sm"
              className="w-full"
              onClick={() => setIsOpen(false)}
              disabled={!selectedDate}
            >
              Done
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

"use client";

import { useState, useMemo, useEffect } from "react";
import { CalendarIcon, Clock, Globe, X } from "lucide-react";
import { format } from "date-fns";
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

interface DateTimePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Select date & time...",
  disabled = false,
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(value);
  const [timeValue, setTimeValue] = useState("12:00");
  const [timezone, setTimezone] = useState(() => {
    // Try to detect user's timezone
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const found = TIMEZONES.find((t) => t.value === tz);
      return found?.value || "America/New_York";
    } catch {
      return "America/New_York";
    }
  });
  const [showTimezones, setShowTimezones] = useState(false);

  // Sync internal state with prop value
  useEffect(() => {
    if (value) {
      setSelectedDate(value);
      // Extract time from value in the selected timezone
      const zonedDate = toZonedTime(value, timezone);
      const hours = zonedDate.getHours().toString().padStart(2, "0");
      const mins = zonedDate.getMinutes().toString().padStart(2, "0");
      setTimeValue(`${hours}:${mins}`);
    }
  }, [value, timezone]);

  // Get current timezone label
  const currentTz = useMemo(() => {
    return TIMEZONES.find((t) => t.value === timezone) || TIMEZONES[0]; // Default to ET
  }, [timezone]);

  // Format display value
  const displayValue = useMemo(() => {
    if (!value) return "";
    return formatInTimeZone(value, timezone, "MMM d, yyyy 'at' h:mm a zzz");
  }, [value, timezone]);

  // Handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      updateDateTime(date, timeValue);
    }
  };

  // Handle time change
  const handleTimeChange = (time: string) => {
    setTimeValue(time);
    if (selectedDate) {
      updateDateTime(selectedDate, time);
    }
  };

  // Combine date and time and convert to UTC
  const updateDateTime = (date: Date, time: string) => {
    const [hours, minutes] = time.split(":").map(Number);

    // Create a date in the selected timezone
    const zonedDate = new Date(date);
    zonedDate.setHours(hours, minutes, 0, 0);

    // Convert from the selected timezone to UTC
    const utcDate = fromZonedTime(zonedDate, timezone);
    onChange(utcDate);
  };

  // Handle timezone change
  const handleTimezoneChange = (tz: string) => {
    setTimezone(tz);
    setShowTimezones(false);

    // Recalculate the UTC time with new timezone if we have a date
    if (selectedDate && timeValue) {
      const [hours, minutes] = timeValue.split(":").map(Number);
      const zonedDate = new Date(selectedDate);
      zonedDate.setHours(hours, minutes, 0, 0);
      const utcDate = fromZonedTime(zonedDate, tz);
      onChange(utcDate);
    }
  };

  // Clear selection
  const handleClear = () => {
    setSelectedDate(undefined);
    setTimeValue("12:00");
    onChange(undefined);
    setIsOpen(false);
  };

  // Quick time buttons
  const quickTimes = ["09:00", "12:00", "15:00", "18:00", "20:00", "22:00"];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? displayValue : placeholder}
          {value && (
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

          {/* Time & Timezone Panel */}
          <div className="p-3 w-48 space-y-4">
            {/* Time Input */}
            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Time
              </Label>
              <input
                type="time"
                value={timeValue}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-center accent-primary"
                style={{ colorScheme: "dark" }}
              />

              {/* Quick Time Buttons */}
              <div className="grid grid-cols-3 gap-1">
                {quickTimes.map((time) => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => handleTimeChange(time)}
                    className={cn(
                      "text-xs py-1 px-2 rounded border transition-colors",
                      timeValue === time
                        ? "bg-primary text-primary-foreground border-primary"
                        : "hover:bg-accent border-transparent"
                    )}
                  >
                    {format(new Date(`2000-01-01T${time}`), "h:mm a")}
                  </button>
                ))}
              </div>
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
                <div className="max-h-40 overflow-y-auto border rounded">
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

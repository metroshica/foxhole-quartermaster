"use client";

import { useCallback, useState, useEffect } from "react";
import { Upload, Camera, Image as ImageIcon, Clipboard } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Upload Zone Component
 *
 * Drag-and-drop upload area with:
 * - Desktop: Drag & drop support + click to browse + Ctrl+V paste
 * - Mobile: Native camera button + file picker
 *
 * Design considerations:
 * - Large touch targets for mobile (min 44x44px)
 * - Visual feedback during drag
 * - Preview of selected image
 * - Clipboard paste support for Windows Snipping Tool users
 */

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
}

export function UploadZone({ onFileSelect, disabled, className, compact = false }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file (PNG, JPG, etc.)");
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (disabled) return;

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [disabled, handleFile]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const clearPreview = useCallback(() => {
    setPreview(null);
  }, []);

  // Handle clipboard paste (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (disabled) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            handleFile(file);
          }
          return;
        }
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [disabled, handleFile]);

  // Show preview if we have one
  if (preview) {
    return (
      <div className={cn("relative", className)}>
        <div className="relative rounded-lg overflow-hidden border">
          <img
            src={preview}
            alt="Selected screenshot"
            className="w-full h-auto max-h-96 object-contain bg-muted"
          />
          <button
            onClick={clearPreview}
            className="absolute top-2 right-2 p-2 bg-background/80 rounded-full hover:bg-background"
            title="Remove image"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative rounded-lg border-2 border-dashed transition-colors",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-muted-foreground/50",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <div className={cn(
        "flex flex-col items-center justify-center px-4",
        compact ? "py-6" : "py-10"
      )}>
        {/* Icon */}
        <div className={cn(
          "rounded-full bg-muted",
          compact ? "p-2 mb-2" : "p-4 mb-4"
        )}>
          <Clipboard className={cn(
            "text-muted-foreground",
            compact ? "h-5 w-5" : "h-8 w-8"
          )} />
        </div>

        {/* Desktop: Paste-first text */}
        <div className={cn(
          "hidden md:block text-center",
          compact ? "mb-2" : "mb-4"
        )}>
          <p className={compact ? "text-sm font-medium" : "text-lg font-medium"}>
            Press <kbd className={cn(
              "bg-muted rounded border font-mono",
              compact ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-base"
            )}>Ctrl+V</kbd> to paste
          </p>
          {!compact && (
            <p className="text-sm text-muted-foreground mt-1">
              or drag & drop a file
            </p>
          )}
        </div>

        {/* Mobile: Simple instructions */}
        <div className={cn(
          "md:hidden text-center",
          compact ? "mb-2" : "mb-4"
        )}>
          <p className={compact ? "text-sm font-medium" : "text-lg font-medium"}>
            Add Screenshot
          </p>
          {!compact && (
            <p className="text-sm text-muted-foreground">
              Long-press to paste or choose a file
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className={cn(
          "flex gap-2",
          compact ? "flex-row" : "flex-col sm:flex-row gap-3"
        )}>
          {/* Camera button (mobile only) */}
          <label className="md:hidden">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileInput}
              disabled={disabled}
              className="sr-only"
            />
            <span
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium",
                "bg-primary text-primary-foreground hover:bg-primary/90",
                "cursor-pointer",
                compact ? "px-3 py-2 min-h-[36px]" : "px-4 py-3 min-h-[44px] min-w-[120px]",
                disabled && "pointer-events-none"
              )}
            >
              <Camera className={compact ? "h-4 w-4" : "h-5 w-5"} />
              {!compact && "Take Photo"}
            </span>
          </label>

          {/* File picker button */}
          <label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={handleFileInput}
              disabled={disabled}
              className="sr-only"
            />
            <span
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium",
                "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                "cursor-pointer",
                compact ? "px-3 py-2 min-h-[36px]" : "px-4 py-3 min-h-[44px] min-w-[120px]",
                disabled && "pointer-events-none"
              )}
            >
              <ImageIcon className={compact ? "h-4 w-4" : "h-5 w-5"} />
              {compact ? "Browse" : "Choose File"}
            </span>
          </label>
        </div>

        {/* Supported formats - hide in compact mode */}
        {!compact && (
          <p className="mt-4 text-xs text-muted-foreground">
            Supports PNG, JPG, JPEG, WebP
          </p>
        )}
      </div>
    </div>
  );
}

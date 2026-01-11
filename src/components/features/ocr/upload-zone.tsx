"use client";

import { useCallback, useState } from "react";
import { Upload, Camera, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Upload Zone Component
 *
 * Drag-and-drop upload area with:
 * - Desktop: Drag & drop support + click to browse
 * - Mobile: Native camera button + file picker
 *
 * Design considerations:
 * - Large touch targets for mobile (min 44x44px)
 * - Visual feedback during drag
 * - Preview of selected image
 */

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  className?: string;
}

export function UploadZone({ onFileSelect, disabled, className }: UploadZoneProps) {
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
      <div className="flex flex-col items-center justify-center py-10 px-4">
        {/* Icon */}
        <div className="mb-4 rounded-full bg-muted p-4">
          <Upload className="h-8 w-8 text-muted-foreground" />
        </div>

        {/* Desktop: Drag & drop text */}
        <div className="hidden md:block text-center mb-4">
          <p className="text-lg font-medium">Drop your screenshot here</p>
          <p className="text-sm text-muted-foreground">or click to browse</p>
        </div>

        {/* Mobile: Simple instructions */}
        <div className="md:hidden text-center mb-4">
          <p className="text-lg font-medium">Upload Screenshot</p>
          <p className="text-sm text-muted-foreground">
            Take a photo or choose from gallery
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
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
                "inline-flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-medium",
                "bg-primary text-primary-foreground hover:bg-primary/90",
                "cursor-pointer min-h-[44px] min-w-[120px]",
                disabled && "pointer-events-none"
              )}
            >
              <Camera className="h-5 w-5" />
              Take Photo
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
                "inline-flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-medium",
                "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                "cursor-pointer min-h-[44px] min-w-[120px]",
                disabled && "pointer-events-none"
              )}
            >
              <ImageIcon className="h-5 w-5" />
              Choose File
            </span>
          </label>
        </div>

        {/* Supported formats */}
        <p className="mt-4 text-xs text-muted-foreground">
          Supports PNG, JPG, JPEG, WebP
        </p>
      </div>
    </div>
  );
}

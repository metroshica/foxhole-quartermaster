import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function for merging Tailwind CSS classes
 *
 * Combines clsx (for conditional classes) with tailwind-merge (for deduplication).
 * This is the standard pattern used by shadcn/ui components.
 *
 * Example:
 *   cn("px-4 py-2", isActive && "bg-primary", className)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date as relative time (e.g., "5m ago", "2h ago")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

/**
 * Format a quantity with commas for readability
 */
export function formatQuantity(quantity: number): string {
  return quantity.toLocaleString();
}

/**
 * Format a date for display
 */
export function formatDate(date: Date): string {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Format a duration in milliseconds to human readable string
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return `${seconds}s`;
}

/**
 * Get priority label from priority number
 */
export function getPriorityLabel(priority: number): string {
  switch (priority) {
    case 0: return "Low";
    case 1: return "Medium";
    case 2: return "High";
    case 3: return "Critical";
    default: return "Unknown";
  }
}

/**
 * Format stockpile type for display
 */
export function formatStockpileType(type: string): string {
  switch (type) {
    case "SEAPORT": return "Seaport";
    case "STORAGE_DEPOT": return "Storage Depot";
    case "DEPOT": return "Depot";
    case "BASE": return "Base";
    default: return type;
  }
}

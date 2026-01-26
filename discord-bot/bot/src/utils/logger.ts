/**
 * Debug Logger for Discord Bot
 *
 * Provides colorized, structured logging with timing utilities
 * for debugging the AI agent flow.
 */

import { config } from "../config.js";

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",

  // Log level colors
  trace: "\x1b[90m", // Gray
  debug: "\x1b[36m", // Cyan
  info: "\x1b[32m", // Green
  warn: "\x1b[33m", // Yellow
  error: "\x1b[31m", // Red

  // Category colors
  discord: "\x1b[36m", // Cyan
  gemini: "\x1b[35m", // Magenta
  mcp: "\x1b[33m", // Yellow
  agent: "\x1b[34m", // Blue
  timing: "\x1b[32m", // Green
  startup: "\x1b[37m", // White
} as const;

type LogLevel = "trace" | "debug" | "info" | "warn" | "error";
type Category = "discord" | "gemini" | "mcp" | "agent" | "timing" | "startup";

const LOG_LEVELS: Record<LogLevel, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
};

// Timer storage
const timers = new Map<string, number>();

// Request ID for correlating logs
let currentRequestId: string | null = null;

function getLogLevel(): LogLevel {
  return config.LOG_LEVEL;
}

function shouldLog(level: LogLevel): boolean {
  const configLevel = getLogLevel();
  return LOG_LEVELS[level] >= LOG_LEVELS[configLevel];
}

function isDebugEnabled(): boolean {
  return config.DEBUG;
}

function shouldLogCategory(category: Category): boolean {
  if (!isDebugEnabled()) return false;

  const categories = config.DEBUG_CATEGORIES;
  if (!categories || categories === "all") return true;

  const allowedCategories = categories.split(",").map((c) => c.trim().toLowerCase());
  return allowedCategories.includes(category) || allowedCategories.includes("all");
}

function formatTimestamp(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  const ms = String(now.getMilliseconds()).padStart(3, "0");
  return `${hours}:${minutes}:${seconds}.${ms}`;
}

function formatLevel(level: LogLevel): string {
  const color = colors[level];
  const label = level.toUpperCase().padEnd(5);
  return `${color}${label}${colors.reset}`;
}

function formatCategory(category: Category): string {
  const color = colors[category];
  return `${color}[${category}]${colors.reset}`;
}

function formatRequestId(requestId: string | null): string {
  if (!requestId) return "";
  return `${colors.dim}[${requestId}]${colors.reset} `;
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}

function formatData(data: unknown): string {
  if (data === undefined || data === null) return "";

  const maxLength = config.DEBUG_TRUNCATE;

  if (typeof data === "string") {
    return truncate(data, maxLength);
  }

  try {
    const json = JSON.stringify(data, null, 2);
    return truncate(json, maxLength);
  } catch {
    return truncate(String(data), maxLength);
  }
}

function log(level: LogLevel, category: Category, message: string, data?: unknown): void {
  if (!shouldLog(level)) return;

  // For debug/trace levels, also check debug mode and category filter
  if ((level === "debug" || level === "trace") && !shouldLogCategory(category)) {
    return;
  }

  const timestamp = `${colors.dim}[${formatTimestamp()}]${colors.reset}`;
  const requestIdStr = formatRequestId(currentRequestId);
  const levelStr = formatLevel(level);
  const categoryStr = formatCategory(category);

  let output = `${timestamp} ${requestIdStr}${levelStr} ${categoryStr} ${message}`;

  if (data !== undefined) {
    const formattedData = formatData(data);
    if (formattedData.includes("\n")) {
      output += `\n${colors.dim}${formattedData}${colors.reset}`;
    } else {
      output += ` ${colors.dim}${formattedData}${colors.reset}`;
    }
  }

  console.log(output);
}

// Public API
export const logger = {
  trace: (category: Category, message: string, data?: unknown) =>
    log("trace", category, message, data),
  debug: (category: Category, message: string, data?: unknown) =>
    log("debug", category, message, data),
  info: (category: Category, message: string, data?: unknown) =>
    log("info", category, message, data),
  warn: (category: Category, message: string, data?: unknown) =>
    log("warn", category, message, data),
  error: (category: Category, message: string, data?: unknown) =>
    log("error", category, message, data),

  /**
   * Start a timer for performance profiling
   */
  time: (label: string): void => {
    timers.set(label, performance.now());
  },

  /**
   * End a timer and return elapsed milliseconds
   */
  timeEnd: (label: string): number => {
    const start = timers.get(label);
    timers.delete(label);
    if (!start) return 0;
    return Math.round(performance.now() - start);
  },

  /**
   * Set the current request ID for log correlation
   */
  setRequestId: (id: string | null): void => {
    currentRequestId = id;
  },

  /**
   * Generate a short request ID
   */
  generateRequestId: (): string => {
    return `req-${Math.random().toString(36).slice(2, 6)}`;
  },

  /**
   * Print a separator line for visual breaks
   */
  separator: (): void => {
    if (!isDebugEnabled()) return;
    console.log(
      `${colors.dim}${"─".repeat(60)}${colors.reset}`
    );
  },

  /**
   * Print a banner line
   */
  banner: (text: string): void => {
    console.log(`${colors.bold}=== ${text} ===${colors.reset}`);
  },

  /**
   * Check if debug mode is enabled
   */
  isDebugEnabled,

  /**
   * Pretty print an object (respects truncation)
   */
  pretty: (data: unknown): string => formatData(data),
};

export type Logger = typeof logger;

/**
 * Tracing Helper Utilities
 *
 * These utilities make it easy to add custom spans to business logic
 * without coupling the code directly to OpenTelemetry.
 *
 * Usage:
 *
 * // Wrap an async function with a span
 * const result = await withSpan("discord.fetch_guilds", async (span) => {
 *   span.setAttribute("guild_count", guilds.length);
 *   return fetchGuilds();
 * });
 *
 * // Add attributes to the current span
 * addSpanAttributes({ "user.id": userId, "regiment.id": regimentId });
 *
 * // Record an exception
 * recordException(error, "Failed to process scanner request");
 */

import { trace, SpanStatusCode, Span, Attributes } from "@opentelemetry/api";

// Default tracer name for this application
const TRACER_NAME = "foxhole-quartermaster";

/**
 * Get the tracer instance for this application
 */
export function getTracer() {
  return trace.getTracer(TRACER_NAME);
}

/**
 * Get the currently active span, if any
 */
export function getActiveSpan(): Span | undefined {
  return trace.getActiveSpan();
}

/**
 * Execute an async function within a new span
 *
 * @param name - The name of the span (e.g., "discord.fetch_guilds")
 * @param fn - The async function to execute
 * @param attributes - Optional initial attributes for the span
 * @returns The result of the async function
 *
 * @example
 * const guilds = await withSpan("discord.fetch_guilds", async (span) => {
 *   const result = await fetchGuilds(token);
 *   span.setAttribute("guild_count", result.length);
 *   return result;
 * });
 */
export async function withSpan<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
  attributes?: Attributes
): Promise<T> {
  const tracer = getTracer();

  return tracer.startActiveSpan(name, { attributes }, async (span) => {
    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Execute a synchronous function within a new span
 *
 * @param name - The name of the span
 * @param fn - The function to execute
 * @param attributes - Optional initial attributes for the span
 * @returns The result of the function
 */
export function withSpanSync<T>(
  name: string,
  fn: (span: Span) => T,
  attributes?: Attributes
): T {
  const tracer = getTracer();

  return tracer.startActiveSpan(name, { attributes }, (span) => {
    try {
      const result = fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Add attributes to the currently active span
 *
 * This is useful for adding context to spans created by auto-instrumentation.
 *
 * @param attributes - Key-value pairs to add to the span
 *
 * @example
 * addSpanAttributes({
 *   "user.id": session.user.id,
 *   "regiment.id": regimentId,
 *   "stockpile.count": stockpiles.length,
 * });
 */
export function addSpanAttributes(attributes: Attributes): void {
  const span = getActiveSpan();
  if (span) {
    span.setAttributes(attributes);
  }
}

/**
 * Record an exception on the currently active span
 *
 * @param error - The error to record
 * @param message - Optional message to set as the span status
 *
 * @example
 * try {
 *   await processImage(data);
 * } catch (error) {
 *   recordException(error, "Failed to process scanner image");
 *   throw error;
 * }
 */
export function recordException(error: unknown, message?: string): void {
  const span = getActiveSpan();
  if (span) {
    span.recordException(error instanceof Error ? error : new Error(String(error)));
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: message || (error instanceof Error ? error.message : String(error)),
    });
  }
}

/**
 * Set the status of the currently active span to OK
 *
 * Useful when you want to mark a span as successful after
 * completing some operation.
 */
export function setSpanOk(): void {
  const span = getActiveSpan();
  if (span) {
    span.setStatus({ code: SpanStatusCode.OK });
  }
}

/**
 * Set the status of the currently active span to ERROR
 *
 * @param message - The error message
 */
export function setSpanError(message: string): void {
  const span = getActiveSpan();
  if (span) {
    span.setStatus({ code: SpanStatusCode.ERROR, message });
  }
}

/**
 * Create a span event (a timestamped log message within a span)
 *
 * @param name - The name of the event
 * @param attributes - Optional attributes for the event
 *
 * @example
 * addSpanEvent("cache_miss", { key: cacheKey });
 */
export function addSpanEvent(name: string, attributes?: Attributes): void {
  const span = getActiveSpan();
  if (span) {
    span.addEvent(name, attributes);
  }
}

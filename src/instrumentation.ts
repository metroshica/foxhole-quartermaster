/**
 * Next.js Instrumentation Entry Point
 *
 * This file is automatically loaded by Next.js when the app starts.
 * It initializes OpenTelemetry for distributed tracing and Sentry for error tracking.
 *
 * The register() function is called once when the server starts,
 * making it the perfect place to initialize telemetry.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // OpenTelemetry disabled - using Sentry for observability
    // const { initTelemetry } = await import("@/lib/telemetry");
    // initTelemetry();

    // Initialize Sentry server-side
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;

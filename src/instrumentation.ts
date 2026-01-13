/**
 * Next.js Instrumentation Entry Point
 *
 * This file is automatically loaded by Next.js when the app starts.
 * It initializes OpenTelemetry for distributed tracing.
 *
 * The register() function is called once when the server starts,
 * making it the perfect place to initialize telemetry.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only initialize telemetry on the server (Node.js runtime)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initTelemetry } = await import("@/lib/telemetry");
    initTelemetry();
  }
}

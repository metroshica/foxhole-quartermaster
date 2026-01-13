/**
 * OpenTelemetry SDK Configuration
 *
 * This module initializes the OpenTelemetry SDK for distributed tracing.
 * It uses the OTLP exporter which is compatible with multiple backends:
 * - Honeycomb
 * - GCP Cloud Trace
 * - Datadog
 * - Grafana Tempo
 * - Jaeger
 *
 * Configuration is done via environment variables:
 * - OTEL_EXPORTER_OTLP_ENDPOINT: The endpoint to send traces to
 * - OTEL_EXPORTER_OTLP_HEADERS: Headers for authentication (e.g., API keys)
 * - OTEL_SERVICE_NAME: The name of this service in traces
 *
 * To switch providers, just change these environment variables.
 */

import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { PrismaInstrumentation } from "@prisma/instrumentation";

let sdk: NodeSDK | null = null;

/**
 * Initialize the OpenTelemetry SDK
 *
 * This should be called once at application startup, before any other code runs.
 * In Next.js, this is done via the instrumentation.ts file.
 */
export function initTelemetry() {
  // Skip if already initialized or if tracing is disabled
  if (sdk) {
    return;
  }

  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint) {
    console.log("[Telemetry] OTEL_EXPORTER_OTLP_ENDPOINT not set, tracing disabled");
    return;
  }

  const serviceName = process.env.OTEL_SERVICE_NAME || "foxhole-quartermaster";
  const environment = process.env.NODE_ENV || "development";

  console.log(`[Telemetry] Initializing with endpoint: ${endpoint}`);

  // Parse headers from environment variable
  // Format: "key1=value1,key2=value2" or "key1=value1"
  const headersEnv = process.env.OTEL_EXPORTER_OTLP_HEADERS || "";
  const headers: Record<string, string> = {};
  if (headersEnv) {
    headersEnv.split(",").forEach((pair) => {
      const [key, ...valueParts] = pair.split("=");
      if (key && valueParts.length > 0) {
        headers[key.trim()] = valueParts.join("=").trim();
      }
    });
  }

  // Configure the OTLP exporter
  const traceExporter = new OTLPTraceExporter({
    url: `${endpoint}/v1/traces`,
    headers,
  });

  // Define service resource attributes
  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_SERVICE_VERSION]: process.env.npm_package_version || "0.1.0",
    "deployment.environment": environment,
  });

  // Initialize the SDK with auto-instrumentation
  sdk = new NodeSDK({
    resource,
    traceExporter,
    instrumentations: [
      // Auto-instrument common Node.js modules
      getNodeAutoInstrumentations({
        // Disable fs instrumentation (too noisy for this app)
        "@opentelemetry/instrumentation-fs": {
          enabled: false,
        },
        // Configure HTTP instrumentation
        "@opentelemetry/instrumentation-http": {
          enabled: true,
        },
        // Configure fetch instrumentation for external API calls
        "@opentelemetry/instrumentation-undici": {
          enabled: true,
        },
      }),
      // Prisma-specific instrumentation for database queries
      // Filter out verbose low-level spans to reduce trace volume
      new PrismaInstrumentation({
        ignoreSpanTypes: [
          // Ignore internal serialization and connection spans
          /prisma:client:serialize/,
          /prisma:engine:connection/,
          /prisma:engine:serialize/,
          // Keep prisma:client:operation (high-level) and prisma:engine:query (SQL)
        ],
      }),
    ],
  });

  // Start the SDK
  sdk.start();

  console.log(`[Telemetry] SDK initialized for service: ${serviceName}`);

  // Graceful shutdown on process exit
  process.on("SIGTERM", () => {
    sdk
      ?.shutdown()
      .then(() => console.log("[Telemetry] SDK shut down successfully"))
      .catch((error) => console.error("[Telemetry] Error shutting down SDK:", error))
      .finally(() => process.exit(0));
  });
}

/**
 * Shutdown the OpenTelemetry SDK
 *
 * Call this when the application is shutting down to ensure
 * all pending traces are flushed.
 */
export async function shutdownTelemetry() {
  if (sdk) {
    await sdk.shutdown();
    sdk = null;
    console.log("[Telemetry] SDK shut down");
  }
}

// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://39b80cc3f3909f8b2514c64e6a55a610@o4510711778705408.ingest.us.sentry.io/4510711780278272",

  // Distinguish between dev and production in Sentry dashboard
  environment: process.env.NODE_ENV,

  // Use a sampler to drop noisy traces and sample 5% of the rest
  tracesSampler: (samplingContext) => {
    const name = samplingContext.name || "";

    // Drop NextAuth session checks - these fire on every page load/navigation
    if (name.includes("/api/auth/")) return 0;

    // Drop Next.js internal routes (static assets, RSC payloads)
    if (name.includes("/_next/")) return 0;

    // Sample everything else at 2.5%
    return 0.025;
  },

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
});

// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://39b80cc3f3909f8b2514c64e6a55a610@o4510711778705408.ingest.us.sentry.io/4510711780278272",

  // Distinguish between dev and production in Sentry dashboard
  environment: process.env.NODE_ENV,

  // Add optional integrations for additional features
  integrations: [Sentry.replayIntegration()],

  // Sample 2.5% of traces to stay within Sentry free tier (5M spans/month)
  tracesSampleRate: 0.025,

  // Define how likely Replay events are sampled.
  replaysSessionSampleRate: 0.05,

  // Define how likely Replay events are sampled when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

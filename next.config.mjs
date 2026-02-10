import { withSentryConfig } from "@sentry/nextjs";
/**
 * Next.js configuration for Foxhole Quartermaster
 *
 * Key configurations:
 * - Webpack alias fixes for Tesseract.js compatibility (canvas/encoding modules)
 * - These modules aren't available in browser but Tesseract.js imports them
 *
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  output: "standalone",

  // Turbopack configuration (Next.js 16+ default bundler)
  turbopack: {
    resolveAlias: {
      // Tesseract.js uses optional node modules that don't exist in browser
      canvas: { browser: "" },
      encoding: { browser: "" },
    },
  },

  // Webpack fallback (for compatibility)
  webpack: (config, { isServer }) => {
    // Tesseract.js uses optional node modules that don't exist in browser
    // Setting these to false tells webpack to provide empty modules
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        canvas: false,
        encoding: false,
      };
    }
    return config;
  },

  // Allow images from external domains (Foxhole item icons)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        pathname: "/foxholetools/assets/**",
      },
    ],
  },

  // Enable experimental features useful for this app
  experimental: {
    // Allows server actions to handle larger payloads (for image data)
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default withSentryConfig(nextConfig, {
 // For all available options, see:
 // https://www.npmjs.com/package/@sentry/webpack-plugin#options

 org: "landonorr",

 project: "javascript-nextjs",

 // Only print logs for uploading source maps in CI
 silent: !process.env.CI,

 // For all available options, see:
 // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

 // Upload a larger set of source maps for prettier stack traces (increases build time)
 widenClientFileUpload: true,

 // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
 // This can increase your server load as well as your hosting bill.
 // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
 // side errors will fail.
 tunnelRoute: "/monitoring",

 webpack: {
   // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
   // See the following for more information:
   // https://docs.sentry.io/product/crons/
   // https://vercel.com/docs/cron-jobs
   automaticVercelMonitors: true,

   // Tree-shaking options for reducing bundle size
   treeshake: {
     // Automatically tree-shake Sentry logger statements to reduce bundle size
     removeDebugLogging: true,
   },
 },
});

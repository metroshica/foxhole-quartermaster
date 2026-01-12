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

export default nextConfig;

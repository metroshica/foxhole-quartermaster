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

  // Enable experimental features useful for this app
  experimental: {
    // Allows server actions to handle larger payloads (for image data)
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;

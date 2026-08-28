import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // postgres.js is a native-ish driver; keep it out of the bundler.
  serverExternalPackages: ["postgres"],
  images: {
    // Product photos can be hosted anywhere (admin pastes a URL) or served
    // from our own /api/uploads route.
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "localhost" },
    ],
  },
};

export default nextConfig;

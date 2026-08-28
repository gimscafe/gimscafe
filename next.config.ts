import type { NextConfig } from "next";

/**
 * When the app runs behind a reverse proxy / CDN (Cloudflare in front of
 * Railway), the browser's `Origin` on a Server Action POST is the public
 * domain while the internal `Host` may differ. Next.js rejects that as a CSRF
 * mismatch unless the public host is whitelisted here. Derived from
 * NEXT_PUBLIC_SITE_URL so a domain change is a one-line env edit.
 */
const siteHost = (() => {
  try {
    const u = process.env.NEXT_PUBLIC_SITE_URL;
    return u ? new URL(u).host : undefined;
  } catch {
    return undefined;
  }
})();

const nextConfig: NextConfig = {
  // postgres.js is a native-ish driver; keep it out of the bundler.
  serverExternalPackages: ["postgres"],
  experimental: {
    serverActions: {
      allowedOrigins: siteHost ? [siteHost, `*.${siteHost}`] : undefined,
    },
  },
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

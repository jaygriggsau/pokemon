import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Serve AVIF first (best compression), fall back to WebP
    formats: ["image/avif", "image/webp"],
    // Cache optimised images for 7 days (default is 60 s)
    minimumCacheTTL: 604_800,
    remotePatterns: [
      { protocol: "https", hostname: "**.tcggo.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
};

export default nextConfig;

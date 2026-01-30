import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ["geoip-lite"],
};

export default nextConfig;

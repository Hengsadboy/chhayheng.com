import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Optimize build for 1GB RAM / 1 Core VPS (prevent multi-worker memory freezing)
  experimental: {
    cpus: 1,
  }
};

export default nextConfig;

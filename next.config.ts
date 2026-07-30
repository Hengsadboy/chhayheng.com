import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  reactStrictMode: false,
  productionBrowserSourceMaps: false,
  typescript: {
    ignoreBuildErrors: true,
  }
};

export default nextConfig;

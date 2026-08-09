import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@react-pdf/renderer"],
  experimental: {
    useOffline: true,
  },
};

export default nextConfig;

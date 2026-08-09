import type { NextConfig } from "next";

/** Set when building the static copy embedded on skitz-games.pages.dev */
const skitzBase = process.env.SKITZ_BASE_PATH?.replace(/\/$/, "") || "";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@react-pdf/renderer"],
  experimental: {
    useOffline: true,
  },
  ...(skitzBase
    ? {
        output: "export" as const,
        basePath: skitzBase,
        assetPrefix: skitzBase,
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;

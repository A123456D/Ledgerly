import type { MetadataRoute } from "next";

import { APP_NAME, APP_TAGLINE } from "@/lib/brand";

export const dynamic = "force-static";

const base = (process.env.SKITZ_BASE_PATH || "").replace(/\/$/, "");

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${APP_NAME} — ${APP_TAGLINE}`,
    short_name: APP_NAME,
    description:
      "Beautiful, fast, compliant invoices for freelancers. Local-first. No account required.",
    start_url: base ? `${base}/` : "/",
    scope: base ? `${base}/` : "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f3f0e8",
    theme_color: "#0f766e",
    categories: ["business", "finance", "productivity"],
    icons: [
      {
        src: `${base}/icons/icon-192.png`,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `${base}/icons/icon-512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `${base}/icons/icon-maskable-192.png`,
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: `${base}/icons/icon-maskable-512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

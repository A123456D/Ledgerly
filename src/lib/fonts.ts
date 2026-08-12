import type { CSSProperties } from "react";
import type { FontPair } from "@/lib/types";

export const FONT_PAIR_OPTIONS: {
  id: FontPair;
  label: string;
  blurb: string;
}[] = [
  {
    id: "editorial",
    label: "Editorial",
    blurb: "Serif headlines + clean sans body",
  },
  {
    id: "modern",
    label: "Modern",
    blurb: "Geometric sans throughout",
  },
  {
    id: "mono",
    label: "Mono",
    blurb: "Technical monospace look",
  },
];

/** Preset brand colors shown next to the custom picker */
export const ACCENT_PRESETS = [
  "#0f766e",
  "#2563eb",
  "#7c3aed",
  "#be123c",
  "#c2410c",
  "#a16207",
  "#047857",
  "#0e7490",
  "#1e293b",
  "#111111",
];

/**
 * Remap Next font CSS variables on the invoice root so templates
 * (which use --font-display / --font-body / --font-mono) actually change.
 */
export function fontPairCssVars(pair: FontPair = "editorial"): CSSProperties {
  switch (pair) {
    case "modern":
      return {
        ["--font-display" as string]: "var(--font-modern)",
        ["--font-body" as string]: "var(--font-modern)",
      };
    case "mono":
      return {
        ["--font-display" as string]: "var(--font-mono)",
        ["--font-body" as string]: "var(--font-mono)",
      };
    case "editorial":
    default:
      return {
        // Keep layout defaults (Fraunces + Source Sans) — set explicitly for PDF clones
        ["--font-display" as string]: "var(--font-editorial-display)",
        ["--font-body" as string]: "var(--font-editorial-body)",
      };
  }
}

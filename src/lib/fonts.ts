import type { CSSProperties } from "react";
import type { FontPair } from "@/lib/types";

/** Product default: Outfit geometric sans for app chrome and new documents. */
export const DEFAULT_FONT_PAIR: FontPair = "modern";

export const FONT_PAIR_OPTIONS: {
  id: FontPair;
  label: string;
  blurb: string;
}[] = [
  {
    id: "modern",
    label: "Modern",
    blurb: "Geometric sans throughout",
  },
  {
    id: "editorial",
    label: "Editorial",
    blurb: "Serif headlines + clean sans body",
  },
  {
    id: "classic",
    label: "Classic",
    blurb: "Traditional serif — formal invoices",
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
export function resolveFontPair(pair?: FontPair | null): FontPair {
  return pair ?? DEFAULT_FONT_PAIR;
}

export function fontPairCssVars(pair: FontPair = DEFAULT_FONT_PAIR): CSSProperties {
  switch (pair) {
    case "classic":
      return {
        ["--font-display" as string]: "var(--font-classic-display)",
        ["--font-body" as string]: "var(--font-editorial-body)",
      };
    case "editorial":
      return {
        ["--font-display" as string]: "var(--font-editorial-display)",
        ["--font-body" as string]: "var(--font-editorial-body)",
      };
    case "mono":
      return {
        ["--font-display" as string]: "var(--font-mono)",
        ["--font-body" as string]: "var(--font-mono)",
      };
    case "modern":
    default:
      return {
        ["--font-display" as string]: "var(--font-modern)",
        ["--font-body" as string]: "var(--font-modern)",
      };
  }
}

/** Colour helpers for document templates. Accents are always hex in this app. */

function parseHex(hex: string): [number, number, number] | null {
  let h = hex.trim().replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/** Relative luminance 0–1 (WCAG). */
export function luminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Readable ink for text sitting on `bg`: dark ink on light accents
 * (champagne gold, pastels), white on saturated/dark accents.
 */
export function inkOn(bg: string): string {
  return luminance(bg) > 0.35 ? "#1c1917" : "#ffffff";
}

/** Sub-text ink for use on `bg` (e.g. labels inside a filled block). */
export function mutedInkOn(bg: string): string {
  return luminance(bg) > 0.45 ? "rgba(28,25,23,0.62)" : "rgba(255,255,255,0.75)";
}

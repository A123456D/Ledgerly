/** Invoice logo print size (CSS px on the A4 sheet before preview scale). */
export const DEFAULT_LOGO_SIZE_PX = 120;
export const MIN_LOGO_SIZE_PX = 48;
export const MAX_LOGO_SIZE_PX = 240;

export function clampLogoSizePx(value: number | undefined | null): number {
  const n = typeof value === "number" && Number.isFinite(value) ? value : DEFAULT_LOGO_SIZE_PX;
  return Math.min(MAX_LOGO_SIZE_PX, Math.max(MIN_LOGO_SIZE_PX, Math.round(n)));
}

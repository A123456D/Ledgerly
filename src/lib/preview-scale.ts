/** Scale used by the template gallery A4 preview modal. */
export const TEMPLATE_PREVIEW_MODAL_MIN_SCALE = 0.2;
export const TEMPLATE_PREVIEW_MODAL_MAX_SCALE = 0.85;

/**
 * Fit an A4 sheet into the host width. Matches InvoiceStage measure().
 * The 2px inset avoids a 1px overflow from rounding that would clip or scroll.
 */
export function previewFitScale(
  availablePx: number,
  sheetWidthPx: number,
  minScale: number,
  maxScale: number,
): number {
  if (availablePx <= 0 || sheetWidthPx <= 0) return minScale;
  return Math.min(maxScale, Math.max(minScale, (availablePx - 2) / sheetWidthPx));
}

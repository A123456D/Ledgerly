/** CSS reference box for an A4 invoice sheet (96 CSS px per in). */

export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;
export const CSS_PX_PER_MM = 96 / 25.4;
export const A4_WIDTH_PX = Math.round(A4_WIDTH_MM * CSS_PX_PER_MM);
export const A4_HEIGHT_PX = Math.round(A4_HEIGHT_MM * CSS_PX_PER_MM);

export function a4PageCount(heightPx: number, pagePx = A4_HEIGHT_PX): number {
  if (pagePx <= 0) return 1;
  return Math.max(1, Math.ceil(heightPx / pagePx));
}

/**
 * Screenshot height for PDF: one A4 if the ink fits, otherwise whole pages.
 * Slack absorbs sub-pixel / padding noise so a one-page invoice is not
 * sliced onto a blank second page.
 */
export function captureSheetHeightPx(
  contentPx: number,
  pagePx = A4_HEIGHT_PX,
  slackPx = 16,
): number {
  const h = Math.max(contentPx, 1);
  if (h <= pagePx + slackPx) return pagePx;
  return a4PageCount(h, pagePx) * pagePx;
}

/** How many A4 pages a raster occupies. Ignore a trailing sliver. */
export function pdfRasterPageCount(
  imageHeightMm: number,
  pageMm = A4_HEIGHT_MM,
  leftoverMm = 4,
): number {
  if (imageHeightMm <= pageMm + leftoverMm) return 1;
  const extra = imageHeightMm - pageMm;
  return 1 + Math.ceil((extra - leftoverMm) / pageMm);
}

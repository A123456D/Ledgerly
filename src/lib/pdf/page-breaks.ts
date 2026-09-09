/** Keep blocks from being sliced across PDF page boundaries (screenshot split). */
export const PAGE_BREAK_GAP_PX = 40;

function blockPages(top: number, height: number, pageHeight: number) {
  const start = Math.floor(top / pageHeight);
  const end = Math.floor(Math.max(0, top + height - 1) / pageHeight);
  return { start, end };
}

/**
 * Before capturing the invoice DOM, push `[data-invoice-avoid-break]` blocks
 * down when they would straddle an A4 page line.
 */
export function applySmartPageBreaks(
  sheet: HTMLElement,
  pageHeightPx: number,
): void {
  if (pageHeightPx <= 0) return;

  const blocks = () =>
    Array.from(sheet.querySelectorAll<HTMLElement>("[data-invoice-avoid-break]"));

  for (let pass = 0; pass < 6; pass++) {
    let moved = false;
    const sheetTop = sheet.getBoundingClientRect().top;

    for (const block of blocks()) {
      const rect = block.getBoundingClientRect();
      const top = rect.top - sheetTop;
      const height = rect.height;

      if (height <= 0) continue;
      // Too tall to fit one page — leave it (table body handles row-level breaks)
      if (height > pageHeightPx * 0.92) continue;

      const { start, end } = blockPages(top, height, pageHeightPx);
      if (start === end) continue;

      const nextPageTop = (start + 1) * pageHeightPx + PAGE_BREAK_GAP_PX;
      const push = nextPageTop - top;
      if (push <= 0) continue;

      const current = parseFloat(block.style.marginTop) || 0;
      block.style.marginTop = `${current + push}px`;
      moved = true;
    }

    if (!moved) break;
  }
}

/** Uniformly shrink the sheet so a slightly tall invoice stays on one A4. */
export function wrapSheetToFitPage(
  sheet: HTMLElement,
  scale: number,
  pagePx: number,
): void {
  if (scale >= 0.995) return;
  const wrap = document.createElement("div");
  wrap.setAttribute("data-invoice-fit-wrap", "true");
  wrap.style.cssText = [
    "width:100%",
    `transform:scale(${scale})`,
    "transform-origin:top center",
  ].join(";");
  while (sheet.firstChild) wrap.appendChild(sheet.firstChild);
  sheet.appendChild(wrap);
  sheet.style.height = `${pagePx}px`;
  sheet.style.maxHeight = `${pagePx}px`;
  sheet.style.overflow = "hidden";
}

/** Running header on page 2+ so a continuation does not look like a leftover slice. */
export function addContinuationMarkers(
  sheet: HTMLElement,
  pageHeightPx: number,
  pageCount: number,
  label: string,
): void {
  if (pageCount < 2 || !label.trim()) return;
  for (let i = 1; i < pageCount; i++) {
    const el = document.createElement("div");
    el.setAttribute("data-invoice-continued", "true");
    el.style.cssText = [
      "position:absolute",
      "left:0",
      "right:0",
      `top:${i * pageHeightPx}px`,
      "z-index:8",
      "box-sizing:border-box",
      "height:36px",
      "padding:10px 14mm 0",
      "font-size:10px",
      "letter-spacing:0.12em",
      "text-transform:uppercase",
      "color:#5c675f",
      "background:#fff",
      "border-bottom:1px solid #e7e5e4",
    ].join(";");
    el.textContent = label;
    sheet.appendChild(el);
  }
}

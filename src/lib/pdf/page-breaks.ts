/** Keep blocks from being sliced across PDF page boundaries (screenshot split). */
const PAGE_GAP_PX = 16;

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

      const nextPageTop = (start + 1) * pageHeightPx + PAGE_GAP_PX;
      const push = nextPageTop - top;
      if (push <= 0) continue;

      const current = parseFloat(block.style.marginTop) || 0;
      block.style.marginTop = `${current + push}px`;
      moved = true;
    }

    if (!moved) break;
  }

  const pages = Math.max(1, Math.ceil(sheet.scrollHeight / pageHeightPx));
  sheet.style.minHeight = `${pages * pageHeightPx}px`;
}

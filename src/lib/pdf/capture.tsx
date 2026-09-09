"use client";

import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { domToPng } from "modern-screenshot";
import { jsPDF } from "jspdf";
import {
  addContinuationMarkers,
  applySmartPageBreaks,
  wrapSheetToFitPage,
} from "@/lib/pdf/page-breaks";
import { stripSectionEditChrome } from "@/components/invoice-edit-context";
import {
  InvoicePreview,
  type InvoiceViewModel,
} from "@/templates/InvoicePreview";
import { fillLogoImages } from "@/lib/decorations/logo-decoration";
import { documentNoun } from "@/lib/document-kind";
import {
  A4_HEIGHT_MM,
  A4_HEIGHT_PX,
  A4_WIDTH_MM,
  A4_WIDTH_PX,
  captureSheetHeightPx,
  shouldFitToSinglePage,
  singlePageFitScale,
} from "@/lib/sheet-size";

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function screenshotScale() {
  const dpr =
    typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  return 2 / dpr;
}

function hydrateDoc(doc: InvoiceViewModel): InvoiceViewModel {
  const src = doc.logoDataUrl || doc.business.logoDataUrl;
  return {
    ...doc,
    decorations: fillLogoImages(doc.decorations, src),
  };
}

async function waitForImages(root: HTMLElement) {
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) resolve();
          else {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }
        }),
    ),
  );
}

function pngToPdfBlob(dataUrl: string, pages: number): Blob {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pageCount = Math.max(1, Math.round(pages));
  const imgW = A4_WIDTH_MM;
  const imgH = pageCount * A4_HEIGHT_MM;

  for (let i = 0; i < pageCount; i++) {
    if (i > 0) pdf.addPage();
    const position = -i * A4_HEIGHT_MM;
    pdf.addImage(dataUrl, "PNG", 0, position, imgW, imgH, undefined, "FAST");
  }

  return pdf.output("blob");
}

function measureInkHeight(sheet: HTMLElement): number {
  const sheetTop = sheet.getBoundingClientRect().top;
  const content = sheet.querySelector<HTMLElement>("[data-invoice-content]");
  let bottom = content
    ? content.getBoundingClientRect().bottom - sheetTop
    : Math.max(sheet.scrollHeight, sheet.offsetHeight);

  sheet.querySelectorAll<HTMLElement>("[data-invoice-decoration]").forEach((el) => {
    const b = el.getBoundingClientRect().bottom - sheetTop;
    if (b > bottom) bottom = b;
  });

  return Math.max(bottom, content?.offsetHeight ?? 0, A4_HEIGHT_PX * 0.5);
}

function continuationLabel(doc?: InvoiceViewModel): string {
  if (!doc) return "Continued";
  const n = doc.number?.trim();
  return n
    ? `${documentNoun(doc.kind)} ${n} · continued`
    : `${documentNoun(doc.kind)} · continued`;
}

/** Compact, then either shrink onto one A4 or paginate on row boundaries. */
function layoutSheetForPdf(
  sheet: HTMLElement,
  doc?: InvoiceViewModel,
): { heightPx: number; pages: number } {
  sheet.classList.add("invoice-pdf-capture");
  let ink = measureInkHeight(sheet);

  if (ink > A4_HEIGHT_PX + 4) {
    sheet.classList.add("invoice-sheet-compact");
    ink = measureInkHeight(sheet);
  }

  if (shouldFitToSinglePage(ink)) {
    wrapSheetToFitPage(sheet, singlePageFitScale(ink), A4_HEIGHT_PX);
    return { heightPx: A4_HEIGHT_PX, pages: 1 };
  }

  applySmartPageBreaks(sheet, A4_HEIGHT_PX);
  ink = measureInkHeight(sheet);
  const heightPx = captureSheetHeightPx(ink);
  const pages = Math.max(1, Math.round(heightPx / A4_HEIGHT_PX));
  if (pages > 1) {
    addContinuationMarkers(
      sheet,
      A4_HEIGHT_PX,
      pages,
      continuationLabel(doc),
    );
  }
  return { heightPx, pages };
}

function prepareSheetForCapture(sheet: HTMLElement) {
  sheet.style.boxShadow = "none";
  sheet.style.transform = "none";
  sheet.style.width = `${A4_WIDTH_PX}px`;
  sheet.style.maxWidth = `${A4_WIDTH_PX}px`;
  sheet.style.minHeight = `${A4_HEIGHT_PX}px`;
  sheet.style.margin = "0";
  sheet.style.opacity = "1";
}

async function captureNode(node: HTMLElement, heightPx: number): Promise<string> {
  node.style.height = `${heightPx}px`;
  node.style.maxHeight = `${heightPx}px`;
  node.style.overflow = "hidden";

  return domToPng(node, {
    width: A4_WIDTH_PX,
    height: heightPx,
    scale: screenshotScale(),
    backgroundColor: "#ffffff",
    style: {
      transform: "none",
      boxShadow: "none",
      backfaceVisibility: "visible",
      opacity: "1",
    },
    filter: (el) => {
      if (!(el instanceof Element)) return true;
      return !el.classList?.contains("no-print");
    },
  });
}

/** Keep the sheet in the viewport so images actually paint into the screenshot. */
function captureHost(): HTMLDivElement {
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = [
    "position:fixed",
    "left:0",
    "top:0",
    `width:${A4_WIDTH_PX}px`,
    "z-index:2147483646",
    "background:#fff",
    "opacity:1",
    "pointer-events:none",
  ].join(";");
  return host;
}

async function captureLivePreviewSheet(): Promise<Blob | null> {
  const live = document.querySelector<HTMLElement>(
    "[data-invoice-preview-root] [data-invoice-sheet]",
  );
  if (!live) return null;

  const host = captureHost();
  const frame = document.createElement("div");
  frame.style.cssText = `width:${A4_WIDTH_PX}px;min-height:${A4_HEIGHT_PX}px;background:#fff;`;
  host.appendChild(frame);
  document.body.appendChild(host);

  try {
    const clone = live.cloneNode(true) as HTMLElement;
    prepareSheetForCapture(clone);
    frame.appendChild(clone);

    await waitForImages(clone);
    await document.fonts?.ready;
    await sleep(80);

    stripSectionEditChrome(clone);
    await sleep(40);

    const { heightPx, pages } = layoutSheetForPdf(clone);
    const dataUrl = await captureNode(clone, heightPx);
    return pngToPdfBlob(dataUrl, pages);
  } finally {
    host.remove();
  }
}

async function captureRemountedPreview(doc: InvoiceViewModel): Promise<Blob> {
  const host = captureHost();
  const mount = document.createElement("div");
  mount.style.cssText = `width:${A4_WIDTH_PX}px;background:#fff;`;
  host.appendChild(mount);
  document.body.appendChild(host);

  const root = createRoot(mount);

  try {
    flushSync(() => {
      root.render(<InvoicePreview doc={hydrateDoc(doc)} />);
    });

    await document.fonts?.ready;
    await waitForImages(mount);
    await sleep(120);

    const sheet =
      mount.querySelector<HTMLElement>("[data-invoice-sheet], .invoice-sheet") ||
      (mount.firstElementChild as HTMLElement | null);

    if (!sheet) throw new Error("Invoice preview failed to render for PDF");

    prepareSheetForCapture(sheet);
    stripSectionEditChrome(sheet);
    await sleep(40);

    const { heightPx, pages } = layoutSheetForPdf(sheet, doc);
    const dataUrl = await captureNode(sheet, heightPx);
    return pngToPdfBlob(dataUrl, pages);
  } finally {
    root.unmount();
    host.remove();
  }
}

export async function buildPayslipPdfBlobFromPreview(): Promise<Blob> {
  const live = await captureLivePreviewSheet();
  if (!live) throw new Error("Payslip preview is not ready — wait a moment and try again");
  return live;
}

/** Remount at A4 so logos/shapes paint; do not screenshot the scaled editor clone. */
export async function buildInvoicePdfBlobFromPreview(
  doc: InvoiceViewModel,
): Promise<Blob> {
  return captureRemountedPreview(hydrateDoc(doc));
}

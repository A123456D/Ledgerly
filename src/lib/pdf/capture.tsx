"use client";

import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { domToPng } from "modern-screenshot";
import { jsPDF } from "jspdf";
import { applySmartPageBreaks } from "@/lib/pdf/page-breaks";
import {
  InvoicePreview,
  type InvoiceViewModel,
} from "@/templates/InvoicePreview";

const A4_W_MM = 210;
const A4_H_MM = 297;
const PX_PER_MM = 96 / 25.4;
const A4_W_PX = Math.round(A4_W_MM * PX_PER_MM);
const A4_H_PX = Math.round(A4_H_MM * PX_PER_MM);

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
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

function pngToPdfBlob(dataUrl: string): Blob {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const props = pdf.getImageProperties(dataUrl);
  const imgW = A4_W_MM;
  const imgH = (props.height * imgW) / props.width;

  let heightLeft = imgH;
  let position = 0;

  pdf.addImage(dataUrl, "PNG", 0, position, imgW, imgH, undefined, "FAST");
  heightLeft -= A4_H_MM;

  while (heightLeft > 1) {
    position -= A4_H_MM;
    pdf.addPage();
    pdf.addImage(dataUrl, "PNG", 0, position, imgW, imgH, undefined, "FAST");
    heightLeft -= A4_H_MM;
  }

  return pdf.output("blob");
}

async function captureNode(node: HTMLElement): Promise<string> {
  const width = Math.max(node.scrollWidth, node.offsetWidth, A4_W_PX);
  const height = Math.max(node.scrollHeight, node.offsetHeight, A4_H_PX);

  return domToPng(node, {
    width,
    height,
    scale: 2,
    backgroundColor: "#ffffff",
    style: {
      transform: "none",
      boxShadow: "none",
    },
    filter: (el) => {
      if (!(el instanceof Element)) return true;
      return !el.classList?.contains("no-print");
    },
  });
}

/**
 * Clone the live editor preview (exact DOM you see) into a 1:1 A4 host and
 * screenshot it — this is what makes PDF/WhatsApp match the template.
 */
async function captureLivePreviewSheet(): Promise<Blob | null> {
  const live = document.querySelector<HTMLElement>(
    "[data-invoice-preview-root] [data-invoice-sheet]",
  );
  if (!live) return null;

  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = [
    "position:fixed",
    "inset:0",
    "z-index:2147483646",
    "display:flex",
    "align-items:flex-start",
    "justify-content:center",
    "background:#fff",
    "overflow:auto",
    "opacity:0",
    "pointer-events:none",
  ].join(";");

  const frame = document.createElement("div");
  frame.style.cssText = `width:${A4_W_PX}px;min-height:${A4_H_PX}px;background:#fff;`;
  host.appendChild(frame);
  document.body.appendChild(host);

  try {
    const clone = live.cloneNode(true) as HTMLElement;
    clone.style.boxShadow = "none";
    clone.style.transform = "none";
    clone.style.width = `${A4_W_PX}px`;
    clone.style.maxWidth = `${A4_W_PX}px`;
    clone.style.minHeight = `${A4_H_PX}px`;
    clone.style.margin = "0";
    frame.appendChild(clone);

    await waitForImages(clone);
    await document.fonts?.ready;
    await sleep(80);

    applySmartPageBreaks(clone, A4_H_PX);
    await sleep(40);

    const dataUrl = await captureNode(clone);
    return pngToPdfBlob(dataUrl);
  } finally {
    host.remove();
  }
}

/** Remount template off-screen when the live preview isn’t on the page. */
async function captureRemountedPreview(doc: InvoiceViewModel): Promise<Blob> {
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = [
    "position:fixed",
    "inset:0",
    "z-index:2147483646",
    "display:flex",
    "align-items:flex-start",
    "justify-content:center",
    "background:#fff",
    "overflow:auto",
    "opacity:0",
    "pointer-events:none",
  ].join(";");

  const mount = document.createElement("div");
  mount.style.cssText = `width:${A4_W_PX}px;background:#fff;`;
  host.appendChild(mount);
  document.body.appendChild(host);

  const root = createRoot(mount);

  try {
    flushSync(() => {
      root.render(<InvoicePreview doc={doc} />);
    });

    await document.fonts?.ready;
    await waitForImages(mount);
    await sleep(120);

    const sheet =
      mount.querySelector<HTMLElement>("[data-invoice-sheet], .invoice-sheet") ||
      (mount.firstElementChild as HTMLElement | null);

    if (!sheet) throw new Error("Invoice preview failed to render for PDF");

    sheet.style.boxShadow = "none";
    sheet.style.width = `${A4_W_PX}px`;
    sheet.style.maxWidth = `${A4_W_PX}px`;
    sheet.style.minHeight = `${A4_H_PX}px`;

    applySmartPageBreaks(sheet, A4_H_PX);
    await sleep(40);

    const dataUrl = await captureNode(sheet);
    return pngToPdfBlob(dataUrl);
  } finally {
    root.unmount();
    host.remove();
  }
}

/** Build a PDF that matches the on-screen template as closely as possible. */
export async function buildInvoicePdfBlobFromPreview(
  doc: InvoiceViewModel,
): Promise<Blob> {
  try {
    const live = await captureLivePreviewSheet();
    if (live) return live;
  } catch {
    // fall through to remount
  }
  return captureRemountedPreview(doc);
}

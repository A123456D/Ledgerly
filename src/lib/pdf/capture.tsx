"use client";

import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import {
  InvoicePreview,
  type InvoiceViewModel,
} from "@/templates/InvoicePreview";

const A4_W_MM = 210;
const A4_H_MM = 297;
/** CSS px at 96dpi — keeps mm-based templates stable off-screen */
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

/** Flatten modern CSS colors so html-to-image / SVG foreignObject can paint them. */
function flattenComputedColors(source: HTMLElement, clone: HTMLElement) {
  const srcNodes = [source, ...Array.from(source.querySelectorAll<HTMLElement>("*"))];
  const cloneNodes = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>("*"))];
  const n = Math.min(srcNodes.length, cloneNodes.length);
  for (let i = 0; i < n; i++) {
    const s = srcNodes[i];
    const c = cloneNodes[i];
    if (!s || !c) continue;
    const cs = getComputedStyle(s);
    c.style.color = cs.color;
    c.style.backgroundColor = cs.backgroundColor;
    c.style.borderColor = cs.borderColor;
    c.style.borderTopColor = cs.borderTopColor;
    c.style.borderRightColor = cs.borderRightColor;
    c.style.borderBottomColor = cs.borderBottomColor;
    c.style.borderLeftColor = cs.borderLeftColor;
    c.style.outlineColor = cs.outlineColor;
    c.style.boxShadow = "none";
    c.style.textShadow = cs.textShadow === "none" ? "none" : cs.textShadow;
    c.style.opacity = cs.opacity;
    c.style.fontFamily = cs.fontFamily;
    c.style.fontSize = cs.fontSize;
    c.style.fontWeight = cs.fontWeight;
    c.style.letterSpacing = cs.letterSpacing;
    c.style.lineHeight = cs.lineHeight;
    c.style.textAlign = cs.textAlign;
  }
}

async function elementToPng(node: HTMLElement): Promise<string> {
  const width = Math.max(node.scrollWidth, node.offsetWidth, A4_W_PX);
  const height = Math.max(node.scrollHeight, node.offsetHeight, A4_H_PX);

  // Bake computed colors onto the node so Tailwind/oklch paint correctly in the export.
  flattenComputedColors(node, node);
  node.style.boxShadow = "none";
  node.style.transform = "none";
  node.style.width = `${width}px`;
  node.style.maxWidth = `${width}px`;
  node.style.minHeight = `${A4_H_PX}px`;

  return toPng(node, {
    pixelRatio: 2,
    cacheBust: true,
    width,
    height,
    canvasWidth: width * 2,
    canvasHeight: height * 2,
    backgroundColor: "#ffffff",
    style: {
      transform: "none",
      left: "0",
      top: "0",
      margin: "0",
    },
    filter: (el) => {
      if (!(el instanceof HTMLElement)) return true;
      return !el.classList.contains("no-print");
    },
  });
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

/** Render the same HTML template the editor shows and export it as PDF. */
export async function buildInvoicePdfBlobFromPreview(
  doc: InvoiceViewModel,
): Promise<Blob> {
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.setAttribute("data-invoice-pdf-host", "true");
  // Keep in-viewport (opacity 0) so fonts/layout match real CSS; off-screen can skew mm units.
  host.style.cssText = [
    "position:fixed",
    "left:0",
    "top:0",
    "width:" + A4_W_PX + "px",
    "z-index:-1",
    "opacity:0",
    "pointer-events:none",
    "overflow:hidden",
    "background:#fff",
  ].join(";");
  document.body.appendChild(host);

  const mount = document.createElement("div");
  mount.style.cssText = `width:${A4_W_PX}px;background:#fff;`;
  host.appendChild(mount);

  const root = createRoot(mount);

  try {
    flushSync(() => {
      root.render(<InvoicePreview doc={doc} />);
    });

    await document.fonts?.ready;
    await waitForImages(mount);
    // Let layout + images settle (esp. mobile / WhatsApp share path)
    await sleep(120);
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

    const sheet =
      mount.querySelector<HTMLElement>("[data-invoice-sheet], .invoice-sheet") ||
      mount.firstElementChild;
    if (!(sheet instanceof HTMLElement)) {
      throw new Error("Invoice preview failed to render for PDF");
    }

    sheet.style.boxShadow = "none";
    sheet.style.width = `${A4_W_PX}px`;
    sheet.style.maxWidth = `${A4_W_PX}px`;
    sheet.style.minHeight = `${A4_H_PX}px`;

    const dataUrl = await elementToPng(sheet);
    return pngToPdfBlob(dataUrl);
  } finally {
    root.unmount();
    host.remove();
  }
}

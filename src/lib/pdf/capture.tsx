"use client";

import { createRoot } from "react-dom/client";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import {
  InvoicePreview,
  type InvoiceViewModel,
} from "@/templates/InvoicePreview";

const A4_W_MM = 210;
const A4_H_MM = 297;

async function waitForImages(root: HTMLElement) {
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) resolve();
          else {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }
        }),
    ),
  );
}

/** Render the same HTML preview the editor shows and export it as PDF. */
export async function buildInvoicePdfBlobFromPreview(
  doc: InvoiceViewModel,
): Promise<Blob> {
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText =
    "position:fixed;left:-9999px;top:0;z-index:-1;pointer-events:none;background:#fff;";
  document.body.appendChild(host);

  const sheet = document.createElement("article");
  sheet.className = "invoice-sheet";
  sheet.style.boxShadow = "none";
  host.appendChild(sheet);

  const root = createRoot(sheet);

  try {
    root.render(<InvoicePreview doc={doc} />);

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    await waitForImages(sheet);
    await document.fonts?.ready;

    const width = sheet.offsetWidth;
    const height = Math.max(sheet.offsetHeight, sheet.scrollHeight);

    const dataUrl = await toPng(sheet, {
      pixelRatio: 2,
      cacheBust: true,
      width,
      height,
      backgroundColor: "#ffffff",
    });

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const props = pdf.getImageProperties(dataUrl);
    const imgW = A4_W_MM;
    const imgH = (props.height * imgW) / props.width;

    let heightLeft = imgH;
    let position = 0;

    pdf.addImage(dataUrl, "PNG", 0, position, imgW, imgH);
    heightLeft -= A4_H_MM;

    while (heightLeft > 0) {
      position -= A4_H_MM;
      pdf.addPage();
      pdf.addImage(dataUrl, "PNG", 0, position, imgW, imgH);
      heightLeft -= A4_H_MM;
    }

    return pdf.output("blob");
  } finally {
    root.unmount();
    host.remove();
  }
}

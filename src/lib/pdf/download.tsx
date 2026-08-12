"use client";

import type { InvoiceViewModel } from "@/templates/InvoicePreview";
import { buildInvoicePdfBlobFromPreview } from "@/lib/pdf/capture";

export async function buildInvoicePdfBlob(
  doc: InvoiceViewModel,
): Promise<Blob> {
  return buildInvoicePdfBlobFromPreview(doc);
}

export function pdfFilenameFor(doc: InvoiceViewModel) {
  return `${(doc.number || "invoice").replace(/[^\w.-]+/g, "_")}.pdf`;
}

export async function downloadInvoicePdf(
  doc: InvoiceViewModel,
  filename?: string,
) {
  const blob = await buildInvoicePdfBlob(doc);
  downloadPdfBlob(blob, filename || pdfFilenameFor(doc));
}

export function downloadPdfBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Build the PDF File (async). Call sharePreparedPdfFile on a fresh tap after this. */
export async function prepareInvoicePdfFile(
  doc: InvoiceViewModel,
): Promise<File> {
  const blob = await buildInvoicePdfBlob(doc);
  return new File([blob], pdfFilenameFor(doc), { type: "application/pdf" });
}

export function canSharePdfFile(file: File): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function" &&
    typeof navigator.share === "function" &&
    navigator.canShare({ files: [file] })
  );
}

/**
 * Must run directly from a click/tap (user gesture).
 * Do not call after a long await — browsers will reject it.
 */
export async function sharePreparedPdfFile(
  file: File,
  opts?: { title?: string; text?: string },
): Promise<"shared" | "downloaded"> {
  if (canSharePdfFile(file)) {
    await navigator.share({
      title: opts?.title,
      text: opts?.text,
      files: [file],
    });
    return "shared";
  }
  downloadPdfBlob(file, file.name);
  return "downloaded";
}

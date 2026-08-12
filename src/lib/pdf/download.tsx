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

export function supportsWebShare(): boolean {
  return (
    typeof navigator !== "undefined" && typeof navigator.share === "function"
  );
}

export function canSharePdfFile(file: File): boolean {
  if (!supportsWebShare()) return false;
  // Some browsers implement share but omit / lie about canShare({ files }).
  if (typeof navigator.canShare !== "function") return true;
  try {
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

/**
 * Must run directly from a click/tap (user gesture).
 * WhatsApp often rejects shares that include both text and files — send files only.
 */
export async function sharePreparedPdfFile(
  file: File,
): Promise<"shared" | "unsupported"> {
  if (!supportsWebShare()) return "unsupported";

  // Prefer files-only — most reliable for WhatsApp on Android/iOS.
  try {
    if (typeof navigator.canShare !== "function" || navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: file.name });
      return "shared";
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    // Fall through and try a bare share / report unsupported
  }

  try {
    await navigator.share({ files: [file] });
    return "shared";
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    return "unsupported";
  }
}

/** Digits only for wa.me (include country code, e.g. 2782…). */
export function whatsappPhoneDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function openWhatsAppWithText(text: string, phoneDigits?: string) {
  const q = encodeURIComponent(text);
  const href = phoneDigits
    ? `https://wa.me/${phoneDigits}?text=${q}`
    : `https://wa.me/?text=${q}`;
  window.open(href, "_blank", "noopener,noreferrer");
}

"use client";

import type { InvoiceViewModel } from "@/templates/InvoicePreview";
import { buildInvoicePdfBlobFromPreview } from "@/lib/pdf/capture";

export async function buildInvoicePdfBlob(
  doc: InvoiceViewModel,
): Promise<Blob> {
  // Always use the live HTML template capture so WhatsApp / PDF match the editor.
  // (Legacy react-pdf path looked different and is no longer used for send/download.)
  return buildInvoicePdfBlobFromPreview(doc);
}

export async function downloadInvoicePdf(
  doc: InvoiceViewModel,
  filename?: string,
) {
  const blob = await buildInvoicePdfBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `${doc.number || "invoice"}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Share the WYSIWYG PDF via the system sheet (WhatsApp, Mail, etc.). */
export async function shareInvoicePdf(
  doc: InvoiceViewModel,
  opts?: { title?: string; text?: string },
): Promise<"shared" | "downloaded"> {
  const blob = await buildInvoicePdfBlob(doc);
  const filename = `${(doc.number || "invoice").replace(/[^\w.-]+/g, "_")}.pdf`;
  const file = new File([blob], filename, { type: "application/pdf" });

  const canShareFiles =
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] });

  if (canShareFiles && typeof navigator.share === "function") {
    await navigator.share({
      title: opts?.title || `Invoice ${doc.number || ""}`.trim(),
      text: opts?.text,
      files: [file],
    });
    return "shared";
  }

  await downloadInvoicePdf(doc, filename);
  return "downloaded";
}

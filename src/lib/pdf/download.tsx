"use client";

import type { InvoiceViewModel } from "@/templates/InvoicePreview";
import { buildInvoicePdfBlobFromPreview } from "@/lib/pdf/capture";
import { buildInvoicePdfBlobLegacy } from "@/lib/pdf/legacy";

export async function buildInvoicePdfBlob(
  doc: InvoiceViewModel,
): Promise<Blob> {
  try {
    return await buildInvoicePdfBlobFromPreview(doc);
  } catch {
    return buildInvoicePdfBlobLegacy(doc);
  }
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

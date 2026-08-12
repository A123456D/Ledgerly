"use client";

import { buildInvoicePdfBlob, downloadPdfBlob, pdfFilenameFor } from "@/lib/pdf/download";
import { formatMoney } from "@/lib/format";
import type { InvoiceViewModel } from "@/templates/InvoicePreview";

export type SendMethod = "email-api" | "mailto" | "download";

export interface SendInvoiceInput {
  doc: InvoiceViewModel;
  to: string;
  subject: string;
  message: string;
  fromName?: string;
  fromEmail?: string;
}

export interface SendInvoiceResult {
  method: SendMethod;
  detail: string;
}

export function defaultSendCopy(doc: InvoiceViewModel, fromName?: string) {
  const who = fromName || doc.business.name || "me";
  const total = formatMoney(doc.totals.total, doc.currency);
  const showDue =
    doc.visibility?.dueDate !== false && Boolean(doc.dueDate);
  return {
    to: doc.client.email || "",
    subject: `Invoice ${doc.number || ""} from ${who}`.trim(),
    message: [
      `Hi${doc.client.name ? ` ${doc.client.name.split(" ")[0]}` : ""},`,
      "",
      `Please find invoice ${doc.number || ""} attached.`,
      `Amount due: ${total}`,
      showDue ? `Due date: ${doc.dueDate}` : null,
      "",
      doc.visibility?.payment !== false && doc.paymentInstructions
        ? `Payment details:\n${doc.paymentInstructions}`
        : null,
      "",
      "Thank you,",
      who,
    ]
      .filter((line) => line !== null)
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  };
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function openMailtoWithPdfHint(
  to: string,
  subject: string,
  message: string,
  filename: string,
) {
  const mailto = `mailto:${encodeURIComponent(to.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
    `${message}\n\n(The PDF “${filename}” was downloaded — attach it before sending.)`,
  )}`;
  window.location.href = mailto;
}

function mailtoFallback(
  blob: Blob,
  filename: string,
  to: string,
  subject: string,
  message: string,
): SendInvoiceResult {
  downloadPdfBlob(blob, filename);
  openMailtoWithPdfHint(to, subject, message, filename);
  return {
    method: "mailto",
    detail: `PDF downloaded and your email app opened. Attach “${filename}” before sending.`,
  };
}

/** Static Skitz embed has no /api — skip the dead POST that returns 405. */
function isStaticHostWithoutEmailApi() {
  return Boolean(process.env.NEXT_PUBLIC_BASE_PATH);
}

/**
 * Email send path — does NOT call navigator.share after PDF build
 * (share must stay on a direct user tap; see Send modal WhatsApp flow).
 *
 * On Skitz / static hosts there is no Resend API, so we download the PDF and
 * open the device mail app (mailto cannot attach files).
 */
export async function sendInvoice(
  input: SendInvoiceInput,
): Promise<SendInvoiceResult> {
  const { doc, to, subject, message, fromName, fromEmail } = input;
  if (!to.trim() || !to.includes("@")) {
    throw new Error("Enter a valid recipient email");
  }

  const blob = await buildInvoicePdfBlob(doc);
  const filename = pdfFilenameFor(doc);

  if (isStaticHostWithoutEmailApi()) {
    return mailtoFallback(blob, filename, to, subject, message);
  }

  const pdfBase64 = await blobToBase64(blob);
  let res: Response;
  try {
    res = await fetch("/api/send-invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: to.trim(),
        subject,
        message,
        fromName,
        fromEmail,
        filename,
        pdfBase64,
        invoiceNumber: doc.number,
      }),
    });
  } catch {
    return mailtoFallback(blob, filename, to, subject, message);
  }

  if (res.ok) {
    return {
      method: "email-api",
      detail: "Email sent with PDF attached.",
    };
  }

  // No API / not configured (Cloudflare static often returns 405 on POST)
  if (
    res.status === 503 ||
    res.status === 404 ||
    res.status === 405 ||
    res.status === 501
  ) {
    return mailtoFallback(blob, filename, to, subject, message);
  }

  const err = (await res.json().catch(() => null)) as { error?: string } | null;
  downloadPdfBlob(blob, filename);
  throw new Error(
    err?.error ||
      `Email send failed — PDF “${filename}” was downloaded so you can still send it.`,
  );
}

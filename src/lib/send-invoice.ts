"use client";

import { buildInvoicePdfBlob } from "@/lib/pdf/download";
import { formatMoney } from "@/lib/format";
import type { InvoiceViewModel } from "@/templates/InvoicePreview";

export type SendMethod = "share" | "email-api" | "mailto";

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

function pdfFilename(doc: InvoiceViewModel) {
  return `${(doc.number || "invoice").replace(/[^\w.-]+/g, "_")}.pdf`;
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

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function sendInvoice(
  input: SendInvoiceInput,
): Promise<SendInvoiceResult> {
  const { doc, to, subject, message, fromName, fromEmail } = input;
  if (!to.trim() || !to.includes("@")) {
    throw new Error("Enter a valid recipient email");
  }

  const blob = await buildInvoicePdfBlob(doc);
  const filename = pdfFilename(doc);
  const file = new File([blob], filename, { type: "application/pdf" });

  const canShareFiles =
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] });

  if (canShareFiles && typeof navigator.share === "function") {
    try {
      await navigator.share({
        title: subject,
        text: message,
        files: [file],
      });
      return {
        method: "share",
        detail:
          "Opened your share sheet with the PDF attached — pick Mail / Outlook / Gmail.",
      };
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new Error("Send cancelled");
      }
    }
  }

  const pdfBase64 = await blobToBase64(blob);
  const res = await fetch("/api/send-invoice", {
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

  if (res.ok) {
    const data = (await res.json()) as { id?: string };
    return {
      method: "email-api",
      detail: data.id
        ? `Email sent with PDF attached.`
        : "Email sent with PDF attached.",
    };
  }

  if (res.status !== 503) {
    const err = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(err?.error || "Email send failed");
  }

  downloadBlob(blob, filename);
  const mailto = `mailto:${encodeURIComponent(to.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
    `${message}\n\n(The PDF “${filename}” was downloaded — attach it to this email before sending.)`,
  )}`;
  window.location.href = mailto;
  return {
    method: "mailto",
    detail: `PDF downloaded and your email app opened. Attach “${filename}” before sending.`,
  };
}

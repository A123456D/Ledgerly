import type { InvoiceViewModel } from "@/templates/InvoicePreview";
import { documentKind, isQuote } from "@/lib/document-kind";
import type { DocKind, InvoiceStatus } from "@/lib/types";

export const SHARE_PAYLOAD_VERSION = 1;
export const SHARE_TOKEN_BYTES = 16;
/** base64url of 16 bytes — 128-bit opaque capability. */
export const SHARE_TOKEN_LENGTH = 22;
export const SHARE_TOKEN_RE = /^[A-Za-z0-9_-]{22,43}$/;

export const COPY = {
  create: "Create link",
  creating: "Creating link…",
  copy: "Copy link",
  copied: "Link copied",
  open: "Open",
  refresh: "Refresh link",
  disable: "Disable link",
  update: "Update link",
  refreshConfirm: "Old link will stop working. Continue?",
  disableConfirm: "Clients with this link won’t be able to open it. Disable link?",
  draftInvoice: "Issue the invoice before creating a share link.",
  draftQuote: "Send the quote before creating a share link.",
  stale: "Document changed since this link was created.",
  helperNew: (noun: string) =>
    `Create a private web page for this ${noun}. Clients open it on any phone — no app.`,
  helperLive: "Anyone with the link can view and download the PDF.",
  emailWithLink:
    "We’ll include the link in your email. PDF still downloads so you can attach it.",
  emailNoLink:
    "PDF downloads separately — attach it before you send.",
  createFirst: "Create link first",
  voided: "This document is void.",
  unavailableTitle: "Link unavailable",
  unavailableBody: "This document link was disabled or never existed.",
  loadFail: "Couldn’t load this document. Try again later.",
  pdfFail: "Couldn’t prepare the PDF.",
  download: "Download PDF",
  powered: "Powered by EasyLedger",
  privacy:
    "This link is private — only share it with people who should see this document.",
} as const;

export interface PublicSharePayload {
  v: typeof SHARE_PAYLOAD_VERSION;
  kind: DocKind;
  status: InvoiceStatus;
  publishedAt: string;
  fingerprint: string;
  doc: InvoiceViewModel;
}

export function isShareToken(value: string): boolean {
  return SHARE_TOKEN_RE.test(value);
}

function bytesToBase64url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const b64 =
    typeof btoa === "function"
      ? btoa(bin)
      : Buffer.from(bytes).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

/** ≥128-bit unguessable token (16 random bytes, base64url). */
export function createShareToken(): string {
  const bytes = new Uint8Array(SHARE_TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  return bytesToBase64url(bytes);
}

export function appBasePath(): string {
  return (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
}

/**
 * Public URL path. Native Next uses `/v/{token}`.
 * Static SKITZ export only materializes `/v/`, so those builds use `?t=`.
 */
export function publicSharePath(token: string): string {
  const base = appBasePath();
  const encoded = encodeURIComponent(token);
  if (base) return `${base}/v/?t=${encoded}`;
  return `/v/${encoded}`;
}

export function publicShareUrl(token: string, origin = ""): string {
  const resolved =
    origin ||
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${resolved}${publicSharePath(token)}`;
}

export function shareApiPath(token: string): string {
  return `${appBasePath()}/api/share/${encodeURIComponent(token)}`;
}

export function canPublishShareLink(
  status: InvoiceStatus | string,
  kind?: DocKind | null,
): boolean {
  if (status === "void" || status === "draft") return false;
  if (isQuote(kind)) {
    return status === "issued" || status === "accepted" || status === "declined";
  }
  return status === "issued" || status === "partial" || status === "paid";
}

export function publishBlockedReason(
  status: InvoiceStatus | string,
  kind?: DocKind | null,
): string | null {
  if (status === "void") return COPY.voided;
  if (status === "draft") {
    return isQuote(kind) ? COPY.draftQuote : COPY.draftInvoice;
  }
  if (!canPublishShareLink(status, kind)) {
    return "This document cannot be shared.";
  }
  return null;
}

function fnv1a32(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** Stable hash of the published document — used to detect owner edits. */
export function shareFingerprint(
  doc: InvoiceViewModel,
  status: string,
): string {
  const logo =
    doc.logoDataUrl || doc.business.logoDataUrl || "";
  const canon = JSON.stringify({
    kind: documentKind(doc.kind),
    number: doc.number,
    status,
    issueDate: doc.issueDate,
    dueDate: doc.dueDate,
    currency: doc.currency,
    taxMode: doc.taxMode,
    client: doc.client,
    business: {
      name: doc.business.name,
      email: doc.business.email,
      phone: doc.business.phone,
      address: doc.business.address,
      city: doc.business.city,
      postalCode: doc.business.postalCode,
      country: doc.business.country,
      taxId: doc.business.taxId,
      accentColor: doc.business.accentColor,
      fontPair: doc.business.fontPair,
      logoLen: logo.length,
    },
    lineItems: doc.lineItems,
    totals: doc.totals,
    notes: doc.notes,
    paymentInstructions: doc.paymentInstructions,
    visibility: doc.visibility,
    templateId: doc.templateId,
    accentColor: doc.accentColor,
    logoSizePx: doc.logoSizePx,
    sectionAccents: doc.sectionAccents,
  });
  return fnv1a32(canon);
}

export function buildSharePayload(
  doc: InvoiceViewModel,
  status: InvoiceStatus,
  publishedAt = new Date().toISOString(),
): PublicSharePayload {
  return {
    v: SHARE_PAYLOAD_VERSION,
    kind: documentKind(doc.kind),
    status,
    publishedAt,
    fingerprint: shareFingerprint(doc, status),
    doc,
  };
}

export function isShareStale(
  fingerprint: string,
  doc: InvoiceViewModel,
  status: string,
): boolean {
  return fingerprint !== shareFingerprint(doc, status);
}

const VIEW_ONLINE_RE = /(?:^|\n)View online:\nhttps?:\/\/[^\s]+/;

export function viewOnlineBlock(url: string): string {
  return `View online:\n${url}`;
}

export function ensureViewOnlineMessage(message: string, url: string): string {
  if (!url) return message;
  if (message.includes(url)) return message;
  const block = viewOnlineBlock(url);
  if (VIEW_ONLINE_RE.test(message)) {
    return message.replace(VIEW_ONLINE_RE, block);
  }
  return `${message.trimEnd()}\n\n${block}`;
}

export function stripViewOnlineMessage(message: string): string {
  return message.replace(/\n*\nView online:\nhttps?:\/\/[^\s]+/g, "").trimEnd();
}

export function whatsappShareText(opts: {
  subject: string;
  message: string;
  url?: string | null;
  pdfName: string;
}): string {
  const parts = [opts.subject, "", opts.message];
  if (opts.url) {
    parts.push("", `View online: ${opts.url}`);
  }
  parts.push("", `(Attach the PDF “${opts.pdfName}” if it isn’t included.)`);
  return parts.join("\n");
}

export function truncateMiddle(value: string, max = 38): string {
  if (value.length <= max) return value;
  const inner = Math.max(1, max - 1);
  const head = Math.ceil(inner / 2);
  const tail = Math.floor(inner / 2);
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

/** Quiet client chip — Paid / Accepted only (skip Overdue / Sent noise). */
export function publicStatusChip(status: string): "Paid" | "Accepted" | null {
  if (status === "paid") return "Paid";
  if (status === "accepted") return "Accepted";
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function parseSharePayload(raw: unknown): PublicSharePayload | null {
  if (!isRecord(raw)) return null;
  if (raw.v !== SHARE_PAYLOAD_VERSION) return null;
  if (raw.kind !== "invoice" && raw.kind !== "quote") return null;
  if (typeof raw.status !== "string" || !raw.status) return null;
  if (typeof raw.publishedAt !== "string") return null;
  if (typeof raw.fingerprint !== "string") return null;
  if (!isRecord(raw.doc)) return null;
  const doc = raw.doc as unknown as InvoiceViewModel;
  if (typeof doc.number !== "string") return null;
  if (!isRecord(doc.business) || !isRecord(doc.totals)) return null;
  if (!Array.isArray(doc.lineItems)) return null;
  return {
    v: SHARE_PAYLOAD_VERSION,
    kind: raw.kind,
    status: raw.status as InvoiceStatus,
    publishedAt: raw.publishedAt,
    fingerprint: raw.fingerprint,
    doc,
  };
}

export function localShareKey(token: string): string {
  return `easyledger:share:${token}`;
}

export async function copyText(text: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const el = document.createElement("textarea");
  el.value = text;
  el.setAttribute("readonly", "");
  el.style.position = "fixed";
  el.style.left = "-9999px";
  document.body.appendChild(el);
  el.select();
  document.execCommand("copy");
  el.remove();
}

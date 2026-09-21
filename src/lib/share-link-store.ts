import { db } from "@/lib/db";
import type { ShareLinkRecord } from "@/lib/types";
import type { InvoiceStatus } from "@/lib/types";
import type { InvoiceViewModel } from "@/templates/InvoicePreview";
import {
  buildSharePayload,
  canPublishShareLink,
  createShareToken,
  isShareToken,
  localShareKey,
  parseSharePayload,
  publishBlockedReason,
  publicShareUrl,
  shareApiPath,
  type PublicSharePayload,
} from "@/lib/share-link";

const LS_INDEX = "easyledger:share-index";

function readLocal(token: string): PublicSharePayload | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return parseSharePayload(JSON.parse(localStorage.getItem(localShareKey(token)) || "null"));
  } catch {
    return null;
  }
}

function writeLocal(token: string, payload: PublicSharePayload | null) {
  if (typeof localStorage === "undefined") return;
  try {
    if (!payload) {
      localStorage.removeItem(localShareKey(token));
      const index = readIndex().filter((t) => t !== token);
      localStorage.setItem(LS_INDEX, JSON.stringify(index));
      return;
    }
    localStorage.setItem(localShareKey(token), JSON.stringify(payload));
    const index = readIndex();
    if (!index.includes(token)) {
      index.push(token);
      localStorage.setItem(LS_INDEX, JSON.stringify(index));
    }
  } catch {
    /* quota — IndexedDB still holds the snapshot */
  }
}

function readIndex(): string[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(LS_INDEX) || "[]");
    return Array.isArray(raw) ? raw.filter((t) => typeof t === "string") : [];
  } catch {
    return [];
  }
}

async function putRemote(token: string, payload: PublicSharePayload): Promise<void> {
  try {
    await fetch(shareApiPath(token), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    /* static host / offline — Dexie + localStorage still hold the snapshot */
  }
}

async function deleteRemote(token: string): Promise<void> {
  try {
    await fetch(shareApiPath(token), { method: "DELETE" });
  } catch {
    /* ignore */
  }
}

async function getRemote(token: string): Promise<PublicSharePayload | null | "error"> {
  try {
    const res = await fetch(shareApiPath(token), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (res.status === 404 || res.status === 405 || res.status === 501 || res.status === 503) {
      return null;
    }
    if (!res.ok) return "error";
    return parseSharePayload(await res.json());
  } catch (err) {
    if (err instanceof TypeError) return null;
    return "error";
  }
}

export async function getEnabledShareForInvoice(
  invoiceId: string,
): Promise<ShareLinkRecord | undefined> {
  const rows = await db.shareLinks.where("invoiceId").equals(invoiceId).toArray();
  return rows
    .filter((r) => r.enabled)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))[0];
}

export async function loadPublicShare(
  token: string,
): Promise<"unavailable" | { ok: true; payload: PublicSharePayload } | { ok: false; retryable: true }> {
  if (!isShareToken(token)) return "unavailable";

  const remote = await getRemote(token);
  if (remote && remote !== "error") return { ok: true, payload: remote };

  try {
    const row = await db.shareLinks.get(token);
    if (row?.enabled) {
      const parsed = parseSharePayload(row.payload);
      if (parsed) return { ok: true, payload: parsed };
    }
  } catch {
    if (remote === "error") return { ok: false, retryable: true };
  }

  const cached = readLocal(token);
  if (cached) return { ok: true, payload: cached };
  if (remote === "error") return { ok: false, retryable: true };
  return "unavailable";
}

async function persistRecord(record: ShareLinkRecord, payload: PublicSharePayload) {
  await db.shareLinks.put(record);
  writeLocal(record.token, payload);
  await putRemote(record.token, payload);
}

export async function createShareLink(
  invoiceId: string,
  doc: InvoiceViewModel,
  status: InvoiceStatus,
): Promise<{ record: ShareLinkRecord; url: string }> {
  const blocked = publishBlockedReason(status, doc.kind);
  if (blocked) throw new Error(blocked);
  if (!canPublishShareLink(status, doc.kind)) {
    throw new Error("This document cannot be shared.");
  }

  const existing = await getEnabledShareForInvoice(invoiceId);
  if (existing) {
    return { record: existing, url: publicShareUrl(existing.token) };
  }

  const token = createShareToken();
  const now = new Date().toISOString();
  const payload = buildSharePayload(doc, status, now);
  const record: ShareLinkRecord = {
    token,
    invoiceId,
    enabled: true,
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
    fingerprint: payload.fingerprint,
    payload,
  };
  await persistRecord(record, payload);
  return { record, url: publicShareUrl(token) };
}

/** Same URL, new frozen snapshot. */
export async function updateShareLink(
  invoiceId: string,
  doc: InvoiceViewModel,
  status: InvoiceStatus,
): Promise<{ record: ShareLinkRecord; url: string }> {
  const blocked = publishBlockedReason(status, doc.kind);
  if (blocked) throw new Error(blocked);
  const existing = await getEnabledShareForInvoice(invoiceId);
  if (!existing) return createShareLink(invoiceId, doc, status);

  const now = new Date().toISOString();
  const payload = buildSharePayload(doc, status, now);
  const record: ShareLinkRecord = {
    ...existing,
    updatedAt: now,
    publishedAt: now,
    fingerprint: payload.fingerprint,
    payload,
  };
  await persistRecord(record, payload);
  return { record, url: publicShareUrl(record.token) };
}

/** Rotate token — old URL dies. */
export async function refreshShareLink(
  invoiceId: string,
  doc: InvoiceViewModel,
  status: InvoiceStatus,
): Promise<{ record: ShareLinkRecord; url: string }> {
  const blocked = publishBlockedReason(status, doc.kind);
  if (blocked) throw new Error(blocked);
  await unpublishShareForInvoice(invoiceId);
  const token = createShareToken();
  const now = new Date().toISOString();
  const payload = buildSharePayload(doc, status, now);
  const record: ShareLinkRecord = {
    token,
    invoiceId,
    enabled: true,
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
    fingerprint: payload.fingerprint,
    payload,
  };
  await persistRecord(record, payload);
  return { record, url: publicShareUrl(token) };
}

export async function disableShareLink(token: string): Promise<void> {
  const row = await db.shareLinks.get(token);
  if (row) {
    await db.shareLinks.put({
      ...row,
      enabled: false,
      updatedAt: new Date().toISOString(),
    });
  }
  writeLocal(token, null);
  await deleteRemote(token);
}

export async function unpublishShareForInvoice(invoiceId: string): Promise<void> {
  const rows = await db.shareLinks.where("invoiceId").equals(invoiceId).toArray();
  const now = new Date().toISOString();
  for (const row of rows) {
    if (row.enabled) {
      await db.shareLinks.put({ ...row, enabled: false, updatedAt: now });
    }
    writeLocal(row.token, null);
    await deleteRemote(row.token);
  }
}

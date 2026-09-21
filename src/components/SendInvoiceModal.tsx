"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Field, inputClass } from "@/components/ui";
import { defaultSendCopy, sendInvoice } from "@/lib/send-invoice";
import {
  canSharePdfFile,
  downloadPdfBlob,
  openWhatsAppWithText,
  prepareInvoicePdfFile,
  sharePreparedPdfFile,
  supportsWebShare,
  whatsappPhoneDigits,
} from "@/lib/pdf/download";
import type { InvoiceViewModel } from "@/templates/InvoicePreview";
import { formatMoney } from "@/lib/format";
import { documentNounLower } from "@/lib/document-kind";
import type { InvoiceStatus, ShareLinkRecord } from "@/lib/types";
import {
  COPY,
  copyText,
  ensureViewOnlineMessage,
  isShareStale,
  publicShareUrl,
  publishBlockedReason,
  stripViewOnlineMessage,
  truncateMiddle,
  whatsappShareText,
} from "@/lib/share-link";
import {
  createShareLink,
  disableShareLink,
  getEnabledShareForInvoice,
  refreshShareLink,
  updateShareLink,
} from "@/lib/share-link-store";

export function SendInvoiceModal({
  open,
  onClose,
  doc,
  invoiceId,
  status,
  fromName,
  fromEmail,
  onSent,
  sarsErrors = [],
}: {
  open: boolean;
  onClose: () => void;
  doc: InvoiceViewModel;
  invoiceId: string;
  status: InvoiceStatus;
  fromName?: string;
  fromEmail?: string;
  onSent?: (info: { to: string }) => void;
  /** SARS send-gate errors; non-empty blocks sending. */
  sarsErrors?: string[];
}) {
  const defaults = defaultSendCopy(doc, fromName);
  const [to, setTo] = useState(defaults.to);
  const [subject, setSubject] = useState(defaults.subject);
  const [message, setMessage] = useState(defaults.message);
  const [waPhone, setWaPhone] = useState(doc.client.phone || "");
  const [busy, setBusy] = useState(false);
  const [prepBusy, setPrepBusy] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [copied, setCopied] = useState("");
  const [readyFile, setReadyFile] = useState<File | null>(null);
  const readyFileRef = useRef<File | null>(null);
  const copyBtnRef = useRef<HTMLButtonElement>(null);
  const [share, setShare] = useState<ShareLinkRecord | null>(null);
  const nounLower = documentNounLower(doc.kind);
  const sendTitle = `Send ${nounLower}`;
  const blockedPublish = publishBlockedReason(status, doc.kind);
  const sarsBlocked = sarsErrors.length > 0;
  const shareUrl = share?.enabled ? publicShareUrl(share.token) : "";
  const stale =
    share?.enabled && shareUrl
      ? isShareStale(share.fingerprint, doc, status)
      : false;

  useEffect(() => {
    if (!open) return;
    const next = defaultSendCopy(doc, fromName);
    // Reset fields when the dialog opens for a document (same pattern as before P0-4).
    /* eslint-disable react-hooks/set-state-in-effect -- modal open is an external event */
    setTo(next.to);
    setSubject(next.subject);
    setMessage(next.message);
    setWaPhone(doc.client.phone || "");
    setError("");
    setOk("");
    setCopied("");
    /* eslint-enable react-hooks/set-state-in-effect */
    readyFileRef.current = null;
    setReadyFile(null);
    setShare(null);

    let cancelled = false;
    void getEnabledShareForInvoice(invoiceId).then((row) => {
      if (cancelled || !row) return;
      setShare(row);
      setMessage(ensureViewOnlineMessage(next.message, publicShareUrl(row.token)));
    });

    setPrepBusy(true);
    void prepareInvoicePdfFile(doc)
      .then((file) => {
        if (cancelled) return;
        readyFileRef.current = file;
        setReadyFile(file);
        setOk(
          canSharePdfFile(file) || supportsWebShare()
            ? "PDF ready — tap WhatsApp below."
            : "PDF ready — tap WhatsApp to download & open chat.",
        );
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not prepare PDF");
      })
      .finally(() => {
        if (!cancelled) setPrepBusy(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, doc, fromName, invoiceId]);

  if (!open) return null;

  async function copyUrl(url: string) {
    await copyText(url);
    setCopied(COPY.copied);
  }

  async function onCreate() {
    if (sarsBlocked) return;
    setShareBusy(true);
    setError("");
    setCopied("");
    try {
      const result = await createShareLink(invoiceId, doc, status);
      setShare(result.record);
      setMessage((m) => ensureViewOnlineMessage(m, result.url));
      await copyUrl(result.url);
      copyBtnRef.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create link");
    } finally {
      setShareBusy(false);
    }
  }

  async function onUpdate() {
    setShareBusy(true);
    setError("");
    try {
      const result = await updateShareLink(invoiceId, doc, status);
      setShare(result.record);
      setMessage((m) => ensureViewOnlineMessage(m, result.url));
      setCopied("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update link");
    } finally {
      setShareBusy(false);
    }
  }

  async function onRefresh() {
    if (!confirm(COPY.refreshConfirm)) return;
    setShareBusy(true);
    setError("");
    try {
      const result = await refreshShareLink(invoiceId, doc, status);
      setShare(result.record);
      setMessage((m) => ensureViewOnlineMessage(m, result.url));
      setCopied("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not refresh link");
    } finally {
      setShareBusy(false);
    }
  }

  async function onDisable() {
    if (!share) return;
    if (!confirm(COPY.disableConfirm)) return;
    setShareBusy(true);
    setError("");
    try {
      await disableShareLink(share.token);
      setShare(null);
      setCopied("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not disable link");
    } finally {
      setShareBusy(false);
    }
  }

  async function onWhatsApp() {
    const file = readyFileRef.current;
    if (!file) {
      setError("Still preparing the PDF — wait a moment, then try again.");
      return;
    }
    setError("");
    setOk("");

    const phone = whatsappPhoneDigits(waPhone);
    const shareText = whatsappShareText({
      subject,
      message: stripViewOnlineMessage(message),
      url: shareUrl || null,
      pdfName: file.name,
    });

    try {
      const result = await sharePreparedPdfFile(file);
      if (result === "shared") {
        setOk("Share sheet opened — pick WhatsApp.");
        onSent?.({ to: phone || "whatsapp" });
        return;
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("Share cancelled");
        return;
      }
    }

    downloadPdfBlob(file, file.name);
    openWhatsAppWithText(shareText, phone || undefined);
    setOk(
      phone
        ? `PDF downloaded — WhatsApp opened for that number. Attach “${file.name}” if needed.`
        : `PDF downloaded — WhatsApp opened. Attach “${file.name}” in the chat.`,
    );
    onSent?.({ to: phone || "whatsapp" });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setOk("");
    try {
      const result = await sendInvoice({
        doc,
        to,
        subject,
        message: shareUrl ? ensureViewOnlineMessage(message, shareUrl) : message,
        fromName,
        fromEmail,
      });
      setOk(result.detail);
      onSent?.({ to: to.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setBusy(false);
    }
  }

  const waReady = Boolean(readyFile) && !prepBusy;
  const actionsDisabled = busy || shareBusy || sarsBlocked;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/50 p-[max(0.75rem,env(safe-area-inset-left))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:items-start sm:p-8"
      role="dialog"
      aria-modal
      aria-label={sendTitle}
      onClick={onClose}
    >
      <form
        className="relative mt-auto max-h-[min(100dvh-2rem,100%)] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-[var(--panel)] p-4 shadow-xl sm:mt-0 sm:rounded-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
        onSubmit={onSubmit}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
              {sendTitle}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {doc.number || "Draft"} ·{" "}
              {formatMoney(doc.totals.total, doc.currency)}
            </p>
          </div>
          <Button type="button" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>

        {sarsErrors.length > 0 ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-700">
              Tax Invoice — Send blocked
            </p>
            <ul className="space-y-0.5 text-xs text-red-700">
              {sarsErrors.map((err) => (
                <li key={err}>· {err}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mb-4 rounded-xl border border-[var(--line)] bg-[var(--wash)]/50 p-3">
          <p className="text-sm font-medium text-[var(--ink)]">Shareable link</p>
          {shareUrl ? (
            <>
              <div className="mt-2 flex items-center gap-1">
                <p
                  className="min-w-0 flex-1 rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2 font-mono text-xs text-[var(--ink)]"
                  title={shareUrl}
                >
                  {truncateMiddle(shareUrl, 36)}
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  className="shrink-0 px-2.5"
                  onClick={() => void copyUrl(shareUrl)}
                  disabled={shareBusy}
                >
                  Copy
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="shrink-0 px-2.5"
                  onClick={() => window.open(shareUrl, "_blank", "noopener,noreferrer")}
                >
                  {COPY.open}
                </Button>
              </div>
              {copied ? (
                <p className="mt-1 text-sm text-teal-800">{copied}</p>
              ) : (
                <p className="mt-1 text-xs text-[var(--muted)]">{COPY.helperLive}</p>
              )}
              {stale ? (
                <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 px-3 py-2">
                  <p className="flex-1 text-xs text-amber-900">{COPY.stale}</p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="shrink-0"
                    disabled={actionsDisabled}
                    onClick={() => void onUpdate()}
                  >
                    {COPY.update}
                  </Button>
                </div>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  ref={copyBtnRef}
                  type="button"
                  disabled={shareBusy}
                  onClick={() => void copyUrl(shareUrl)}
                >
                  {COPY.copy}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={actionsDisabled}
                  onClick={() => void onRefresh()}
                >
                  {COPY.refresh}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-red-700 hover:bg-red-50 hover:text-red-800"
                  disabled={shareBusy}
                  onClick={() => void onDisable()}
                >
                  {COPY.disable}
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {blockedPublish || COPY.helperNew(nounLower)}
              </p>
              <div className="mt-3">
                <Button
                  type="button"
                  disabled={Boolean(blockedPublish) || actionsDisabled}
                  onClick={() => void onCreate()}
                >
                  {shareBusy ? COPY.creating : COPY.create}
                </Button>
              </div>
            </>
          )}
        </div>

        <div className="mb-4 rounded-xl border border-[var(--line)] bg-[var(--wash)]/50 p-3">
          <p className="text-sm font-medium text-[var(--ink)]">WhatsApp</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            On phones, this opens the share sheet with the PDF. On desktop it
            downloads the PDF and opens WhatsApp — attach the file in the chat.
          </p>
          <Field label="WhatsApp number (optional, with country code)">
            <input
              className={inputClass + " mt-2"}
              inputMode="tel"
              value={waPhone}
              onChange={(e) => setWaPhone(e.target.value)}
              placeholder="27821234567"
            />
          </Field>
          <div className="mt-3">
            <Button
              type="button"
              disabled={!waReady || busy || sarsBlocked}
              onClick={() => void onWhatsApp()}
            >
              {prepBusy
                ? "Preparing PDF…"
                : waReady
                  ? "Send via WhatsApp"
                  : "Preparing…"}
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
            Or email
          </p>
          <p className="text-xs text-[var(--muted)]">
            {shareUrl ? COPY.emailWithLink : COPY.emailNoLink}
          </p>
          {!shareUrl && !blockedPublish ? (
            <button
              type="button"
              className="text-xs font-medium text-[var(--accent)] underline-offset-2 hover:underline"
              disabled={actionsDisabled}
              onClick={() => void onCreate()}
            >
              {COPY.createFirst}
            </button>
          ) : null}
          <Field label="To">
            <input
              className={inputClass}
              type="email"
              required
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="client@company.com"
            />
          </Field>
          <Field label="Subject">
            <input
              className={inputClass}
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </Field>
          <Field label="Message">
            <textarea
              className={inputClass}
              rows={8}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </Field>
        </div>

        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
        {ok ? <p className="mt-3 text-sm text-teal-800">{ok}</p> : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <Button type="submit" disabled={busy || prepBusy || sarsBlocked}>
            {busy ? "Preparing…" : "Open email + PDF"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

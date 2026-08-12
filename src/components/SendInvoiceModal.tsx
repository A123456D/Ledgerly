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

export function SendInvoiceModal({
  open,
  onClose,
  doc,
  fromName,
  fromEmail,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  doc: InvoiceViewModel;
  fromName?: string;
  fromEmail?: string;
  onSent?: (info: { to: string }) => void;
}) {
  const defaults = defaultSendCopy(doc, fromName);
  const [to, setTo] = useState(defaults.to);
  const [subject, setSubject] = useState(defaults.subject);
  const [message, setMessage] = useState(defaults.message);
  const [waPhone, setWaPhone] = useState(doc.client.phone || "");
  const [busy, setBusy] = useState(false);
  const [prepBusy, setPrepBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [readyFile, setReadyFile] = useState<File | null>(null);
  const readyFileRef = useRef<File | null>(null);

  useEffect(() => {
    if (!open) return;
    const next = defaultSendCopy(doc, fromName);
    setTo(next.to);
    setSubject(next.subject);
    setMessage(next.message);
    setWaPhone(doc.client.phone || "");
    setError("");
    setOk("");
    readyFileRef.current = null;
    setReadyFile(null);

    let cancelled = false;
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
  }, [open, doc, fromName]);

  if (!open) return null;

  async function onWhatsApp() {
    const file = readyFileRef.current;
    if (!file) {
      setError("Still preparing the PDF — wait a moment, then try again.");
      return;
    }
    setError("");
    setOk("");

    const phone = whatsappPhoneDigits(waPhone);
    const shareText = [
      subject,
      "",
      message,
      "",
      `(Attach the PDF “${file.name}” if it isn’t included.)`,
    ].join("\n");

    // 1) System share sheet with PDF (mobile Chrome / Safari / installed PWA)
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

    // 2) Fallback: download PDF + open WhatsApp with the message
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
        message,
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-8"
      role="dialog"
      aria-modal
      aria-label="Send invoice"
      onClick={onClose}
    >
      <form
        className="relative w-full max-w-lg rounded-2xl bg-[var(--panel)] p-5 shadow-xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
        onSubmit={onSubmit}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
              Send invoice
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
              disabled={!waReady || busy}
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
            Opens your mail app with this message. The PDF downloads separately —
            attach it before you send.
          </p>
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
          <Button type="submit" disabled={busy || prepBusy}>
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

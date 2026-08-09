"use client";

import { useEffect, useState } from "react";
import { Button, Field, inputClass } from "@/components/ui";
import { defaultSendCopy, sendInvoice } from "@/lib/send-invoice";
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    if (!open) return;
    const next = defaultSendCopy(doc, fromName);
    setTo(next.to);
    setSubject(next.subject);
    setMessage(next.message);
    setError("");
    setOk("");
  }, [open, doc, fromName]);

  if (!open) return null;

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
              {formatMoney(doc.totals.total, doc.currency)} — PDF attaches
              automatically when your device supports it.
            </p>
          </div>
          <Button type="button" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="space-y-3">
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
          <Button type="submit" disabled={busy}>
            {busy ? "Preparing…" : "Send with PDF"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
        </div>
        <p className="mt-3 text-xs text-[var(--muted)]">
          Uses your share sheet when available. Optional: set{" "}
          <code className="rounded bg-[var(--wash)] px-1">RESEND_API_KEY</code> +{" "}
          <code className="rounded bg-[var(--wash)] px-1">RESEND_FROM_EMAIL</code>{" "}
          for one-click email from the server.
        </p>
      </form>
    </div>
  );
}

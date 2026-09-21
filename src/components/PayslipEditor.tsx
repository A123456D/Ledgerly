"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { db, getBusiness } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { resolveLogoDataUrl } from "@/lib/logos";
import { clientToEmployee, emptyPayLine } from "@/lib/payslip";
import {
  deleteDraftPayslip,
  duplicatePayslip,
  issuePayslip,
  peekPayslipNumber,
  recomputePayslip,
  savePayslip,
  voidPayslip,
} from "@/lib/payslip-service";
import { downloadPdfBlob } from "@/lib/pdf/download";
import { buildPayslipPdfBlobFromPreview } from "@/lib/pdf/capture";
import type { PayLine, Payslip } from "@/lib/types";
import { BrandLookControls } from "@/components/BrandLookControls";
import { InvoiceStage } from "@/components/InvoiceStage";
import { Button, DecimalInput, Field, StatusPill, inputClass } from "@/components/ui";
import { PayslipPreview } from "@/templates/PayslipPreview";

export function PayslipEditor({ id }: { id: string }) {
  const router = useRouter();
  const stored = useLiveQuery(() => db.payslips.get(id), [id]);
  const business = useLiveQuery(() => getBusiness(), []);
  const clients = useLiveQuery(() => db.clients.orderBy("name").toArray(), []);
  const [slip, setSlip] = useState<Payslip | null>(null);
  const slipRef = useRef<Payslip | null>(null);
  const [peek, setPeek] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const dirtyRef = useRef(false);
  slipRef.current = slip;

  useEffect(() => {
    if (!stored) {
      if (stored === null) setSlip(null);
      return;
    }
    setSlip((current) => {
      if (!current || current.id !== stored.id) return stored;
      if (stored.status !== "draft" || current.status !== "draft") return stored;
      if (dirtyRef.current) return current;
      return stored;
    });
  }, [stored]);

  useEffect(() => {
    if (slip?.status === "draft") {
      void peekPayslipNumber().then(setPeek);
    }
  }, [slip?.status]);

  useEffect(() => {
    if (!slip || slip.status !== "draft" || !dirtyRef.current) return;
    const handle = window.setTimeout(() => {
      const latest = slipRef.current;
      if (!latest || latest.status !== "draft") return;
      dirtyRef.current = false;
      void savePayslip(latest).catch((err) => {
        dirtyRef.current = true;
        setError(err instanceof Error ? err.message : "Save failed");
      });
    }, 280);
    return () => window.clearTimeout(handle);
  }, [slip]);

  if (stored === undefined && !slip) {
    return <p className="text-sm text-[var(--muted)]">Loading…</p>;
  }
  if (!slip) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Payslip not found.{" "}
        <Link href="/payslips" className="underline">
          Back to payslips
        </Link>
      </p>
    );
  }

  const locked = slip.status !== "draft";
  const logoDataUrl = business
    ? resolveLogoDataUrl(business, slip.logoId)
    : undefined;

  function markDraft(next: Payslip): Payslip {
    dirtyRef.current = true;
    return next;
  }

  function patch(partial: Partial<Payslip>) {
    setSlip((current) => {
      if (!current || current.status !== "draft") return current;
      return markDraft(
        recomputePayslip({
          ...current,
          ...partial,
          updatedAt: new Date().toISOString(),
        }),
      );
    });
  }

  function patchEmployee(field: keyof Payslip["employee"], value: string) {
    setSlip((current) => {
      if (!current || current.status !== "draft") return current;
      return markDraft(
        recomputePayslip({
          ...current,
          employee: { ...current.employee, [field]: value },
          updatedAt: new Date().toISOString(),
        }),
      );
    });
  }

  function patchLine(
    key: "earnings" | "deductions",
    lineId: string,
    update: Partial<PayLine>,
  ) {
    setSlip((current) => {
      if (!current || current.status !== "draft") return current;
      return markDraft(
        recomputePayslip({
          ...current,
          [key]: current[key].map((line) =>
            line.id === lineId ? { ...line, ...update } : line,
          ),
          updatedAt: new Date().toISOString(),
        }),
      );
    });
  }

  function addLine(key: "earnings" | "deductions") {
    setSlip((current) => {
      if (!current || current.status !== "draft") return current;
      return markDraft(
        recomputePayslip({
          ...current,
          [key]: [...current[key], emptyPayLine()],
          updatedAt: new Date().toISOString(),
        }),
      );
    });
  }

  function removeLine(key: "earnings" | "deductions", lineId: string) {
    setSlip((current) => {
      if (!current || current.status !== "draft") return current;
      if (current[key].length <= 1) return current;
      return markDraft(
        recomputePayslip({
          ...current,
          [key]: current[key].filter((line) => line.id !== lineId),
          updatedAt: new Date().toISOString(),
        }),
      );
    });
  }

  async function onIssue() {
    const current = slipRef.current;
    if (!current) return;
    setBusy(true);
    setError("");
    try {
      await savePayslip(current);
      dirtyRef.current = false;
      const issued = await issuePayslip(current.id);
      setSlip(issued);
      setMessage(`Payslip issued as ${issued.number} — number is locked.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not issue");
    } finally {
      setBusy(false);
    }
  }

  async function onPdf() {
    const current = slipRef.current;
    if (!current) return;
    setBusy(true);
    setError("");
    try {
      if (current.status === "draft") {
        await savePayslip(current);
        dirtyRef.current = false;
      }
      document
        .querySelector("[data-invoice-preview-root]")
        ?.scrollIntoView({ block: "nearest" });
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      const blob = await buildPayslipPdfBlobFromPreview();
      downloadPdfBlob(
        blob,
        `${(current.number || "payslip").replace(/[^\w.-]+/g, "_")}.pdf`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDuplicate() {
    const current = slipRef.current;
    if (!current) return;
    setBusy(true);
    try {
      const copy = await duplicatePayslip(current.id);
      router.push(`/payslip?id=${copy.id}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-w-0">
      <div className="mb-4 flex flex-col gap-3">
        <div>
          <Link href="/payslips" className="text-xs text-[var(--muted)] hover:underline">
            ← All payslips
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="min-w-0 break-all font-[family-name:var(--font-display)] text-xl text-[var(--ink)] sm:text-3xl">
              {slip.number || "Draft"}
            </h1>
            <StatusPill status={slip.status} />
          </div>
          {slip.status === "draft" && peek ? (
            <p className="mt-1 text-xs text-[var(--muted)]">
              Next number {peek} when issued
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {!locked ? (
            <>
              <Button className="shrink-0" onClick={onIssue} disabled={busy}>
                Issue
              </Button>
              <Button
                variant="danger"
                className="shrink-0"
                disabled={busy}
                onClick={() => {
                  if (!confirm("Delete this draft?")) return;
                  void deleteDraftPayslip(slip.id).then(() => router.push("/payslips"));
                }}
              >
                Delete
              </Button>
            </>
          ) : slip.status !== "void" ? (
            <Button
              variant="danger"
              className="shrink-0"
              disabled={busy}
              onClick={() => void voidPayslip(slip.id)}
            >
              Void
            </Button>
          ) : null}
          <Button variant="secondary" className="shrink-0" onClick={() => void onPdf()} disabled={busy}>
            PDF
          </Button>
          <Button variant="ghost" className="shrink-0" onClick={() => void onDuplicate()} disabled={busy}>
            Duplicate
          </Button>
        </div>
        <a
          href="#live-preview"
          className="w-fit text-xs text-[var(--muted)] underline-offset-2 hover:underline lg:hidden"
        >
          Jump to live preview
        </a>
      </div>

      {(message || error) && (
        <p className={`mb-4 text-sm ${error ? "text-red-700" : "text-teal-800"}`}>
          {error || message}
        </p>
      )}

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start">
        <div className="min-w-0 space-y-4 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3 sm:p-5">
          <fieldset disabled={locked} className="min-w-0 space-y-4 disabled:opacity-70">
            {clients && clients.length > 0 ? (
              <Field label="Employee from clients">
                <select
                  className={inputClass}
                  value={slip.clientId || ""}
                  onChange={(e) => {
                    const client = clients.find((c) => c.id === e.target.value);
                    if (!client) {
                      patch({ clientId: null });
                      return;
                    }
                    patch({
                      clientId: client.id,
                      employee: clientToEmployee(client),
                    });
                  }}
                >
                  <option value="">Custom / one-off</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Employee name">
                <input
                  className={inputClass}
                  value={slip.employee.name}
                  onChange={(e) => patchEmployee("name", e.target.value)}
                />
              </Field>
              <Field label="Job title">
                <input
                  className={inputClass}
                  value={slip.employee.jobTitle}
                  onChange={(e) => patchEmployee("jobTitle", e.target.value)}
                />
              </Field>
              <Field label="Employee no.">
                <input
                  className={inputClass}
                  value={slip.employee.employeeNumber}
                  onChange={(e) => patchEmployee("employeeNumber", e.target.value)}
                />
              </Field>
              <Field label="Tax ID">
                <input
                  className={inputClass}
                  value={slip.employee.taxId}
                  onChange={(e) => patchEmployee("taxId", e.target.value)}
                />
              </Field>
              <Field label="Email">
                <input
                  className={inputClass}
                  type="email"
                  value={slip.employee.email}
                  onChange={(e) => patchEmployee("email", e.target.value)}
                />
              </Field>
              <Field label="Address">
                <input
                  className={inputClass}
                  value={slip.employee.address}
                  onChange={(e) => patchEmployee("address", e.target.value)}
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Period start">
                <input
                  className={inputClass}
                  type="date"
                  value={slip.periodStart}
                  onChange={(e) => patch({ periodStart: e.target.value })}
                />
              </Field>
              <Field label="Period end">
                <input
                  className={inputClass}
                  type="date"
                  value={slip.periodEnd}
                  onChange={(e) => patch({ periodEnd: e.target.value })}
                />
              </Field>
              <Field label="Pay date">
                <input
                  className={inputClass}
                  type="date"
                  value={slip.payDate}
                  onChange={(e) => patch({ payDate: e.target.value })}
                />
              </Field>
            </div>

            <PayLinesEditor
              title="Earnings"
              lines={slip.earnings}
              currency={slip.currency}
              onChange={(lineId, update) => patchLine("earnings", lineId, update)}
              onAdd={() => addLine("earnings")}
              onRemove={(lineId) => removeLine("earnings", lineId)}
            />
            <PayLinesEditor
              title="Deductions"
              lines={slip.deductions}
              currency={slip.currency}
              onChange={(lineId, update) =>
                patchLine("deductions", lineId, update)
              }
              onAdd={() => addLine("deductions")}
              onRemove={(lineId) => removeLine("deductions", lineId)}
            />

            <div className="rounded-lg border border-[var(--line)] bg-[var(--wash)]/50 px-3 py-3 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-[var(--muted)]">Gross</span>
                <span className="tabular-nums">
                  {formatMoney(slip.totals.gross, slip.currency)}
                </span>
              </div>
              <div className="mt-1 flex justify-between gap-2">
                <span className="text-[var(--muted)]">Deductions</span>
                <span className="tabular-nums">
                  {formatMoney(slip.totals.deductionTotal, slip.currency)}
                </span>
              </div>
              <div className="mt-2 flex justify-between gap-2 font-semibold">
                <span>Net pay</span>
                <span className="tabular-nums">
                  {formatMoney(slip.totals.net, slip.currency)}
                </span>
              </div>
              {slip.totals.net < 0 ? (
                <p className="mt-2 text-xs text-red-700">
                  Deductions are higher than gross — net pay is negative.
                </p>
              ) : null}
            </div>

            <Field label="Notes">
              <textarea
                className={inputClass}
                rows={2}
                value={slip.notes}
                onChange={(e) => patch({ notes: e.target.value })}
              />
            </Field>

            {business ? (
              <BrandLookControls
                accentColor={slip.accentColor}
                fontPair={slip.fontPair}
                onAccentChange={(accentColor) => patch({ accentColor })}
                onFontChange={(fontPair) => patch({ fontPair })}
              />
            ) : null}
          </fieldset>
        </div>

        <div
          id="live-preview"
          className="relative min-w-0 scroll-mt-[calc(var(--nav-h)+0.75rem)]"
        >
          <p className="mb-2 text-xs uppercase tracking-wider text-[var(--muted)]">
            Live A4 preview
          </p>
          <div
            data-invoice-preview-root="true"
            className="min-w-0 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--wash)] p-3 sm:p-5"
          >
            {business ? (
              <InvoiceStage maxScale={1} minScale={0.2}>
                <PayslipPreview
                  slip={slip}
                  business={business}
                  logoDataUrl={logoDataUrl}
                />
              </InvoiceStage>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function PayLinesEditor({
  title,
  lines,
  currency,
  onChange,
  onAdd,
  onRemove,
}: {
  title: string;
  lines: PayLine[];
  currency: string;
  onChange: (id: string, patch: Partial<PayLine>) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--line)]">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] px-3 py-2.5">
        <p className="text-sm font-medium">{title}</p>
        <Button type="button" variant="secondary" onClick={onAdd}>
          Add line
        </Button>
      </div>
      <div className="divide-y divide-[var(--line)]">
        {lines.map((line) => (
          <div key={line.id} className="grid grid-cols-1 gap-2 p-3 min-[400px]:grid-cols-[1fr_7rem_auto]">
            <input
              className={inputClass}
              placeholder="Description"
              value={line.label}
              onChange={(e) => onChange(line.id, { label: e.target.value })}
            />
            <DecimalInput
              value={line.amount}
              align="right"
              onChange={(amount) => onChange(line.id, { amount })}
            />
            <button
              type="button"
              className="min-h-11 text-xs text-red-700 underline sm:min-h-0"
              disabled={lines.length <= 1}
              onClick={() => onRemove(line.id)}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <p className="px-3 py-2 text-right text-xs text-[var(--muted)]">
        Amounts in {currency}
      </p>
    </div>
  );
}

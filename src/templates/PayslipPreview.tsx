"use client";

import type { CSSProperties } from "react";
import { formatDate, formatMoney } from "@/lib/format";
import { fontPairCssVars } from "@/lib/fonts";
import type { Business, Payslip } from "@/lib/types";

export function PayslipPreview({
  slip,
  business,
  logoDataUrl,
}: {
  slip: Payslip;
  business: Business;
  logoDataUrl?: string;
}) {
  const accent = slip.accentColor || business.accentColor || "#0f766e";
  const vars = fontPairCssVars(slip.fontPair || business.fontPair) as CSSProperties;

  return (
    <div
      data-invoice-sheet="true"
      className="invoice-sheet invoice-gpu-layer bg-white text-[var(--ink)]"
      style={vars}
    >
      <div className="flex items-start justify-between gap-6">
        <div className="flex min-w-0 items-start gap-4">
          {logoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoDataUrl}
              alt=""
              className="h-14 w-14 rounded-md object-contain"
            />
          ) : null}
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
              Employer
            </p>
            <p className="font-[family-name:var(--font-display)] text-2xl leading-tight">
              {business.name || "Your business"}
            </p>
            <p className="mt-1 whitespace-pre-line text-[12px] text-[var(--muted)]">
              {[
                business.address,
                [business.city, business.postalCode].filter(Boolean).join(" "),
                business.country,
                business.taxId ? `Tax ID ${business.taxId}` : "",
              ]
                .filter(Boolean)
                .join("\n")}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p
            className="font-[family-name:var(--font-display)] text-3xl"
            style={{ color: accent }}
          >
            Payslip
          </p>
          <p className="mt-1 text-[12px] tabular-nums text-[var(--muted)]">
            {slip.number || "Draft"}
          </p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-6 text-[13px]">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
            Employee
          </p>
          <p className="mt-1 font-semibold">{slip.employee.name || "—"}</p>
          <p className="text-[var(--muted)]">{slip.employee.jobTitle}</p>
          {slip.employee.employeeNumber ? (
            <p className="text-[var(--muted)]">No. {slip.employee.employeeNumber}</p>
          ) : null}
          {slip.employee.taxId ? (
            <p className="text-[var(--muted)]">Tax ID {slip.employee.taxId}</p>
          ) : null}
          {slip.employee.email ? (
            <p className="text-[var(--muted)]">{slip.employee.email}</p>
          ) : null}
          {slip.employee.address ? (
            <p className="mt-1 text-[var(--muted)]">{slip.employee.address}</p>
          ) : null}
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
            Pay period
          </p>
          <p className="mt-1 tabular-nums">
            {formatDate(slip.periodStart)} – {formatDate(slip.periodEnd)}
          </p>
          <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
            Pay date
          </p>
          <p className="tabular-nums">{formatDate(slip.payDate)}</p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-8">
        <PayTable
          title="Earnings"
          lines={slip.earnings}
          currency={slip.currency}
          totalLabel="Gross pay"
          total={slip.totals.gross}
          accent={accent}
        />
        <PayTable
          title="Deductions"
          lines={slip.deductions}
          currency={slip.currency}
          totalLabel="Total deductions"
          total={slip.totals.deductionTotal}
          accent={accent}
        />
      </div>

      <div
        className="mt-8 flex items-center justify-between rounded-2xl px-5 py-4 text-white"
        style={{ background: accent }}
      >
        <span className="text-[11px] font-bold uppercase tracking-[0.16em]">
          Net pay
        </span>
        <span className="font-[family-name:var(--font-display)] text-3xl tabular-nums">
          {formatMoney(slip.totals.net, slip.currency)}
        </span>
      </div>

      {slip.notes.trim() ? (
        <div className="mt-8 border-t border-black/10 pt-5 text-[12px]">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
            Notes
          </p>
          <p className="mt-1 whitespace-pre-wrap text-[var(--ink)]">{slip.notes}</p>
        </div>
      ) : null}

      <p className="mt-10 text-[10px] text-[var(--muted)]">
        This payslip is an estimate for your records. Tax and statutory amounts
        are entered by you — they are not a payroll filing.
      </p>
    </div>
  );
}

function PayTable({
  title,
  lines,
  currency,
  totalLabel,
  total,
  accent,
}: {
  title: string;
  lines: { id: string; label: string; amount: number }[];
  currency: string;
  totalLabel: string;
  total: number;
  accent: string;
}) {
  const rows = lines.filter((l) => l.label.trim() || l.amount);
  return (
    <div>
      <p
        className="text-[10px] font-bold uppercase tracking-[0.14em]"
        style={{ color: accent }}
      >
        {title}
      </p>
      <table className="mt-2 w-full text-[13px]">
        <tbody>
          {rows.length ? (
            rows.map((line) => (
              <tr key={line.id} className="border-b border-black/8">
                <td className="py-2 pr-2">{line.label || "—"}</td>
                <td className="py-2 text-right tabular-nums">
                  {formatMoney(line.amount, currency)}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td className="py-2 text-[var(--muted)]">None</td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr className="font-semibold">
            <td className="pt-3">{totalLabel}</td>
            <td className="pt-3 text-right tabular-nums">
              {formatMoney(total, currency)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

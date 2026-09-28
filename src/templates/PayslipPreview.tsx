"use client";

import type { CSSProperties } from "react";
import { companyNumberLine, formatDate, formatMoney } from "@/lib/format";
import { DEFAULT_FONT_PAIR, fontPairCssVars, resolveFontPair } from "@/lib/fonts";
import { inkOn } from "@/lib/color";
import type { Business, PayLine, Payslip } from "@/lib/types";

/**
 * Payslip designs — a family of their own, independent of invoice templates:
 * modern (carded), classic (banded stub), minimal (swiss hairline).
 */

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
  const vars = fontPairCssVars(
    resolveFontPair(slip.fontPair || business.fontPair),
  ) as CSSProperties;

  const sheetClass =
    slip.templateId === "minimal"
      ? "bg-white text-[#111111]"
      : slip.templateId === "classic"
        ? "bg-[#fbfaf7] text-[#1c1917]"
        : "bg-white text-[var(--ink)]";

  return (
    <div
      data-invoice-sheet="true"
      className={`invoice-sheet invoice-gpu-layer ${sheetClass}`}
      style={vars}
    >
      <div data-invoice-content>
        {slip.templateId === "classic" ? (
          <ClassicPayslip slip={slip} business={business} logoDataUrl={logoDataUrl} accent={accent} />
        ) : slip.templateId === "minimal" ? (
          <MinimalPayslip slip={slip} business={business} logoDataUrl={logoDataUrl} accent={accent} />
        ) : (
          <ModernPayslip slip={slip} business={business} logoDataUrl={logoDataUrl} accent={accent} />
        )}
      </div>
    </div>
  );
}

function EmployerLines(business: Business): string[] {
  return [
    business.address,
    [business.city, business.postalCode].filter(Boolean).join(" "),
    business.country,
    companyNumberLine(business.companyNumber),
    business.taxId ? `Tax ID ${business.taxId}` : "",
  ].filter(Boolean);
}

function EmployerBlock({
  business,
  logoDataUrl,
  light,
}: {
  business: Business;
  logoDataUrl?: string;
  light?: boolean;
}) {
  return (
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
        <p
          className={`text-[11px] font-bold uppercase tracking-[0.16em] ${light ? "text-white/70" : "text-[var(--muted)]"}`}
        >
          Employer
        </p>
        <p className="font-[family-name:var(--font-display)] text-2xl leading-tight">
          {business.name || "Your business"}
        </p>
        <p
          className={`mt-1 whitespace-pre-line text-[12px] ${light ? "text-white/75" : "text-[var(--muted)]"}`}
        >
          {EmployerLines(business).join("\n")}
        </p>
      </div>
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
  variant = "modern",
}: {
  title: string;
  lines: PayLine[];
  currency: string;
  totalLabel: string;
  total: number;
  accent: string;
  variant?: "modern" | "classic" | "minimal";
}) {
  const rows = lines.filter((l) => l.label.trim() || l.amount);
  if (variant === "classic") {
    return (
      <div className="overflow-hidden rounded-lg border border-black/15">
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ background: `${accent}1a` }}>
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: accent }}>
                {title}
              </th>
              <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: accent }}>
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((line) => (
                <tr key={line.id} className="border-t border-black/10">
                  <td className="px-3 py-2">{line.label || "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatMoney(line.amount, currency)}
                  </td>
                </tr>
              ))
            ) : (
              <tr className="border-t border-black/10">
                <td className="px-3 py-2 text-[var(--muted)]">None</td>
                <td />
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-black/20 font-semibold">
              <td className="px-3 py-2">{totalLabel}</td>
              <td className="px-3 py-2 text-right tabular-nums">
                {formatMoney(total, currency)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  }
  return (
    <div>
      <p
        className="text-[10px] font-bold uppercase tracking-[0.14em]"
        style={{ color: variant === "minimal" ? "inherit" : accent }}
      >
        {title}
      </p>
      <table className="mt-2 w-full text-[13px]">
        <tbody>
          {rows.length ? (
            rows.map((line) => (
              <tr
                key={line.id}
                className={variant === "minimal" ? "border-b border-black/10" : "border-b border-black/8"}
              >
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

/* ── Modern: the original carded design, polished ── */
function ModernPayslip({
  slip,
  business,
  logoDataUrl,
  accent,
}: {
  slip: Payslip;
  business: Business;
  logoDataUrl?: string;
  accent: string;
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-6">
        <EmployerBlock business={business} logoDataUrl={logoDataUrl} />
        <div className="shrink-0 text-right">
          <p className="font-[family-name:var(--font-display)] text-3xl" style={{ color: accent }}>
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
        <PayTable title="Earnings" lines={slip.earnings} currency={slip.currency} totalLabel="Gross pay" total={slip.totals.gross} accent={accent} />
        <PayTable title="Deductions" lines={slip.deductions} currency={slip.currency} totalLabel="Total deductions" total={slip.totals.deductionTotal} accent={accent} />
      </div>

      <div
        className="mt-8 flex items-center justify-between rounded-2xl px-5 py-4"
        style={{ background: accent, color: inkOn(accent) }}
      >
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] opacity-80">
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

      <PayslipFootnote />
    </>
  );
}

/* ── Classic: banded pay-stub ── */
function ClassicPayslip({
  slip,
  business,
  logoDataUrl,
  accent,
}: {
  slip: Payslip;
  business: Business;
  logoDataUrl?: string;
  accent: string;
}) {
  const bandInk = inkOn(accent);
  return (
    <>
      <div
        className="-mx-[14mm] -mt-[14mm] flex items-start justify-between gap-6 px-[14mm] pb-5 pt-[14mm]"
        style={{ background: accent, color: bandInk }}
      >
        <EmployerBlock business={business} logoDataUrl={logoDataUrl} light />
        <div className="shrink-0 text-right">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] opacity-80">
            Payslip
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums">
            {slip.number || "Draft"}
          </p>
        </div>
      </div>

      <div className="mt-7 grid grid-cols-3 gap-4 rounded-lg border border-black/15 bg-white p-4 text-[12px]">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
            Employee
          </p>
          <p className="mt-0.5 font-semibold">{slip.employee.name || "—"}</p>
          <p className="text-[var(--muted)]">{slip.employee.jobTitle}</p>
          {slip.employee.employeeNumber ? (
            <p className="text-[var(--muted)]">No. {slip.employee.employeeNumber}</p>
          ) : null}
        </div>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
            Pay period
          </p>
          <p className="mt-0.5 tabular-nums">
            {formatDate(slip.periodStart)} – {formatDate(slip.periodEnd)}
          </p>
          {slip.employee.taxId ? (
            <p className="mt-1 text-[var(--muted)]">Tax ID {slip.employee.taxId}</p>
          ) : null}
        </div>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
            Paid on
          </p>
          <p className="mt-0.5 tabular-nums">{formatDate(slip.payDate)}</p>
          {slip.employee.email ? (
            <p className="mt-1 text-[var(--muted)]">{slip.employee.email}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-6">
        <PayTable variant="classic" title="Earnings" lines={slip.earnings} currency={slip.currency} totalLabel="Gross pay" total={slip.totals.gross} accent={accent} />
        <PayTable variant="classic" title="Deductions" lines={slip.deductions} currency={slip.currency} totalLabel="Total deductions" total={slip.totals.deductionTotal} accent={accent} />
      </div>

      <table className="mt-6 w-full overflow-hidden rounded-lg text-[14px]" style={{ background: accent, color: bandInk }}>
        <tbody>
          <tr>
            <td className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.16em] opacity-80">
              Net pay
            </td>
            <td className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-[0.16em] opacity-80">
              {formatMoney(slip.totals.gross, slip.currency)} −{" "}
              {formatMoney(slip.totals.deductionTotal, slip.currency)}
            </td>
            <td className="px-4 py-3 text-right font-[family-name:var(--font-display)] text-2xl font-bold tabular-nums">
              {formatMoney(slip.totals.net, slip.currency)}
            </td>
          </tr>
        </tbody>
      </table>

      {slip.notes.trim() ? (
        <div className="mt-7 border-t border-black/10 pt-4 text-[12px]">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
            Notes
          </p>
          <p className="mt-1 whitespace-pre-wrap">{slip.notes}</p>
        </div>
      ) : null}

      <PayslipFootnote />
    </>
  );
}

/* ── Minimal: swiss hairline ── */
function MinimalPayslip({
  slip,
  business,
  logoDataUrl,
  accent,
}: {
  slip: Payslip;
  business: Business;
  logoDataUrl?: string;
  accent: string;
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-6 border-b-2 border-black pb-8">
        <div>
          {logoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoDataUrl} alt="" className="mb-6 h-12 w-12 object-contain" />
          ) : null}
          <p className="text-[11px] uppercase tracking-[0.4em] text-neutral-400">
            {business.name || "Your business"}
          </p>
          <p className="mt-1 whitespace-pre-line text-[11px] leading-relaxed text-neutral-400">
            {EmployerLines(business).join("\n")}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-[0.4em] text-neutral-400">
            Payslip
          </p>
          <p className="mt-2 text-2xl font-light tabular-nums">{slip.number || "Draft"}</p>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-3 gap-8 text-[12px]">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">
            Employee
          </p>
          <p className="mt-1 font-semibold">{slip.employee.name || "—"}</p>
          <p className="text-neutral-500">{slip.employee.jobTitle}</p>
          {slip.employee.employeeNumber ? (
            <p className="text-neutral-500">No. {slip.employee.employeeNumber}</p>
          ) : null}
          {slip.employee.taxId ? (
            <p className="text-neutral-500">Tax ID {slip.employee.taxId}</p>
          ) : null}
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">
            Pay period
          </p>
          <p className="mt-1 tabular-nums">
            {formatDate(slip.periodStart)} – {formatDate(slip.periodEnd)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">
            Paid on
          </p>
          <p className="mt-1 tabular-nums">{formatDate(slip.payDate)}</p>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-2 gap-10">
        <PayTable variant="minimal" title="Earnings" lines={slip.earnings} currency={slip.currency} totalLabel="Gross pay" total={slip.totals.gross} accent={accent} />
        <PayTable variant="minimal" title="Deductions" lines={slip.deductions} currency={slip.currency} totalLabel="Total deductions" total={slip.totals.deductionTotal} accent={accent} />
      </div>

      <div className="ml-auto mt-10 w-64 border border-black p-4">
        <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
          Net pay
        </p>
        <p className="mt-1 text-3xl font-semibold tabular-nums">
          {formatMoney(slip.totals.net, slip.currency)}
        </p>
        <p className="mt-2 border-t border-black pt-2 text-[11px] tabular-nums text-neutral-500">
          {formatMoney(slip.totals.gross, slip.currency)} gross −{" "}
          {formatMoney(slip.totals.deductionTotal, slip.currency)} deductions
        </p>
      </div>

      {slip.notes.trim() ? (
        <div className="mt-10 border-t border-black/10 pt-5 text-[12px]">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">
            Notes
          </p>
          <p className="mt-1 whitespace-pre-wrap">{slip.notes}</p>
        </div>
      ) : null}

      <PayslipFootnote />
    </>
  );
}

function PayslipFootnote() {
  return (
    <p className="mt-10 text-[10px] text-[var(--muted)]">
      This payslip is an estimate for your records. Tax and statutory amounts
      are entered by you — they are not a payroll filing.
    </p>
  );
}

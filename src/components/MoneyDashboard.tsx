"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { Business, Invoice } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import {
  moneyStats,
  vatNotice,
  vatThresholdStatus,
  type MoneyStats,
} from "@/lib/money";

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
        {label}
      </p>
      <p
        className={`mt-1 font-[family-name:var(--font-display)] text-xl tabular-nums sm:text-2xl ${
          accent ? "text-[var(--accent)]" : "text-[var(--ink)]"
        }`}
      >
        {value}
      </p>
      {sub ? <p className="mt-0.5 text-xs text-[var(--muted)]">{sub}</p> : null}
    </div>
  );
}

const bannerToneClass: Record<string, string> = {
  alert: "border-red-200 bg-red-50/80 text-red-950",
  warn: "border-amber-200 bg-amber-50/80 text-amber-950",
  ok: "border-teal-200 bg-teal-50/80 text-teal-950",
  info: "border-[var(--line)] bg-[var(--wash)]/80 text-[var(--ink)]",
};

/** Four money numbers + VAT-threshold banner, shown on the invoices home. */
export function MoneyDashboard({
  documents,
  business,
}: {
  documents: Invoice[];
  business: Business | null | undefined;
}) {
  const stats: MoneyStats | null = useMemo(() => {
    if (!business) return null;
    return moneyStats(documents, { currency: business.currency });
  }, [documents, business]);

  if (!stats || !business) return null;
  const cur = business.currency;
  const vatLevel = vatThresholdStatus(stats.turnover12m, !!business.vatRegistered);
  const notice = vatNotice(vatLevel, stats.turnover12m);

  return (
    <section className="mb-5 space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <StatCard
          label="Outstanding"
          value={formatMoney(stats.outstanding, cur)}
          sub={
            stats.overdueCount > 0
              ? `${formatMoney(stats.overdueTotal, cur)} overdue (${stats.overdueCount})`
              : "Nothing overdue"
          }
          accent={stats.outstanding > 0}
        />
        <StatCard
          label="Received this month"
          value={formatMoney(stats.receivedThisMonth, cur)}
        />
        <StatCard
          label="Turnover (tax year)"
          value={formatMoney(stats.turnoverTaxYear, cur)}
          sub="Excl. VAT, issued invoices"
        />
        <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
            Tax season
          </p>
          <Link
            href="/expenses"
            className="mt-1 inline-flex items-center gap-1 font-[family-name:var(--font-display)] text-base text-[var(--accent)] hover:underline sm:text-lg"
          >
            Expenses &amp; tax
            <span aria-hidden>→</span>
          </Link>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Log costs, estimate tax
          </p>
          {stats.foreignCount > 0 ? (
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              {stats.foreignCount} invoice{stats.foreignCount === 1 ? "" : "s"} in
              other currencies not included
            </p>
          ) : null}
        </div>
      </div>

      {vatLevel !== "none" ? (
        <div className={`rounded-xl border px-4 py-3 text-sm ${bannerToneClass[notice.tone]}`}>
          <p className="font-medium">{notice.title}</p>
          <p className="mt-0.5 opacity-80">{notice.body}</p>
        </div>
      ) : null}
    </section>
  );
}

"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import {
  createDraftPayslip,
  deleteDraftPayslip,
  duplicatePayslip,
} from "@/lib/payslip-service";
import { Button, PageHeader, StatusPill } from "@/components/ui";

export function PayslipsPage() {
  const router = useRouter();
  const slips = useLiveQuery(
    () => db.payslips.orderBy("updatedAt").reverse().toArray(),
    [],
  );
  const business = useLiveQuery(() => db.business.get("default"), []);
  const [busy, setBusy] = useState(false);
  const needsSetup = business && !business.name.trim();

  async function onNew() {
    setBusy(true);
    try {
      const slip = await createDraftPayslip();
      router.push(`/payslip?id=${slip.id}`);
    } finally {
      setBusy(false);
    }
  }

  async function onDuplicateLast() {
    if (!slips?.length) return;
    setBusy(true);
    try {
      const copy = await duplicatePayslip(slips[0].id);
      router.push(`/payslip?id=${copy.id}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-w-0">
      <PageHeader
        title="Payslips"
        subtitle="Create a staff payslip, issue a number, and download a PDF. Tax lines are amounts you enter."
        actions={
          <>
            <Button
              variant="secondary"
              className="flex-1 sm:flex-none"
              onClick={() => void onDuplicateLast()}
              disabled={busy || !slips?.length}
            >
              Duplicate last
            </Button>
            <Button className="flex-1 sm:flex-none" onClick={() => void onNew()} disabled={busy}>
              New payslip
            </Button>
          </>
        }
      />

      {needsSetup ? (
        <div className="mb-6 rounded-xl border border-teal-200 bg-teal-50/80 px-4 py-3 text-sm text-teal-950">
          Set your business name so it prints as the employer.{" "}
          <Link href="/settings" className="font-medium underline">
            Open settings
          </Link>
        </div>
      ) : null}

      {!slips ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : slips.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--panel)]/60 px-4 py-12 text-center sm:px-6 sm:py-16">
          <p className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
            No payslips yet
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">
            Start a draft, enter earnings and deductions, then issue to lock the number.
          </p>
          <Button className="mt-6" onClick={() => void onNew()} disabled={busy}>
            Create your first payslip
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {slips.map((slip) => (
            <div
              key={slip.id}
              className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/payslip?id=${slip.id}`}
                    className="block truncate font-medium text-[var(--ink)] underline-offset-2 hover:underline"
                  >
                    {slip.number || "Draft"}
                  </Link>
                  <p className="mt-0.5 truncate text-sm text-[var(--muted)]">
                    {slip.employee.name || "No employee"} · {formatDate(slip.periodStart)} –{" "}
                    {formatDate(slip.periodEnd)}
                  </p>
                </div>
                <StatusPill status={slip.status} />
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 text-sm">
                <span className="text-[var(--muted)]">Net</span>
                <span className="tabular-nums font-medium">
                  {formatMoney(slip.totals.net, slip.currency)}
                </span>
              </div>
              {slip.status === "draft" ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-2 w-full text-red-700 hover:bg-red-50 hover:text-red-800"
                  disabled={busy}
                  onClick={() => {
                    if (!confirm("Delete this draft?")) return;
                    void deleteDraftPayslip(slip.id);
                  }}
                >
                  Delete draft
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

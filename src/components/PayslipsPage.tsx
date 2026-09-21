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
import { Button, ButtonLink, PageHeader } from "@/components/ui";
import { DocumentListItem } from "@/components/DocumentListItem";
import { documentListTitle } from "@/lib/document-kind";

export function PayslipsPage() {
  const router = useRouter();
  const slips = useLiveQuery(
    () => db.payslips.orderBy("updatedAt").reverse().toArray(),
    [],
  );
  const business = useLiveQuery(() => db.business.get("default"), []);
  const [busy, setBusy] = useState(false);
  const needsSetup = business && !business.name.trim();
  const latestDraft = slips?.find((slip) => slip.status === "draft");
  const drafts = slips?.filter((slip) => slip.status === "draft") ?? [];
  const issued = slips?.filter((slip) => slip.status !== "draft") ?? [];

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
            {latestDraft ? (
              <ButtonLink href={`/payslip?id=${latestDraft.id}`} className="flex-1 sm:flex-none">
                Continue draft
              </ButtonLink>
            ) : null}
            <Button
              variant="secondary"
              className="flex-1 sm:flex-none"
              onClick={() => void onDuplicateLast()}
              disabled={busy || !slips?.length}
            >
              Duplicate last
            </Button>
            <Button
              variant={latestDraft ? "secondary" : "primary"}
              className="flex-1 sm:flex-none"
              onClick={() => void onNew()}
              disabled={busy}
            >
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
        <div className="space-y-6">
          {drafts.length > 0 && issued.length > 0 ? (
            <h2 className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
              Drafts
            </h2>
          ) : null}
          <div className="space-y-3">
            {drafts.map((slip) => (
              <DocumentListItem
                key={slip.id}
                href={`/payslip?id=${slip.id}`}
                title={documentListTitle({
                  number: slip.number,
                  partyName: slip.employee.name,
                })}
                subtitle={`${slip.employee.name.trim() || "No employee"} · ${formatDate(slip.periodStart)} – ${formatDate(slip.periodEnd)}`}
                status={slip.status}
                meta="Net"
                amount={formatMoney(slip.totals.net, slip.currency)}
                isDraft
                busy={busy}
                onDelete={() => {
                  if (!confirm("Delete this draft?")) return;
                  void deleteDraftPayslip(slip.id);
                }}
              />
            ))}
          </div>
          {drafts.length > 0 && issued.length > 0 ? (
            <h2 className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
              Issued
            </h2>
          ) : null}
          <div className="space-y-3">
            {issued.map((slip) => (
              <DocumentListItem
                key={slip.id}
                href={`/payslip?id=${slip.id}`}
                title={documentListTitle({
                  number: slip.number,
                  partyName: slip.employee.name,
                })}
                subtitle={`${slip.employee.name.trim() || "No employee"} · ${formatDate(slip.periodStart)} – ${formatDate(slip.periodEnd)}`}
                status={slip.status}
                meta="Net"
                amount={formatMoney(slip.totals.net, slip.currency)}
                isDraft={false}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { createDraftInvoice, deleteDraftInvoice, duplicateInvoice } from "@/lib/invoice-service";
import { Button, PageHeader, StatusPill } from "@/components/ui";

export function HomePage() {
  const router = useRouter();
  const invoices = useLiveQuery(
    () => db.invoices.orderBy("updatedAt").reverse().toArray(),
    [],
  );
  const business = useLiveQuery(() => db.business.get("default"), []);
  const [busy, setBusy] = useState(false);

  const needsSetup = business && !business.name.trim();

  async function onNew() {
    setBusy(true);
    try {
      const inv = await createDraftInvoice();
      router.push(`/invoices/${inv.id}`);
    } finally {
      setBusy(false);
    }
  }

  async function onDuplicateLast() {
    if (!invoices?.length) return;
    setBusy(true);
    try {
      const inv = await duplicateInvoice(invoices[0].id);
      router.push(`/invoices/${inv.id}`);
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteDraft(id: string) {
    if (!confirm("Delete this draft? This cannot be undone.")) return;
    setBusy(true);
    try {
      await deleteDraftInvoice(id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle="Create, issue, and download branded invoices — data stays on this device."
        actions={
          <>
            <Button variant="secondary" onClick={onDuplicateLast} disabled={busy || !invoices?.length}>
              Duplicate last
            </Button>
            <Button onClick={onNew} disabled={busy}>
              New invoice
            </Button>
          </>
        }
      />

      {needsSetup ? (
        <div className="mb-6 rounded-xl border border-teal-200 bg-teal-50/80 px-4 py-3 text-sm text-teal-950">
          Set your business profile first for correct tax IDs and branding.{" "}
          <Link href="/settings" className="font-medium underline">
            Open settings
          </Link>
        </div>
      ) : null}

      {!invoices ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : invoices.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--panel)]/60 px-6 py-16 text-center">
          <p className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
            No invoices yet
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">
            Start a draft, pick a template, and issue when you&apos;re ready. Numbers only lock on issue.
          </p>
          <Button className="mt-6" onClick={onNew} disabled={busy}>
            Create your first invoice
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--line)] bg-[var(--wash)] text-xs uppercase tracking-wider text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Number</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3 text-right font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr
                  key={inv.id}
                  className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--wash)]/80"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="font-medium text-[var(--ink)] hover:underline"
                    >
                      {inv.number || "Draft"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {inv.client.name || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={inv.status} />
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {formatDate(inv.issueDate)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatMoney(inv.totals.total, inv.currency)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {inv.status === "draft" ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-red-700 hover:bg-red-50 hover:text-red-800"
                        disabled={busy}
                        onClick={() => void onDeleteDraft(inv.id)}
                      >
                        Delete
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

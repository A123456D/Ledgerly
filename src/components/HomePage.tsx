"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { createDraftInvoice, deleteDraftInvoice, duplicateInvoice } from "@/lib/invoice-service";
import { Button, PageHeader, StatusPill } from "@/components/ui";
import type { DocKind } from "@/lib/types";
import {
  documentHref,
  documentKind,
  documentNounLower,
} from "@/lib/document-kind";

export function HomePage({ kind = "invoice" }: { kind?: DocKind }) {
  const router = useRouter();
  const allDocs = useLiveQuery(
    () => db.invoices.orderBy("updatedAt").reverse().toArray(),
    [],
  );
  const documents = useMemo(
    () => allDocs?.filter((inv) => documentKind(inv.kind) === kind),
    [allDocs, kind],
  );
  const business = useLiveQuery(() => db.business.get("default"), []);
  const [busy, setBusy] = useState(false);
  const [vatNudgeDismissed, setVatNudgeDismissed] = useState(() => {
    try { return sessionStorage.getItem("vatNudgeDismissed") === "1"; } catch { return false; }
  });
  const nounLower = documentNounLower(kind);

  const needsSetup =
    kind === "invoice" &&
    business &&
    (!business.name.trim() || !business.address?.trim() || !business.taxId?.trim());

  const showVatNudge =
    kind === "invoice" &&
    business &&
    !business.taxId?.trim() &&
    !vatNudgeDismissed;

  function dismissVatNudge() {
    setVatNudgeDismissed(true);
    try { sessionStorage.setItem("vatNudgeDismissed", "1"); } catch { /* ignore */ }
  }

  async function onNew() {
    setBusy(true);
    try {
      const inv = await createDraftInvoice({ kind });
      router.push(documentHref(kind, inv.id));
    } finally {
      setBusy(false);
    }
  }

  async function onDuplicateLast() {
    if (!documents?.length) return;
    setBusy(true);
    try {
      const inv = await duplicateInvoice(documents[0].id);
      router.push(documentHref(inv.kind, inv.id));
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
    <div className="min-w-0">
      <PageHeader
        title={kind === "quote" ? "Quotes" : "Invoices"}
        subtitle={
          kind === "quote"
            ? "Send a quote, then convert it to an invoice when the client accepts."
            : "Create, issue, and download branded invoices — data stays on this device."
        }
        actions={
          <>
            <Button
              variant="secondary"
              className="flex-1 sm:flex-none"
              onClick={onDuplicateLast}
              disabled={busy || !documents?.length}
            >
              Duplicate last
            </Button>
            <Button className="flex-1 sm:flex-none" onClick={onNew} disabled={busy}>
              New {nounLower}
            </Button>
          </>
        }
      />

      {needsSetup ? (
        <div className="mb-6 rounded-xl border border-teal-200 bg-teal-50/80 px-4 py-3 text-sm text-teal-950">
          Finish your business profile (name, address, VAT No.) so Tax Invoices stay SARS-ready.{" "}
          <Link href="/settings" className="font-medium underline">
            Open settings
          </Link>
        </div>
      ) : null}

      {showVatNudge ? (
        <div className="mb-6 flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-medium">Add your VAT No. to send tax invoices</p>
            <p className="mt-0.5 text-amber-800">
              SARS needs your 10-digit VAT number on Tax Invoices. Add it in Settings — takes a minute.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link
              href="/settings"
              className="inline-flex items-center rounded-md bg-amber-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800"
            >
              Add VAT No.
            </Link>
            <button
              type="button"
              className="inline-flex items-center rounded-md border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100"
              onClick={dismissVatNudge}
            >
              Not now
            </button>
          </div>
        </div>
      ) : null}

      {!documents ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : documents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--panel)]/60 px-4 py-12 text-center sm:px-6 sm:py-16">
          <p className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
            No {kind === "quote" ? "quotes" : "invoices"} yet
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">
            {kind === "quote"
              ? "Start a draft quote, set the number if you need a specific one, send it, then convert it to an invoice when accepted."
              : "Pick a template, add a client, enter lines, then send."}
          </p>
          <Button className="mt-6" onClick={onNew} disabled={busy}>
            {kind === "quote" ? `Create your first ${nounLower}` : "Create your first SARS-ready invoice"}
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {documents.map((inv) => (
              <div
                key={inv.id}
                className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={documentHref(inv.kind, inv.id)}
                      className="block truncate font-medium text-[var(--ink)] underline-offset-2 hover:underline"
                    >
                      {inv.number || "Draft"}
                    </Link>
                    <p className="mt-0.5 truncate text-sm text-[var(--muted)]">
                      {inv.client.name || "No client"}
                    </p>
                  </div>
                  <StatusPill status={inv.status} kind={inv.kind} />
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 text-sm">
                  <span className="text-[var(--muted)]">{formatDate(inv.issueDate)}</span>
                  <span className="tabular-nums font-medium">
                    {formatMoney(inv.totals.total, inv.currency)}
                  </span>
                </div>
                {inv.status === "draft" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="mt-2 w-full text-red-700 hover:bg-red-50 hover:text-red-800"
                    disabled={busy}
                    onClick={() => void onDeleteDraft(inv.id)}
                  >
                    Delete draft
                  </Button>
                ) : null}
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--panel)] md:block">
            <table className="w-full min-w-[36rem] text-left text-sm">
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
                {documents.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--wash)]/80"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={documentHref(inv.kind, inv.id)}
                        className="font-medium text-[var(--ink)] hover:underline"
                      >
                        {inv.number || "Draft"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {inv.client.name || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={inv.status} kind={inv.kind} />
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
        </>
      )}
    </div>
  );
}

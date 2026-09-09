"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { createDraftInvoice, deleteDraftInvoice, duplicateInvoice } from "@/lib/invoice-service";
import { Button, PageHeader, StatusPill } from "@/components/ui";
import type { DocKind, Invoice } from "@/lib/types";
import {
  documentHref,
  documentKind,
  documentNounLower,
  isOverdue,
} from "@/lib/document-kind";

type InvoiceFilter = "all" | "draft" | "sent" | "partial" | "paid" | "overdue";

function matchesFilter(inv: Invoice, filter: InvoiceFilter): boolean {
  const over = isOverdue(inv.status, inv.dueDate);
  switch (filter) {
    case "all": return true;
    case "draft": return inv.status === "draft";
    case "sent": return inv.status === "issued" && !over;
    case "partial": return inv.status === "partial" && !over;
    case "paid": return inv.status === "paid";
    case "overdue": return over;
  }
}

const INVOICE_FILTERS: { id: InvoiceFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "sent", label: "Sent" },
  { id: "partial", label: "Partial" },
  { id: "paid", label: "Paid" },
  { id: "overdue", label: "Overdue" },
];

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
  const [filter, setFilter] = useState<InvoiceFilter>("all");
  const nounLower = documentNounLower(kind);
  const isInvoice = kind === "invoice";

  const filtered = useMemo(() => {
    if (!documents) return documents;
    if (!isInvoice || filter === "all") return documents;
    return documents.filter((inv) => matchesFilter(inv, filter));
  }, [documents, filter, isInvoice]);

  const needsSetup = business && !business.name.trim();

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
          Set your business profile first for correct tax IDs and branding.{" "}
          <Link href="/settings" className="font-medium underline">
            Open settings
          </Link>
        </div>
      ) : null}

      {isInvoice && documents && documents.length > 0 ? (
        <div className="-mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {INVOICE_FILTERS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                filter === id
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--wash)] text-[var(--muted)] hover:bg-[var(--line)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {!filtered ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : filtered.length === 0 && (!isInvoice || filter === "all") ? (
        <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--panel)]/60 px-4 py-12 text-center sm:px-6 sm:py-16">
          <p className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
            No {kind === "quote" ? "quotes" : "invoices"} yet
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">
            {kind === "quote"
              ? "Start a draft quote, set the number if you need a specific one, send it, then convert it to an invoice when accepted."
              : "Start a draft, pick a template, and issue when you\u2019re ready. You can type the number or leave it blank to auto-assign."}
          </p>
          <Button className="mt-6" onClick={onNew} disabled={busy}>
            Create your first {nounLower}
          </Button>
        </div>
      ) : isInvoice && filter !== "all" && filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--panel)]/60 px-4 py-10 text-center sm:px-6 sm:py-12">
          <p className="text-sm text-[var(--muted)]">
            No {INVOICE_FILTERS.find((f) => f.id === filter)?.label.toLowerCase()} invoices
          </p>
          <button
            type="button"
            className="mt-2 text-xs text-[var(--accent)] underline-offset-2 hover:underline"
            onClick={() => setFilter("all")}
          >
            Clear filter
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {filtered!.map((inv) => (
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
                  <StatusPill status={inv.status} kind={inv.kind} dueDate={inv.dueDate} />
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
                {filtered!.map((inv) => (
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
                      <StatusPill status={inv.status} kind={inv.kind} dueDate={inv.dueDate} />
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

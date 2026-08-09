"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button, Field, StatusPill, inputClass } from "@/components/ui";
import { formatDate, formatMoney, uid } from "@/lib/format";
import {
  clientToParty,
  displayDocumentLive,
  duplicateInvoice,
  emptyLine,
  issueInvoice,
  markInvoiceStatus,
  peekDraftNumber,
  recomputeTotals,
  saveInvoice,
  deleteDraftInvoice,
} from "@/lib/invoice-service";
import { downloadInvoicePdf } from "@/lib/pdf/download";
import { TemplatePicker } from "@/components/TemplatePicker";
import { LogoLibrary } from "@/components/LogoUploader";
import { SendInvoiceModal } from "@/components/SendInvoiceModal";
import { db, getBusiness, saveBusiness } from "@/lib/db";
import type { Invoice, LineItem, TaxMode } from "@/lib/types";
import { InvoicePreview, type InvoiceViewModel } from "@/templates/InvoicePreview";
import { InvoiceStage } from "@/components/InvoiceStage";
import { normalizeBusinessLogos } from "@/lib/logos";

export function InvoiceEditor({ id }: { id: string }) {
  const router = useRouter();
  const stored = useLiveQuery(() => db.invoices.get(id), [id]);
  const clients = useLiveQuery(() => db.clients.orderBy("name").toArray(), []);
  const catalog = useLiveQuery(() => db.items.orderBy("description").toArray(), []);
  const business = useLiveQuery(() => getBusiness(), []);

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [preview, setPreview] = useState<InvoiceViewModel | null>(null);
  const [peekNumber, setPeekNumber] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);

  useEffect(() => {
    if (stored) setInvoice(stored);
  }, [stored]);

  const refreshPreview = useCallback(async (inv: Invoice) => {
    const doc = await displayDocumentLive({
      ...inv,
      totals: recomputeTotals(inv),
    });
    setPreview(doc);
  }, []);

  useEffect(() => {
    if (!invoice) return;
    void refreshPreview(invoice);
  }, [invoice, refreshPreview, business]);

  useEffect(() => {
    if (invoice?.status === "draft") {
      peekDraftNumber().then(setPeekNumber);
    }
  }, [invoice?.status, business?.invoicePrefix]);

  if (!invoice) {
    return <p className="text-sm text-[var(--muted)]">Loading invoice…</p>;
  }

  const locked = invoice.status !== "draft";

  function update(patch: Partial<Invoice>) {
    if (locked) return;
    setInvoice((inv) => {
      if (!inv) return inv;
      const next = { ...inv, ...patch };
      next.totals = recomputeTotals(next);
      return next;
    });
  }

  function updateLine(lineId: string, patch: Partial<LineItem>) {
    if (locked || !invoice) return;
    const lineItems = invoice.lineItems.map((l) =>
      l.id === lineId ? { ...l, ...patch } : l,
    );
    update({ lineItems });
  }

  function addLine(fromCatalog?: LineItem) {
    if (locked || !invoice) return;
    const line =
      fromCatalog ||
      emptyLine(business?.defaultTaxRate ?? invoice.lineItems[0]?.taxRate ?? 0);
    update({ lineItems: [...invoice.lineItems, line] });
  }

  function removeLine(lineId: string) {
    if (locked || !invoice) return;
    if (invoice.lineItems.length <= 1) return;
    update({ lineItems: invoice.lineItems.filter((l) => l.id !== lineId) });
  }

  async function onSave() {
    if (!invoice || locked) return;
    const current = invoice;
    setBusy(true);
    setError("");
    try {
      const saved = await saveInvoice(current);
      setInvoice(saved);
      setMessage("Draft saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function onIssue() {
    if (!invoice) return;
    const current = invoice;
    setBusy(true);
    setError("");
    try {
      await saveInvoice(current);
      const issued = await issueInvoice(current.id);
      setInvoice(issued);
      setMessage(`Issued as ${issued.number}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Issue failed");
    } finally {
      setBusy(false);
    }
  }

  async function onPdf() {
    if (!preview || !invoice) return;
    const current = invoice;
    setBusy(true);
    try {
      if (current.status === "draft") await saveInvoice(current);
      const latest = (await db.invoices.get(current.id)) || current;
      const doc = await displayDocumentLive(latest);
      await downloadInvoicePdf(doc);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDuplicate() {
    if (!invoice) return;
    const current = invoice;
    setBusy(true);
    try {
      const copy = await duplicateInvoice(current.id);
      router.push(`/invoices/${copy.id}`);
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteDraft() {
    if (!invoice || invoice.status !== "draft") return;
    if (!confirm("Delete this draft? This cannot be undone.")) return;
    setBusy(true);
    setError("");
    try {
      await deleteDraftInvoice(invoice.id);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setBusy(false);
    }
  }

  async function onStatus(status: "paid" | "void" | "issued") {
    if (!invoice) return;
    const current = invoice;
    setBusy(true);
    setError("");
    try {
      const next = await markInvoiceStatus(current.id, status);
      setInvoice(next);
      setMessage(`Marked ${status}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  function onPickClient(clientId: string) {
    if (!clients) return;
    if (!clientId) {
      update({ clientId: null });
      return;
    }
    const c = clients.find((x) => x.id === clientId);
    if (!c) return;
    update({ clientId: c.id, client: clientToParty(c) });
  }

  function addFromCatalog(itemId: string) {
    const item = catalog?.find((x) => x.id === itemId);
    if (!item) return;
    addLine({
      id: uid("line"),
      description: item.description,
      quantity: 1,
      unitPrice: item.unitPrice,
      unit: item.unit,
      taxRate: item.taxRate,
      discountPercent: 0,
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/" className="text-xs text-[var(--muted)] hover:underline">
            ← All invoices
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)] sm:text-3xl">
              {invoice.number || peekNumber || "Draft"}
            </h1>
            <StatusPill status={invoice.status} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!locked ? (
            <>
              <Button variant="secondary" onClick={onSave} disabled={busy}>
                Save draft
              </Button>
              <Button onClick={onIssue} disabled={busy}>
                Issue
              </Button>
              <Button
                variant="danger"
                onClick={() => void onDeleteDraft()}
                disabled={busy}
              >
                Delete draft
              </Button>
            </>
          ) : (
            <>
              {invoice.status === "issued" ? (
                <Button variant="secondary" onClick={() => onStatus("paid")} disabled={busy}>
                  Mark paid
                </Button>
              ) : null}
              {invoice.status === "paid" ? (
                <Button variant="ghost" onClick={() => onStatus("issued")} disabled={busy}>
                  Mark unpaid
                </Button>
              ) : null}
              {invoice.status !== "void" ? (
                <Button variant="danger" onClick={() => onStatus("void")} disabled={busy}>
                  Void
                </Button>
              ) : null}
            </>
          )}
          <Button variant="secondary" onClick={onPdf} disabled={busy}>
            Download PDF
          </Button>
          <Button
            type="button"
            onClick={() => setSendOpen(true)}
            disabled={busy || !preview}
          >
            Send
          </Button>
          <Button variant="ghost" onClick={onDuplicate} disabled={busy}>
            Duplicate
          </Button>
        </div>
      </div>

      {invoice.lastSentAt ? (
        <p className="mb-3 text-xs text-[var(--muted)]">
          Last sent {formatDate(invoice.lastSentAt.slice(0, 10))}
          {invoice.lastSentTo ? ` to ${invoice.lastSentTo}` : ""}
        </p>
      ) : null}

      {(message || error) && (
        <p className={`mb-4 text-sm ${error ? "text-red-700" : "text-teal-800"}`}>
          {error || message}
        </p>
      )}

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="space-y-4 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5">
          <fieldset disabled={locked} className="space-y-4 disabled:opacity-70">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Client">
                <select
                  className={inputClass}
                  value={invoice.clientId || ""}
                  onChange={(e) => onPickClient(e.target.value)}
                >
                  <option value="">Custom / one-off</option>
                  {clients?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Bill-to name">
                <input
                  className={inputClass}
                  value={invoice.client.name}
                  onChange={(e) =>
                    update({ client: { ...invoice.client, name: e.target.value } })
                  }
                />
              </Field>
              <Field label="Client email">
                <input
                  className={inputClass}
                  value={invoice.client.email}
                  onChange={(e) =>
                    update({ client: { ...invoice.client, email: e.target.value } })
                  }
                />
              </Field>
              <Field label="Client tax ID">
                <input
                  className={inputClass}
                  value={invoice.client.taxId}
                  onChange={(e) =>
                    update({ client: { ...invoice.client, taxId: e.target.value } })
                  }
                />
              </Field>
              <Field label="Address">
                <input
                  className={inputClass}
                  value={invoice.client.address}
                  onChange={(e) =>
                    update({
                      client: { ...invoice.client, address: e.target.value },
                    })
                  }
                />
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="City">
                  <input
                    className={inputClass}
                    value={invoice.client.city}
                    onChange={(e) =>
                      update({
                        client: { ...invoice.client, city: e.target.value },
                      })
                    }
                  />
                </Field>
                <Field label="Postal">
                  <input
                    className={inputClass}
                    value={invoice.client.postalCode}
                    onChange={(e) =>
                      update({
                        client: {
                          ...invoice.client,
                          postalCode: e.target.value,
                        },
                      })
                    }
                  />
                </Field>
                <Field label="Country">
                  <input
                    className={inputClass}
                    value={invoice.client.country}
                    onChange={(e) =>
                      update({
                        client: { ...invoice.client, country: e.target.value },
                      })
                    }
                  />
                </Field>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <Field label="Issue date">
                <input
                  className={inputClass}
                  type="date"
                  value={invoice.issueDate}
                  onChange={(e) => update({ issueDate: e.target.value })}
                />
              </Field>
              <Field label="Due date">
                <input
                  className={inputClass}
                  type="date"
                  value={invoice.dueDate}
                  onChange={(e) => update({ dueDate: e.target.value })}
                />
              </Field>
              <Field label="Currency">
                <input
                  className={inputClass}
                  value={invoice.currency}
                  maxLength={3}
                  onChange={(e) =>
                    update({ currency: e.target.value.toUpperCase() })
                  }
                />
              </Field>
              <Field label="VAT mode">
                <select
                  className={inputClass}
                  value={invoice.taxMode}
                  onChange={(e) =>
                    update({ taxMode: e.target.value as TaxMode })
                  }
                >
                  <option value="exclusive">Exclusive (add VAT)</option>
                  <option value="inclusive">Inclusive (VAT in price)</option>
                </select>
              </Field>
              <Field label="Accent">
                <input
                  className={inputClass}
                  type="color"
                  value={invoice.accentColor}
                  onChange={(e) => update({ accentColor: e.target.value })}
                />
              </Field>
            </div>

            <div>
              <p className="mb-2 text-sm text-[var(--muted)]">Template</p>
              <TemplatePicker
                value={invoice.templateId}
                onChange={(id) => update({ templateId: id })}
                onAccentSuggest={(accent) => update({ accentColor: accent })}
              />
              <p className="mt-2 text-xs text-[var(--muted)]">
                Upload a Canva letterhead above, or manage designs under{" "}
                <Link href="/templates" className="underline">
                  Templates
                </Link>
                .
              </p>
            </div>

            {business ? (
              <LogoLibrary
                label="Logos"
                business={normalizeBusinessLogos(business)}
                allowNone
                selectedLogoId={invoice.logoId ?? business.defaultLogoId ?? null}
                onSelectLogo={(logoId) => update({ logoId })}
                onChange={(next) => {
                  void saveBusiness(next).then(() => {
                    void refreshPreview({
                      ...invoice,
                      logoId:
                        invoice.logoId === undefined
                          ? next.defaultLogoId ?? null
                          : invoice.logoId,
                    });
                  });
                }}
              />
            ) : null}

            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-[var(--muted)]">Line items</p>
                <div className="flex flex-wrap gap-2">
                  {catalog && catalog.length > 0 ? (
                    <select
                      className={inputClass + " w-auto"}
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          addFromCatalog(e.target.value);
                          e.target.value = "";
                        }
                      }}
                    >
                      <option value="">Add from catalog…</option>
                      {catalog.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.description}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  <Button type="button" variant="secondary" onClick={() => addLine()}>
                    Add line
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                {invoice.lineItems.map((line, index) => (
                  <div
                    key={line.id}
                    className="grid grid-cols-12 gap-2 rounded-lg border border-[var(--line)] bg-[var(--wash)]/40 p-2"
                  >
                    <input
                      className={`${inputClass} col-span-12 sm:col-span-5`}
                      placeholder="Description"
                      value={line.description}
                      onChange={(e) =>
                        updateLine(line.id, { description: e.target.value })
                      }
                      onKeyDown={(e) => {
                        if (
                          e.key === "Enter" &&
                          index === invoice.lineItems.length - 1 &&
                          line.description.trim()
                        ) {
                          e.preventDefault();
                          addLine();
                        }
                      }}
                    />
                    <input
                      className={`${inputClass} col-span-4 sm:col-span-1`}
                      type="number"
                      min={0}
                      step={0.01}
                      title="Qty"
                      value={line.quantity}
                      onChange={(e) =>
                        updateLine(line.id, {
                          quantity: Number(e.target.value),
                        })
                      }
                    />
                    <input
                      className={`${inputClass} col-span-4 sm:col-span-2`}
                      type="number"
                      min={0}
                      step={0.01}
                      title="Unit price"
                      value={line.unitPrice}
                      onChange={(e) =>
                        updateLine(line.id, {
                          unitPrice: Number(e.target.value),
                        })
                      }
                    />
                    <input
                      className={`${inputClass} col-span-4 sm:col-span-1`}
                      type="number"
                      min={0}
                      step={0.01}
                      title="VAT %"
                      value={line.taxRate}
                      onChange={(e) =>
                        updateLine(line.id, {
                          taxRate: Number(e.target.value),
                        })
                      }
                    />
                    <input
                      className={`${inputClass} col-span-6 sm:col-span-1`}
                      type="number"
                      min={0}
                      max={100}
                      title="Discount %"
                      value={line.discountPercent}
                      onChange={(e) =>
                        updateLine(line.id, {
                          discountPercent: Number(e.target.value),
                        })
                      }
                    />
                    <div className="col-span-4 flex items-center justify-end text-xs tabular-nums text-[var(--muted)] sm:col-span-1">
                      {formatMoney(
                        line.quantity *
                          line.unitPrice *
                          (1 - (line.discountPercent || 0) / 100),
                        invoice.currency,
                      )}
                    </div>
                    <button
                      type="button"
                      className="col-span-2 text-xs text-red-700 sm:col-span-1"
                      onClick={() => removeLine(line.id)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-right text-sm font-medium tabular-nums">
                Total {formatMoney(invoice.totals.total, invoice.currency)}
              </p>
            </div>

            <Field label="Notes">
              <textarea
                className={inputClass}
                rows={2}
                value={invoice.notes}
                onChange={(e) => update({ notes: e.target.value })}
              />
            </Field>
            <Field label="Payment instructions">
              <textarea
                className={inputClass}
                rows={2}
                value={invoice.paymentInstructions}
                onChange={(e) =>
                  update({ paymentInstructions: e.target.value })
                }
              />
            </Field>
          </fieldset>
        </div>

        <div className="min-w-0 xl:sticky xl:top-4 xl:self-start">
          <p className="mb-2 text-xs uppercase tracking-wider text-[var(--muted)]">
            Live A4 preview
          </p>
          <div className="min-w-0 overflow-x-auto overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--wash)] p-3 sm:p-5">
            <InvoiceStage maxScale={1} minScale={0.35}>
              {preview ? <InvoicePreview doc={preview} /> : null}
            </InvoiceStage>
          </div>
        </div>
      </div>

      {preview ? (
        <SendInvoiceModal
          open={sendOpen}
          onClose={() => setSendOpen(false)}
          doc={preview}
          fromName={business?.name}
          fromEmail={business?.email}
          onSent={async ({ to }) => {
            const next: Invoice = {
              ...invoice,
              lastSentAt: new Date().toISOString(),
              lastSentTo: to,
              updatedAt: new Date().toISOString(),
            };
            await db.invoices.put(next);
            setInvoice(next);
            setMessage(`Sent to ${to}`);
          }}
        />
      ) : null}
    </div>
  );
}

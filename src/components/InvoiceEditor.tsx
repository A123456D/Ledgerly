"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, DecimalInput, Field, StatusPill, inputClass } from "@/components/ui";
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
import { BrandLookControls } from "@/components/BrandLookControls";
import { LogoLibrary } from "@/components/LogoUploader";
import { SendInvoiceModal } from "@/components/SendInvoiceModal";
import { db, getBusiness, saveBusiness } from "@/lib/db";
import type {
  Business,
  FontPair,
  Invoice,
  InvoiceDecoration,
  InvoiceSectionId,
  LineItem,
  TaxMode,
} from "@/lib/types";
import {
  INVOICE_VISIBILITY_OPTIONS,
  resolveVisibility,
  type InvoiceVisibleField,
} from "@/lib/invoice-visibility";
import { InvoicePreview, type InvoiceViewModel } from "@/templates/InvoicePreview";
import { InvoiceStage } from "@/components/InvoiceStage";
import { InvoiceEditContext } from "@/components/invoice-edit-context";
import { InvoiceSectionEditor } from "@/components/InvoiceSectionEditor";
import { DesignStudio } from "@/components/DesignStudio";
import {
  DecorationEditContext,
} from "@/components/DecorationLayer";
import { normalizeBusinessLogos, resolveLogoDataUrl } from "@/lib/logos";
import { isBuiltinTemplateId } from "@/lib/templates/catalog";
import { getTemplateDesignPackage } from "@/lib/templates/decoration-presets";
import {
  createLogoDecoration,
  defaultLogoDecoration,
  findLogoDecorations,
  isImageDecoration,
  isLogoDecoration,
  syncLogoDecoration,
} from "@/lib/decorations/logo-decoration";
import {
  designTemplateToInvoicePatch,
  getCustomTemplate,
  saveInvoiceDesignTemplate,
} from "@/lib/custom-templates";
import { isCustomTemplateId } from "@/lib/types";

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
  const [selectedSection, setSelectedSection] = useState<InvoiceSectionId | null>(
    null,
  );
  const [designMode, setDesignMode] = useState(false);
  const [selectedDecorationId, setSelectedDecorationId] = useState<string | null>(
    null,
  );

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

  // Must stay above any early return — hooks cannot be conditional.
  // Preview is refreshed async; overlay live design fields so drag/resize never snaps back.
  const livePreview = useMemo(() => {
    if (!preview || !invoice) return preview;
    return {
      ...preview,
      decorations: invoice.decorations?.length
        ? invoice.decorations
        : preview.decorations,
      sectionAccents: invoice.sectionAccents ?? preview.sectionAccents,
      accentColor: invoice.accentColor || preview.accentColor,
      fontPair: invoice.fontPair ?? preview.fontPair,
      templateId: invoice.templateId,
      logoSizePx: invoice.logoSizePx ?? preview.logoSizePx,
      visibility: invoice.visibility ?? preview.visibility,
    };
  }, [preview, invoice]);

  if (!invoice) {
    return <p className="text-sm text-[var(--muted)]">Loading invoice…</p>;
  }

  const locked = invoice.status !== "draft";
  const vis = resolveVisibility(invoice.visibility);

  function toggleFieldVisibility(key: InvoiceVisibleField) {
    const nextVis = !resolveVisibility(invoice!.visibility)[key];
    const patch: Partial<Invoice> = {
      visibility: {
        ...resolveVisibility(invoice!.visibility),
        [key]: nextVis,
      },
    };
    if (key === "logo") {
      const logoSrc =
        business &&
        resolveLogoDataUrl(
          business,
          invoice!.logoId === null
            ? null
            : invoice!.logoId ?? business.defaultLogoId ?? null,
        );
      patch.decorations = syncLogoDecoration(invoice!.decorations, {
        accent: invoice!.accentColor,
        logoVisible: nextVis,
        imageDataUrl: logoSrc,
      });
    }
    update(patch);
  }

  function fieldShowCheckbox(key: InvoiceVisibleField) {
    const on = vis[key];
    return (
      <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-normal text-[var(--muted)]">
        <input
          type="checkbox"
          className="h-4 w-4 shrink-0 rounded border-[var(--line)] accent-[var(--accent)]"
          checked={on}
          disabled={locked}
          onChange={() => toggleFieldVisibility(key)}
        />
        Show
      </label>
    );
  }

  function update(patch: Partial<Invoice>) {
    if (locked) return;
    setInvoice((inv) => {
      if (!inv) return inv;
      const next = { ...inv, ...patch };
      next.totals = recomputeTotals(next);
      return next;
    });
  }

  function updateDecoration(id: string, patch: Partial<InvoiceDecoration>) {
    if (locked) return;
    // Functional update so rapid drag events never use a stale decorations array.
    setInvoice((inv) => {
      if (!inv || inv.status !== "draft") return inv;
      return {
        ...inv,
        decorations: (inv.decorations ?? []).map((d) =>
          d.id === id ? { ...d, ...patch } : d,
        ),
      };
    });
  }

  function setSectionAccent(section: InvoiceSectionId, color: string) {
    if (locked || !invoice) return;
    update({
      sectionAccents: { ...(invoice.sectionAccents ?? {}), [section]: color },
    });
  }

  function clearSectionAccent(section: InvoiceSectionId) {
    if (locked || !invoice?.sectionAccents) return;
    const next = { ...invoice.sectionAccents };
    delete next[section];
    update({ sectionAccents: Object.keys(next).length ? next : undefined });
  }

  function patchBusiness(patch: Partial<Business>) {
    if (locked || !business) return;
    const next = { ...business, ...patch, updatedAt: new Date().toISOString() };
    void saveBusiness(next).then(() => {
      if (invoice) void refreshPreview(invoice);
    });
  }

  function scrollToEditAnchor(anchorId: string) {
    document.getElementById(anchorId)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  const editContext = {
    editable: !locked,
    selectedSection,
    onSelectSection: (section: InvoiceSectionId | null) => {
      setSelectedSection(section);
      if (section) {
        setSelectedDecorationId(null);
        // Keep designMode as-is — never block section/shape clicks.
      }
    },
    globalAccent: invoice.accentColor,
    sectionAccents: invoice.sectionAccents ?? {},
  };

  function addDecoration(decoration: InvoiceDecoration) {
    if (locked || !invoice) return;
    const patch: Partial<Invoice> = {
      decorations: [...(invoice.decorations ?? []), decoration],
    };
    if (isLogoDecoration(decoration)) {
      patch.visibility = {
        ...resolveVisibility(invoice.visibility),
        logo: true,
      };
    }
    update(patch);
    setSelectedDecorationId(decoration.id);
    setDesignMode(true);
    setSelectedSection(null);
  }

  function removeDecoration(id: string) {
    if (locked || !invoice) return;
    const target = invoice.decorations?.find((d) => d.id === id);
    const next = (invoice.decorations ?? []).filter((d) => d.id !== id);
    const patch: Partial<Invoice> = {
      decorations: next.length ? next : undefined,
    };
    // Deleting the last logo must hide it — otherwise the template redraws it inline.
    if (
      target &&
      isLogoDecoration(target) &&
      !next.some(isLogoDecoration)
    ) {
      patch.visibility = {
        ...resolveVisibility(invoice.visibility),
        logo: false,
      };
    }
    update(patch);
    if (selectedDecorationId === id) setSelectedDecorationId(null);
  }

  function duplicateDecoration(id: string) {
    if (locked || !invoice) return;
    const src = invoice.decorations?.find((d) => d.id === id);
    if (!src) return;
    const maxZ = (invoice.decorations ?? []).reduce(
      (m, d) => Math.max(m, d.zIndex),
      0,
    );
    addDecoration({
      ...src,
      id: uid("deco"),
      x: Math.min(92, src.x + 3),
      y: Math.min(92, src.y + 3),
      zIndex: maxZ + 1,
    });
  }

  function reorderDecoration(
    id: string,
    dir: "up" | "down" | "top" | "bottom",
  ) {
    if (locked) return;
    setInvoice((inv) => {
      if (!inv || inv.status !== "draft") return inv;
      const list = [...(inv.decorations ?? [])]
        .map((d) => ({ ...d }))
        .sort((a, b) => a.zIndex - b.zIndex);
      const idx = list.findIndex((d) => d.id === id);
      if (idx < 0) return inv;
      if (dir === "up") {
        if (idx >= list.length - 1) return inv;
        const z = list[idx].zIndex;
        list[idx].zIndex = list[idx + 1].zIndex;
        list[idx + 1].zIndex = z;
        // Same z-index edge case: force a step so order actually changes
        if (list[idx].zIndex === list[idx + 1].zIndex) {
          list[idx].zIndex = list[idx + 1].zIndex + 1;
        }
      } else if (dir === "down") {
        if (idx <= 0) return inv;
        const z = list[idx].zIndex;
        list[idx].zIndex = list[idx - 1].zIndex;
        list[idx - 1].zIndex = z;
        if (list[idx].zIndex === list[idx - 1].zIndex) {
          list[idx - 1].zIndex = list[idx].zIndex + 1;
        }
      } else if (dir === "top") {
        const maxZ = list.reduce((m, d) => Math.max(m, d.zIndex), 0);
        list[idx].zIndex = maxZ + 1;
      } else if (dir === "bottom") {
        const minZ = list.reduce((m, d) => Math.min(m, d.zIndex), 0);
        list[idx].zIndex = minZ - 1;
      }
      return { ...inv, decorations: list };
    });
  }

  const decorationEditContext = {
    editable: !locked,
    focusShapes: designMode,
    selectedId: selectedDecorationId,
    onSelect: (id: string | null) => {
      setSelectedDecorationId(id);
      if (id) {
        setSelectedSection(null);
        setDesignMode(true);
      }
    },
    onUpdate: updateDecoration,
  };

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
      const { clientCreated, ...stored } = saved;
      setInvoice(stored);
      const design = await saveInvoiceDesignTemplate(stored);
      setMessage(
        clientCreated
          ? `Draft saved — client added, design “${design.name}” in template gallery`
          : `Draft saved — design “${design.name}” in template gallery`,
      );
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
      const saved = await saveInvoice(current);
      const issued = await issueInvoice(saved.id);
      setInvoice(issued);
      setMessage(
        issued.clientId
          ? `Issued as ${issued.number} — client saved`
          : `Issued as ${issued.number}`,
      );
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
    setError("");
    try {
      if (current.status === "draft") await saveInvoice(current);
      setSelectedSection(null);
      setSelectedDecorationId(null);
      const latest = (await db.invoices.get(current.id)) || current;
      const doc = await displayDocumentLive(latest);
      // Ensure the live preview is painted before we snapshot it
      document
        .querySelector("[data-invoice-preview-root]")
        ?.scrollIntoView({ block: "nearest" });
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      await downloadInvoicePdf(doc);
      setMessage("PDF saved — same layout as the live preview");
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
      router.push(`/invoice?id=${copy.id}`);
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
      <div className="mb-4 flex flex-col gap-3">
        <div>
          <Link href="/" className="text-xs text-[var(--muted)] hover:underline">
            ← All invoices
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="min-w-0 break-all font-[family-name:var(--font-display)] text-xl text-[var(--ink)] sm:text-3xl">
              {invoice.number || peekNumber || "Draft"}
            </h1>
            <StatusPill status={invoice.status} />
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 nav-scroll sm:flex-wrap sm:overflow-visible">
          {!locked ? (
            <>
              <Button variant="secondary" className="shrink-0" onClick={onSave} disabled={busy}>
                Save
              </Button>
              <Button className="shrink-0" onClick={onIssue} disabled={busy}>
                Issue
              </Button>
              <Button
                variant="danger"
                className="shrink-0"
                onClick={() => void onDeleteDraft()}
                disabled={busy}
              >
                Delete
              </Button>
            </>
          ) : (
            <>
              {invoice.status === "issued" ? (
                <Button variant="secondary" className="shrink-0" onClick={() => onStatus("paid")} disabled={busy}>
                  Mark paid
                </Button>
              ) : null}
              {invoice.status === "paid" ? (
                <Button variant="ghost" className="shrink-0" onClick={() => onStatus("issued")} disabled={busy}>
                  Mark unpaid
                </Button>
              ) : null}
              {invoice.status !== "void" ? (
                <Button variant="danger" className="shrink-0" onClick={() => onStatus("void")} disabled={busy}>
                  Void
                </Button>
              ) : null}
            </>
          )}
          <Button variant="secondary" className="shrink-0" onClick={onPdf} disabled={busy}>
            PDF
          </Button>
          <Button
            type="button"
            className="shrink-0"
            onClick={() => setSendOpen(true)}
            disabled={busy || !preview}
          >
            Send
          </Button>
          <Button variant="ghost" className="shrink-0" onClick={onDuplicate} disabled={busy}>
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
        <div className="min-w-0 space-y-4 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3 sm:p-5">
          <fieldset disabled={locked} className="min-w-0 space-y-4 disabled:opacity-70">

            <div className="rounded-lg border border-[var(--line)] bg-[var(--wash)]/50 p-3 sm:p-4">
              <p className="mb-3 text-sm font-medium text-[var(--ink)]">
                Show on invoice
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {INVOICE_VISIBILITY_OPTIONS.map(({ key, label }) => {
                  const on = vis[key];
                  return (
                    <label
                      key={key}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 text-sm ${
                        on
                          ? "border-teal-700/25 bg-[var(--panel)]"
                          : "border-[var(--line)] bg-[var(--panel)]/60 opacity-70"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 shrink-0 rounded border-[var(--line)] accent-[var(--accent)]"
                        checked={on}
                        onChange={() => toggleFieldVisibility(key)}
                      />
                      <span className={on ? "" : "line-through"}>{label}</span>
                    </label>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-[var(--muted)]">
                Uncheck any box to hide that block from the preview and PDF.
              </p>
            </div>

            <div id="edit-section-billTo" className="grid gap-3 sm:grid-cols-2">
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

            <div id="edit-section-dates" className="grid gap-3 sm:grid-cols-4">
              <Field
                label="Reference number"
                hint={
                  invoice.status === "draft"
                    ? "Preview only — locked in when you Issue"
                    : undefined
                }
              >
                <input
                  id="edit-section-reference"
                  className={`${inputClass} bg-[var(--wash)] tabular-nums`}
                  readOnly
                  value={invoice.number || peekNumber || "—"}
                />
              </Field>
              <Field
                label={
                  <span className="flex items-center justify-between gap-2">
                    Issue date
                    {fieldShowCheckbox("issueDate")}
                  </span>
                }
              >
                <div className="flex gap-2">
                  <input
                    className={inputClass}
                    type="date"
                    value={invoice.issueDate}
                    onChange={(e) => update({ issueDate: e.target.value })}
                  />
                  {invoice.issueDate ? (
                    <button
                      type="button"
                      className="shrink-0 text-xs text-[var(--muted)] underline"
                      onClick={() => update({ issueDate: "" })}
                    >
                      Clear
                    </button>
                  ) : null}
                </div>
              </Field>
              <Field
                label={
                  <span className="flex items-center justify-between gap-2">
                    Due date
                    {fieldShowCheckbox("dueDate")}
                  </span>
                }
              >
                <div className="flex gap-2">
                  <input
                    className={inputClass}
                    type="date"
                    value={invoice.dueDate}
                    onChange={(e) => update({ dueDate: e.target.value })}
                  />
                  {invoice.dueDate ? (
                    <button
                      type="button"
                      className="shrink-0 text-xs text-[var(--muted)] underline"
                      onClick={() => update({ dueDate: "" })}
                    >
                      Clear
                    </button>
                  ) : null}
                </div>
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
            </div>

            <div id="edit-section-lineItems" className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)]">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] px-3 py-2.5 sm:px-4">
                <p className="text-sm font-medium text-[var(--ink)]">Line items</p>
                <div className="flex flex-wrap gap-2">
                  {catalog && catalog.length > 0 ? (
                    <select
                      className={inputClass + " w-auto min-w-[10rem]"}
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

              <div className="hidden border-b border-[var(--line)] bg-[var(--wash)]/70 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted)] sm:grid sm:grid-cols-[minmax(0,1fr)_4.25rem_5.5rem_3.75rem_3.75rem_5.5rem_3.25rem] sm:gap-2">
                <span>Description</span>
                <span className="text-right">Qty</span>
                <span className="text-right">Rate</span>
                <span className="text-right">VAT %</span>
                <span className="text-right">Disc %</span>
                <span className="text-right">Amount</span>
                <span />
              </div>

              <div className="divide-y divide-[var(--line)]">
                {invoice.lineItems.map((line, index) => {
                  const lineAmount =
                    line.quantity *
                    line.unitPrice *
                    (1 - (line.discountPercent || 0) / 100);
                  return (
                    <div
                      key={line.id}
                      className="p-3 sm:grid sm:grid-cols-[minmax(0,1fr)_4.25rem_5.5rem_3.75rem_3.75rem_5.5rem_3.25rem] sm:items-start sm:gap-2 sm:px-4 sm:py-3"
                    >
                      <div className="min-w-0 sm:pt-1">
                        <label className="mb-1 block text-xs font-medium text-[var(--muted)] sm:sr-only">
                          Description
                        </label>
                        <input
                          className={inputClass}
                          placeholder="What are you billing for?"
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
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-0 sm:contents">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[var(--muted)] sm:sr-only">
                            Qty
                          </label>
                          <DecimalInput
                            value={line.quantity}
                            placeholder="1"
                            align="right"
                            onChange={(quantity) =>
                              updateLine(line.id, { quantity })
                            }
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[var(--muted)] sm:sr-only">
                            Rate ({invoice.currency})
                          </label>
                          <DecimalInput
                            value={line.unitPrice}
                            placeholder="0.00"
                            align="right"
                            onChange={(unitPrice) =>
                              updateLine(line.id, { unitPrice })
                            }
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[var(--muted)] sm:sr-only">
                            VAT %
                          </label>
                          <DecimalInput
                            value={line.taxRate}
                            placeholder="15"
                            align="right"
                            onChange={(taxRate) =>
                              updateLine(line.id, { taxRate })
                            }
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[var(--muted)] sm:sr-only">
                            Disc %
                          </label>
                          <DecimalInput
                            value={line.discountPercent}
                            placeholder="0"
                            align="right"
                            onChange={(discountPercent) =>
                              updateLine(line.id, { discountPercent })
                            }
                          />
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2 sm:mt-0 sm:flex-col sm:items-end sm:justify-start sm:pt-2">
                        <label className="text-xs font-medium text-[var(--muted)] sm:sr-only">
                          Amount
                        </label>
                        <span className="text-sm font-medium tabular-nums">
                          {formatMoney(lineAmount, invoice.currency)}
                        </span>
                      </div>

                      <div className="mt-1 flex justify-end sm:mt-0 sm:justify-center sm:pt-2">
                        <button
                          type="button"
                          className="text-xs text-red-700 underline-offset-2 hover:underline disabled:opacity-40"
                          disabled={invoice.lineItems.length <= 1}
                          onClick={() => removeLine(line.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-[var(--line)] bg-[var(--wash)]/40 px-3 py-3 text-right sm:px-4">
                <p className="text-sm font-semibold tabular-nums">
                  Total {formatMoney(invoice.totals.total, invoice.currency)}
                </p>
              </div>
            </div>


            {business ? (
              <div id="edit-section-logo">
              <LogoLibrary
                label="Logos on invoice"
                business={normalizeBusinessLogos(business)}
                allowNone
                selectedLogoId={
                  invoice.logoId === null
                    ? null
                    : invoice.logoId ?? business.defaultLogoId ?? null
                }
                onSelectLogo={(logoId) => {
                  const src = resolveLogoDataUrl(business, logoId);
                  const patch: Partial<Invoice> = { logoId };
                  let decorations = [...(invoice.decorations ?? [])];
                  const logos = findLogoDecorations(decorations);

                  if (logoId === null) {
                    // Keep logo shapes; clear baked images so monogram shows
                    decorations = decorations.map((d) =>
                      isLogoDecoration(d)
                        ? { ...d, imageDataUrl: undefined }
                        : d,
                    );
                  } else if (selectedDecorationId) {
                    const selected = decorations.find(
                      (d) => d.id === selectedDecorationId,
                    );
                    if (selected && isLogoDecoration(selected)) {
                      decorations = decorations.map((d) =>
                        d.id === selected.id
                          ? { ...d, imageDataUrl: src }
                          : d,
                      );
                    } else {
                      const maxZ = decorations.reduce(
                        (m, d) => Math.max(m, d.zIndex),
                        0,
                      );
                      decorations.push({
                        id: uid("deco"),
                        ...defaultLogoDecoration(
                          invoice.accentColor,
                          maxZ + 1,
                          src,
                        ),
                      });
                    }
                  } else if (logos.length) {
                    // Apply to selected or first logo without moving it
                    const targetId = logos[0].id;
                    decorations = decorations.map((d) =>
                      d.id === targetId ? { ...d, imageDataUrl: src } : d,
                    );
                  } else if (vis.logo) {
                    decorations.push(
                      createLogoDecoration(invoice.accentColor, {
                        imageDataUrl: src,
                      }),
                    );
                  }
                  patch.decorations = decorations;
                  update(patch);
                  setDesignMode(true);
                }}
                logoSizePx={
                  invoice.logoSizePx ??
                  business.defaultLogoSizePx ??
                  120
                }
                onLogoSizeChange={(logoSizePx) => {
                  // Resize selected logo shape (or all logos) — free shape sizing
                  const logos = findLogoDecorations(invoice.decorations);
                  if (!logos.length) {
                    update({ logoSizePx });
                    return;
                  }
                  // Map px roughly to % width on A4 (~794px wide at 96dpi)
                  const pct = Math.min(40, Math.max(6, (logoSizePx / 794) * 100));
                  const targetId =
                    selectedDecorationId &&
                    logos.some((l) => l.id === selectedDecorationId)
                      ? selectedDecorationId
                      : logos[0].id;
                  update({
                    logoSizePx,
                    decorations: (invoice.decorations ?? []).map((d) =>
                      d.id === targetId
                        ? { ...d, w: pct, h: pct * 0.7 }
                        : d,
                    ),
                  });
                }}
                onChange={(next) => {
                  void saveBusiness(next).then(() => {
                    void refreshPreview({
                      ...invoice,
                      logoId:
                        invoice.logoId === null
                          ? null
                          : invoice.logoId ?? next.defaultLogoId ?? null,
                    });
                  });
                }}
              />
              </div>
            ) : null}

            <div id="edit-section-header">
              <p className="mb-2 text-sm text-[var(--muted)]">Template</p>
              <TemplatePicker
                value={invoice.templateId}
                onChange={(id) => {
                  if (isBuiltinTemplateId(id)) {
                    const design = getTemplateDesignPackage(
                      id,
                      invoice.accentColor,
                    );
                    const keptLogos = findLogoDecorations(invoice.decorations);
                    const keptImages = (invoice.decorations ?? []).filter(
                      (d) => !isLogoDecoration(d) && d.shapeId === "image",
                    );
                    const packageShapes = design.decorations.filter(
                      (d) => !isLogoDecoration(d),
                    );
                    const decorations = [
                      ...packageShapes,
                      ...(keptLogos.length
                        ? keptLogos
                        : vis.logo
                          ? [
                              createLogoDecoration(design.accentColor, {
                                imageDataUrl: business
                                  ? resolveLogoDataUrl(
                                      business,
                                      invoice.logoId === null
                                        ? null
                                        : invoice.logoId ??
                                          business.defaultLogoId ??
                                          null,
                                    )
                                  : undefined,
                              }),
                            ]
                          : []),
                      ...keptImages,
                    ];
                    update({
                      templateId: id,
                      accentColor: design.accentColor,
                      decorations,
                      sectionAccents: undefined,
                    });
                    setSelectedDecorationId(null);
                    return;
                  }
                  if (isCustomTemplateId(id)) {
                    void getCustomTemplate(id).then((custom) => {
                      if (!custom) {
                        update({ templateId: id });
                        return;
                      }
                      const patch = designTemplateToInvoicePatch(custom);
                      if (patch) {
                        update(patch);
                        setSelectedDecorationId(null);
                        setDesignMode(true);
                        return;
                      }
                      update({
                        templateId: id,
                        accentColor: custom.accentColor || invoice.accentColor,
                      });
                    });
                    return;
                  }
                  update({ templateId: id });
                }}
                onAccentSuggest={(accent) => update({ accentColor: accent })}
              />
              <div className="mt-3">
                <BrandLookControls
                  accentColor={invoice.accentColor}
                  fontPair={
                    (invoice.fontPair as FontPair | undefined) ||
                    business?.fontPair ||
                    "editorial"
                  }
                  onAccentChange={(accentColor) => update({ accentColor })}
                  onFontChange={(fontPair) => update({ fontPair })}
                />
              </div>
              <p className="mt-2 text-xs text-[var(--muted)]">
                Templates use clean layouts. Tap sections on the preview to edit content, or use Design
                studio to upload images and add shapes.
              </p>
            </div>

            {!locked ? (
              <DesignStudio
                decorations={invoice.decorations ?? []}
                accentColor={invoice.accentColor}
                selectedId={selectedDecorationId}
                designMode={designMode}
                logoSrc={
                  business
                    ? resolveLogoDataUrl(
                        business,
                        invoice.logoId === null
                          ? null
                          : invoice.logoId ?? business.defaultLogoId ?? null,
                      )
                    : undefined
                }
                onToggleMode={(on) => {
                  setDesignMode(on);
                  if (on) setSelectedSection(null);
                  else setSelectedDecorationId(null);
                }}
                onSelect={setSelectedDecorationId}
                onAdd={addDecoration}
                onUpdate={updateDecoration}
                onRemove={removeDecoration}
                onDuplicate={duplicateDecoration}
                onReorder={reorderDecoration}
                onClearAll={() => {
                  const logos = findLogoDecorations(invoice.decorations);
                  const images = (invoice.decorations ?? []).filter(
                    isImageDecoration,
                  );
                  update({
                    decorations:
                      logos.length || images.length
                        ? [...logos, ...images]
                        : undefined,
                  });
                  setSelectedDecorationId(null);
                }}
              />
            ) : null}


            <div id="edit-section-notes">
            <Field label="Notes">
              <textarea
                className={inputClass}
                rows={2}
                value={invoice.notes}
                onChange={(e) => update({ notes: e.target.value })}
              />
            </Field>
            </div>
            <div id="edit-section-payment">
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
            </div>
          </fieldset>
        </div>

        <div className="relative min-w-0 xl:sticky xl:top-20 xl:self-start">
          <p className="mb-2 text-xs uppercase tracking-wider text-[var(--muted)]">
            Live A4 preview
          </p>
          {!locked ? (
            <p className="mb-2 text-xs text-[var(--muted)]">
              Tap Amount due, From, Bill to, or line items — colour wheel + edit fields open there.
            </p>
          ) : null}
          <div
            data-invoice-preview-root="true"
            className="min-w-0 max-h-[min(70vh,calc(100dvh-8rem))] overflow-x-auto overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--wash)] p-2 pb-8 sm:max-h-[calc(100dvh-7rem)] sm:p-5 sm:pb-10 xl:max-h-[calc(100dvh-6.5rem)]"
            onClick={(e) => {
              if (locked) return;
              const t = e.target as HTMLElement | null;
              // Clicks on shapes / section chrome handle their own selection.
              if (
                t?.closest?.("[data-invoice-decoration]") ||
                t?.closest?.("[data-invoice-section]")
              ) {
                return;
              }
              setSelectedSection(null);
              setSelectedDecorationId(null);
            }}
          >
            <DecorationEditContext.Provider value={decorationEditContext}>
              <InvoiceEditContext.Provider value={editContext}>
                <InvoiceStage maxScale={1} minScale={0.28}>
                  {livePreview ? <InvoicePreview doc={livePreview} /> : null}
                </InvoiceStage>
              </InvoiceEditContext.Provider>
            </DecorationEditContext.Provider>
          </div>
          {selectedSection && !locked ? (
            <InvoiceSectionEditor
              section={selectedSection}
              globalAccent={invoice.accentColor}
              sectionAccents={invoice.sectionAccents ?? {}}
              invoice={invoice}
              business={business ?? null}
              onSectionAccent={setSectionAccent}
              onClearSectionAccent={clearSectionAccent}
              onUpdateInvoice={update}
              onUpdateBusiness={patchBusiness}
              onUpdateLine={updateLine}
              onAddLine={addLine}
              onRemoveLine={removeLine}
              onClose={() => setSelectedSection(null)}
              onScrollToAnchor={scrollToEditAnchor}
            />
          ) : null}
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

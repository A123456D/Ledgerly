"use client";

import { Button, DecimalInput, Field, inputClass } from "@/components/ui";
import { sectionMeta } from "@/lib/invoice-sections";
import { ACCENT_PRESETS } from "@/lib/fonts";
import { formatMoney } from "@/lib/format";
import { dueDateLabel, issueDateLabel } from "@/lib/document-kind";
import type {
  Business,
  Invoice,
  InvoiceSectionId,
  LineItem,
  PartySnapshot,
  SectionAccents,
} from "@/lib/types";

function AccentColourWheel({
  current,
  hasOverride,
  onPick,
  onClear,
}: {
  current: string;
  hasOverride: boolean;
  onPick: (color: string) => void;
  onClear: () => void;
}) {
  const normalized = current?.toLowerCase() || "#0f766e";

  return (
    <div>
      <p className="text-sm font-medium text-[var(--ink)]">Accent colour</p>
      <p className="mt-0.5 text-xs text-[var(--muted)]">
        Changes this block on the live preview only.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {ACCENT_PRESETS.map((c) => {
          const active = normalized === c.toLowerCase();
          return (
            <button
              key={c}
              type="button"
              title={c}
              aria-label={`Colour ${c}`}
              onClick={() => onPick(c)}
              className={`h-9 w-9 rounded-full border-2 transition ${
                active
                  ? "border-[var(--ink)] ring-2 ring-[var(--ink)]/20"
                  : "border-white/80 hover:scale-105"
              }`}
              style={{ background: c }}
            />
          );
        })}
        <label className="relative flex h-9 w-9 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-[var(--line)] bg-[var(--wash)]">
          <span className="pointer-events-none text-lg leading-none text-[var(--muted)]">
            +
          </span>
          <input
            type="color"
            value={normalized}
            onChange={(e) => onPick(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Custom colour"
          />
        </label>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <p className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--muted)]">
          {normalized}
        </p>
        {hasOverride ? (
          <button
            type="button"
            className="text-[11px] text-[var(--muted)] underline"
            onClick={onClear}
          >
            Use template colour
          </button>
        ) : null}
      </div>
    </div>
  );
}

function lineAmount(invoice: Invoice, line: LineItem) {
  const base =
    (line.quantity || 0) *
    (line.unitPrice || 0) *
    (1 - (line.discountPercent || 0) / 100);
  return invoice.taxMode === "inclusive"
    ? base
    : base + (base * (line.taxRate || 0)) / 100;
}

export function InvoiceSectionEditor({
  section,
  globalAccent,
  sectionAccents,
  invoice,
  business,
  onSectionAccent,
  onClearSectionAccent,
  onUpdateInvoice,
  onUpdateBusiness,
  onUpdateLine,
  onAddLine,
  onRemoveLine,
  onClose,
  onScrollToAnchor,
}: {
  section: InvoiceSectionId;
  globalAccent: string;
  sectionAccents: SectionAccents;
  invoice: Invoice;
  business: Business | null;
  onSectionAccent: (section: InvoiceSectionId, color: string) => void;
  onClearSectionAccent: (section: InvoiceSectionId) => void;
  onUpdateInvoice: (patch: Partial<Invoice>) => void;
  onUpdateBusiness: (patch: Partial<Business>) => void;
  onUpdateLine: (lineId: string, patch: Partial<LineItem>) => void;
  onAddLine: () => void;
  onRemoveLine: (lineId: string) => void;
  onClose: () => void;
  onScrollToAnchor: (anchorId: string) => void;
}) {
  const meta = sectionMeta(section);
  const current = sectionAccents[section] || globalAccent;
  const hasOverride = Boolean(sectionAccents[section]);

  function patchClient(patch: Partial<PartySnapshot>) {
    onUpdateInvoice({ client: { ...invoice.client, ...patch } });
  }

  const showLineEditor = section === "lineItems" || section === "totals";

  return (
    <div
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-[max(0.75rem,env(safe-area-inset-left))] right-[max(0.75rem,env(safe-area-inset-right))] z-[200] mx-auto max-h-[min(72vh,36rem)] max-w-md overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-2xl sm:left-auto sm:right-6 sm:mx-0 sm:w-[22rem]"
      role="dialog"
      aria-label={`Edit ${meta?.label ?? section}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[var(--ink)]">
            {meta?.label ?? section}
          </p>
          {meta?.hint ? (
            <p className="mt-0.5 text-xs text-[var(--muted)]">{meta.hint}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg px-2 py-1 text-xs text-[var(--muted)] hover:bg-[var(--wash)]"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <AccentColourWheel
        current={current}
        hasOverride={hasOverride}
        onPick={(color) => onSectionAccent(section, color)}
        onClear={() => onClearSectionAccent(section)}
      />

      <div className="mt-4 space-y-3 border-t border-[var(--line)] pt-3">
        {section === "billTo" ? (
          <>
            <Field label="Client name">
              <input
                className={inputClass}
                value={invoice.client.name}
                onChange={(e) => patchClient({ name: e.target.value })}
              />
            </Field>
            <Field label="Email">
              <input
                className={inputClass}
                value={invoice.client.email}
                onChange={(e) => patchClient({ email: e.target.value })}
              />
            </Field>
            <Field label="Address">
              <textarea
                className={inputClass}
                rows={2}
                value={[
                  invoice.client.address,
                  [invoice.client.postalCode, invoice.client.city]
                    .filter(Boolean)
                    .join(" "),
                  invoice.client.country,
                ]
                  .filter(Boolean)
                  .join("\n")}
                onChange={(e) => {
                  const [line1 = "", line2 = "", line3 = ""] =
                    e.target.value.split("\n");
                  patchClient({
                    address: line1,
                    postalCode: line2.split(" ")[0] ?? "",
                    city: line2.split(" ").slice(1).join(" ") || line2,
                    country: line3,
                  });
                }}
              />
            </Field>
          </>
        ) : null}

        {(section === "from" || section === "header") && business ? (
          <>
            <Field label="Business name">
              <input
                className={inputClass}
                value={business.name}
                onChange={(e) => onUpdateBusiness({ name: e.target.value })}
              />
            </Field>
            <Field label="Email">
              <input
                className={inputClass}
                value={business.email}
                onChange={(e) => onUpdateBusiness({ email: e.target.value })}
              />
            </Field>
            <Field label="Phone">
              <input
                className={inputClass}
                value={business.phone}
                onChange={(e) => onUpdateBusiness({ phone: e.target.value })}
              />
            </Field>
            <Field label="Address">
              <textarea
                className={inputClass}
                rows={2}
                value={[
                  business.address,
                  [business.postalCode, business.city].filter(Boolean).join(" "),
                  business.country,
                ]
                  .filter(Boolean)
                  .join("\n")}
                onChange={(e) => {
                  const [line1 = "", line2 = "", line3 = ""] =
                    e.target.value.split("\n");
                  onUpdateBusiness({
                    address: line1,
                    postalCode: line2.split(" ")[0] ?? "",
                    city: line2.split(" ").slice(1).join(" ") || line2,
                    country: line3,
                  });
                }}
              />
            </Field>
          </>
        ) : null}

        {section === "dates" ? (
          <div className="grid grid-cols-2 gap-2">
            <Field label={issueDateLabel(invoice.kind)}>
              <input
                className={inputClass}
                type="date"
                value={invoice.issueDate}
                onChange={(e) => onUpdateInvoice({ issueDate: e.target.value })}
              />
            </Field>
            <Field label={dueDateLabel(invoice.kind)}>
              <input
                className={inputClass}
                type="date"
                value={invoice.dueDate}
                onChange={(e) => onUpdateInvoice({ dueDate: e.target.value })}
              />
            </Field>
          </div>
        ) : null}

        {section === "notes" ? (
          <Field label="Notes">
            <textarea
              className={inputClass}
              rows={3}
              value={invoice.notes}
              onChange={(e) => onUpdateInvoice({ notes: e.target.value })}
            />
          </Field>
        ) : null}

        {section === "payment" ? (
          <Field label="Payment instructions">
            <textarea
              className={inputClass}
              rows={3}
              value={invoice.paymentInstructions}
              onChange={(e) =>
                onUpdateInvoice({ paymentInstructions: e.target.value })
              }
            />
          </Field>
        ) : null}

        {section === "logo" ? (
          <p className="text-xs text-[var(--muted)]">
            Use the colour above for the monogram fallback. Pick or replace the
            logo image in Design studio / Logos.
          </p>
        ) : null}

        {section === "reference" ? (
          <p className="text-xs text-[var(--muted)]">
            The reference number is assigned when you issue the {invoice.kind === "quote" ? "quote" : "invoice"}. Colour
            above changes this block’s accent.
          </p>
        ) : null}

        {showLineEditor ? (
          <div className="space-y-3">
            <p className="text-xs font-medium text-[var(--ink)]">
              {section === "totals" ? "Amount due comes from these lines" : "Line items"}
            </p>
            {invoice.lineItems.map((line, index) => (
              <div
                key={line.id}
                className="space-y-2 rounded-lg border border-[var(--line)] bg-[var(--wash)]/50 p-2.5"
              >
                <Field label={`Description ${index + 1}`}>
                  <input
                    className={inputClass}
                    value={line.description}
                    onChange={(e) =>
                      onUpdateLine(line.id, { description: e.target.value })
                    }
                    placeholder="What you’re charging for"
                  />
                </Field>
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Qty">
                    <DecimalInput
                      className={inputClass}
                      value={line.quantity}
                      onChange={(quantity) =>
                        onUpdateLine(line.id, { quantity })
                      }
                    />
                  </Field>
                  <Field label="Rate">
                    <DecimalInput
                      className={inputClass}
                      value={line.unitPrice}
                      onChange={(unitPrice) =>
                        onUpdateLine(line.id, { unitPrice })
                      }
                    />
                  </Field>
                  <Field label="Amount">
                    <input
                      className={inputClass}
                      readOnly
                      value={formatMoney(
                        lineAmount(invoice, line),
                        invoice.currency,
                      )}
                      tabIndex={-1}
                    />
                  </Field>
                </div>
                {invoice.lineItems.length > 1 ? (
                  <button
                    type="button"
                    className="text-[11px] text-red-700 underline"
                    onClick={() => onRemoveLine(line.id)}
                  >
                    Remove line
                  </button>
                ) : null}
              </div>
            ))}
            <Button type="button" variant="secondary" onClick={onAddLine}>
              Add line
            </Button>
            {section === "totals" ? (
              <p className="text-xs text-[var(--muted)]">
                Amount due updates automatically:{" "}
                <span className="font-semibold text-[var(--ink)]">
                  {formatMoney(invoice.totals?.total ?? 0, invoice.currency)}
                </span>
              </p>
            ) : null}
          </div>
        ) : null}

        {meta?.editAnchor ? (
          <button
            type="button"
            className="text-xs font-medium text-teal-800 underline"
            onClick={() => onScrollToAnchor(meta.editAnchor)}
          >
            Jump to full editor ↓
          </button>
        ) : null}
      </div>
    </div>
  );
}

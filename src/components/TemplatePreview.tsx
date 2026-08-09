"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui";
import { InvoiceStage } from "@/components/InvoiceStage";
import type { TemplateMeta } from "@/lib/templates/catalog";
import { InvoicePreview, type InvoiceViewModel } from "@/templates/InvoicePreview";

export function sampleDoc(meta: TemplateMeta): InvoiceViewModel {
  return {
    number: "INV-2026-0042",
    business: {
      name: "Northwind Studio",
      email: "hello@northwind.studio",
      phone: "+27 21 555 0100",
      address: "12 Long Street",
      city: "Cape Town",
      postalCode: "8001",
      country: "South Africa",
      taxId: "4123456789",
    },
    client: {
      name: "Acme Retail (Pty) Ltd",
      email: "ap@acme.example",
      address: "88 Market Street",
      city: "Johannesburg",
      postalCode: "2000",
      country: "South Africa",
      taxId: "4987654321",
    },
    currency: "ZAR",
    taxMode: "exclusive",
    templateId: meta.id,
    accentColor: meta.defaultAccent,
    fontPair: "editorial",
    issueDate: "2026-08-01",
    dueDate: "2026-08-15",
    notes: "Thank you for your business.",
    paymentInstructions: "Pay within 14 days via EFT.",
    lineItems: [
      {
        id: "1",
        description: "Brand identity workshop",
        quantity: 1,
        unitPrice: 1200,
        unit: "day",
        taxRate: 15,
        discountPercent: 0,
      },
      {
        id: "2",
        description: "Invoice template design",
        quantity: 8,
        unitPrice: 95,
        unit: "hr",
        taxRate: 15,
        discountPercent: 0,
      },
    ],
    totals: {
      subtotal: 1960,
      discountTotal: 0,
      taxTotal: 294,
      taxByRate: [{ rate: 15, taxable: 1960, tax: 294 }],
      total: 2254,
    },
    status: "issued",
  };
}

/** Real invoice, scaled to card width — full sheet, no right-edge clip. */
export function LiveTemplateThumb({
  meta,
  size = "md",
}: {
  meta: TemplateMeta;
  size?: "sm" | "md";
}) {
  const doc = useMemo(() => sampleDoc(meta), [meta]);
  const height = size === "sm" ? "h-28" : "h-52";

  return (
    <div
      className={`relative w-full overflow-hidden ${height}`}
      style={{ background: meta.paper }}
    >
      <InvoiceStage maxScale={size === "sm" ? 0.28 : 0.38} minScale={0.18}>
        <InvoicePreview doc={doc} />
      </InvoiceStage>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/10 to-transparent" />
    </div>
  );
}

export function TemplatePreviewModal({
  meta,
  open,
  onClose,
}: {
  meta: TemplateMeta | null;
  open: boolean;
  onClose: () => void;
}) {
  const doc = useMemo(() => (meta ? sampleDoc(meta) : null), [meta]);
  if (!open || !meta || !doc) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-8"
      role="dialog"
      aria-modal
      aria-label={`Preview ${meta.name}`}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl rounded-2xl bg-[var(--wash)] p-4 shadow-xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
              {meta.name}
            </h2>
            <p className="text-sm text-[var(--muted)]">{meta.blurb}</p>
          </div>
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--wash)] p-3">
          <InvoiceStage maxScale={0.85} minScale={0.4}>
            <InvoicePreview doc={doc} />
          </InvoiceStage>
        </div>
      </div>
    </div>
  );
}

export function useTemplatePreview() {
  const [meta, setMeta] = useState<TemplateMeta | null>(null);
  return {
    meta,
    open: !!meta,
    preview: (m: TemplateMeta) => setMeta(m),
    close: () => setMeta(null),
  };
}

export function GalleryTemplateCard({
  meta,
  defaultLabel,
  onSetDefault,
}: {
  meta: TemplateMeta;
  defaultLabel?: string;
  onSetDefault: () => void;
}) {
  const { meta: previewMeta, open, preview, close } = useTemplatePreview();

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)]">
        <button
          type="button"
          className="block w-full text-left transition hover:opacity-95"
          onClick={() => preview(meta)}
          title="Preview template"
        >
          <LiveTemplateThumb meta={meta} size="md" />
        </button>
        <div className="space-y-2 px-3 py-3">
          <div className="flex items-center gap-2">
            <p className="font-medium">{meta.name}</p>
            <span className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
              {meta.category}
            </span>
            {defaultLabel === meta.id ? (
              <span className="rounded bg-teal-100 px-1.5 text-[10px] font-medium text-teal-900">
                Default
              </span>
            ) : null}
          </div>
          <p className="text-xs text-[var(--muted)]">{meta.blurb}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => preview(meta)}>
              Preview
            </Button>
            <Button type="button" variant="ghost" onClick={onSetDefault}>
              Set default
            </Button>
          </div>
        </div>
      </div>
      <TemplatePreviewModal meta={previewMeta} open={open} onClose={close} />
    </>
  );
}

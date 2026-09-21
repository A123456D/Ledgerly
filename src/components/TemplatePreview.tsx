"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui";
import { InvoiceStage } from "@/components/InvoiceStage";
import {
  TEMPLATE_PREVIEW_MODAL_MAX_SCALE,
  TEMPLATE_PREVIEW_MODAL_MIN_SCALE,
} from "@/lib/preview-scale";
import {
  getBuiltinTemplate,
  type TemplateMeta,
} from "@/lib/templates/catalog";
import { getTemplateDesignPackage } from "@/lib/templates/decoration-presets";
import {
  isDesignCustomTemplate,
  toCustomTemplateId,
  type CustomTemplate,
} from "@/lib/types";
import { InvoicePreview, type InvoiceViewModel } from "@/templates/InvoicePreview";
import { shareDesignTemplate } from "@/lib/templates/share-template";
import { fillLogoImages } from "@/lib/decorations/logo-decoration";
import { DEFAULT_FONT_PAIR } from "@/lib/fonts";

const SAMPLE_LOGO_DATA_URL =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0f766e"/><text x="32" y="42" text-anchor="middle" fill="white" font-size="26" font-family="system-ui,sans-serif" font-weight="700">N</text></svg>`,
  );

const SAMPLE_LINE_ITEMS: InvoiceViewModel["lineItems"] = [
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
];

const SAMPLE_TOTALS: InvoiceViewModel["totals"] = {
  subtotal: 1960,
  discountTotal: 0,
  taxTotal: 294,
  taxByRate: [{ rate: 15, taxable: 1960, tax: 294 }],
  total: 2254,
};

function sampleParties(): Pick<InvoiceViewModel, "business" | "client"> {
  return {
    business: {
      name: "Northwind Studio",
      email: "hello@northwind.studio",
      phone: "+27 21 555 0100",
      address: "12 Long Street",
      city: "Cape Town",
      postalCode: "8001",
      country: "South Africa",
      taxId: "4123456789",
      companyNumber: "2020/123456/07",
      logoDataUrl: SAMPLE_LOGO_DATA_URL,
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
  };
}

export function sampleDoc(meta: TemplateMeta): InvoiceViewModel {
  const design = getTemplateDesignPackage(meta.id);
  const parties = sampleParties();
  return {
    number: "INV-2026-0042",
    ...parties,
    currency: "ZAR",
    taxMode: "exclusive",
    templateId: meta.id,
    accentColor: design.accentColor,
    decorations: fillLogoImages(design.decorations, SAMPLE_LOGO_DATA_URL),
    logoDataUrl: SAMPLE_LOGO_DATA_URL,
    fontPair: DEFAULT_FONT_PAIR,
    issueDate: "2026-08-01",
    dueDate: "2026-08-15",
    notes: "Thank you for your business.",
    paymentInstructions: "Pay within 14 days via EFT.",
    lineItems: SAMPLE_LINE_ITEMS,
    totals: SAMPLE_TOTALS,
    status: "issued",
  };
}

export function sampleDocFromDesign(template: CustomTemplate): InvoiceViewModel | null {
  if (!isDesignCustomTemplate(template)) return null;
  const base = getBuiltinTemplate(template.baseTemplateId);
  const fallback = getTemplateDesignPackage(template.baseTemplateId);
  const parties = sampleParties();
  return {
    number: "INV-2026-0042",
    ...parties,
    business: {
      ...parties.business,
      accentColor: template.accentColor || base?.defaultAccent,
    },
    currency: "ZAR",
    taxMode: "exclusive",
    templateId: toCustomTemplateId(template.id),
    accentColor: template.accentColor || fallback.accentColor,
    decorations: fillLogoImages(
      template.decorations?.length ? template.decorations : fallback.decorations,
      SAMPLE_LOGO_DATA_URL,
    ),
    logoDataUrl: SAMPLE_LOGO_DATA_URL,
    fontPair: template.fontPair || DEFAULT_FONT_PAIR,
    logoSizePx: template.logoSizePx,
    sectionAccents: template.sectionAccents,
    visibility: template.visibility,
    customTemplate: template,
    issueDate: "2026-08-01",
    dueDate: "2026-08-15",
    notes: "Thank you for your business.",
    paymentInstructions: "Pay within 14 days via EFT.",
    lineItems: SAMPLE_LINE_ITEMS,
    totals: SAMPLE_TOTALS,
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

export function SavedDesignThumb({
  template,
  size = "md",
}: {
  template: CustomTemplate;
  size?: "sm" | "md";
}) {
  const doc = useMemo(() => sampleDocFromDesign(template), [template]);
  const base = isDesignCustomTemplate(template)
    ? getBuiltinTemplate(template.baseTemplateId)
    : undefined;
  const height = size === "sm" ? "h-28" : "h-52";
  if (!doc) return null;

  return (
    <div
      className={`relative w-full overflow-hidden ${height}`}
      style={{ background: base?.paper || "#fff" }}
    >
      <InvoiceStage maxScale={size === "sm" ? 0.28 : 0.38} minScale={0.18}>
        <InvoicePreview doc={doc} />
      </InvoiceStage>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/10 to-transparent" />
    </div>
  );
}

function A4PreviewDialog({
  title,
  subtitle,
  open,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-x-hidden overflow-y-auto bg-black/50 p-3 sm:p-8"
      role="dialog"
      aria-modal
      aria-label={`Preview ${title}`}
      onClick={onClose}
    >
      <div
        className="relative w-full min-w-0 max-w-3xl overflow-hidden rounded-2xl bg-[var(--wash)] p-3 shadow-xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-2 sm:mb-4">
          <div className="min-w-0">
            <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
              {title}
            </h2>
            <p className="text-sm text-[var(--muted)]">{subtitle}</p>
          </div>
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
        {/* min-w-0 + overflow-hidden: flex item can shrink; A4 scales to width instead of scrolling. */}
        <div className="min-w-0 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--wash)] p-2 sm:p-3">
          {children}
        </div>
      </div>
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
    <A4PreviewDialog
      title={meta.name}
      subtitle={meta.blurb}
      open={open}
      onClose={onClose}
    >
      <InvoiceStage
        maxScale={TEMPLATE_PREVIEW_MODAL_MAX_SCALE}
        minScale={TEMPLATE_PREVIEW_MODAL_MIN_SCALE}
      >
        <InvoicePreview doc={doc} />
      </InvoiceStage>
    </A4PreviewDialog>
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

export function GallerySavedDesignCard({
  template,
  defaultLabel,
  onSetDefault,
  onDelete,
}: {
  template: CustomTemplate;
  defaultLabel?: string;
  onSetDefault: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [shareNote, setShareNote] = useState("");
  const doc = useMemo(() => sampleDocFromDesign(template), [template]);
  const tid = toCustomTemplateId(template.id);
  if (!doc || !isDesignCustomTemplate(template)) return null;

  async function onShare() {
    setShareNote("");
    try {
      const result = await shareDesignTemplate(template);
      setShareNote(
        result === "shared"
          ? "Shared — file has layout only, not your details"
          : "Downloaded — file has layout only, not your details",
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setShareNote(err instanceof Error ? err.message : "Could not share");
    }
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)]">
        <button
          type="button"
          className="block w-full text-left transition hover:opacity-95"
          onClick={() => setOpen(true)}
          title="Preview saved design"
        >
          <SavedDesignThumb template={template} size="md" />
        </button>
        <div className="space-y-2 px-3 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{template.name}</p>
            <span className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
              Saved
            </span>
            {defaultLabel === tid ? (
              <span className="rounded bg-teal-100 px-1.5 text-[10px] font-medium text-teal-900">
                Default
              </span>
            ) : null}
          </div>
          <p className="text-xs text-[var(--muted)]">
            Layout, colours, and placement — not your business name, logo file, or invoice lines.
          </p>
          {shareNote ? (
            <p className="text-[11px] text-teal-800">{shareNote}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
              Preview
            </Button>
            <Button type="button" variant="ghost" onClick={onSetDefault}>
              Set default
            </Button>
            <Button type="button" variant="ghost" onClick={() => void onShare()}>
              Share
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                if (confirm(`Delete “${template.name}” from the gallery?`)) {
                  onDelete();
                }
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      </div>
      <A4PreviewDialog
        title={template.name}
        subtitle="Saved invoice design"
        open={open}
        onClose={() => setOpen(false)}
      >
        <InvoiceStage
          maxScale={TEMPLATE_PREVIEW_MODAL_MAX_SCALE}
          minScale={TEMPLATE_PREVIEW_MODAL_MIN_SCALE}
        >
          <InvoicePreview doc={doc} />
        </InvoiceStage>
      </A4PreviewDialog>
    </>
  );
}

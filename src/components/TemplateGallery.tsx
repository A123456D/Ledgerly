"use client";

import { useMemo } from "react";
import { InvoicePreview, type InvoiceViewModel } from "@/templates/InvoicePreview";
import { PayslipPreview } from "@/templates/PayslipPreview";
import { BUILTIN_TEMPLATES } from "@/lib/templates/catalog";
import { buildTemplateDecorations } from "@/lib/templates/decoration-presets";
import type { Invoice, Payslip } from "@/lib/types";

/**
 * Dev harness: renders every built-in template with the same realistic sample
 * document. /template-gallery            — template-native headers
 * /template-gallery?deco=1              — with auto-seeded identity shapes
 * /template-gallery?kind=quote          — quote mode
 * /template-gallery?payslip=1           — payslip sample
 */

const LOGO =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0f766e"/><path d="M36 12 20 36h10l-4 16 18-26H33l3-14z" fill="#fff"/></svg>`,
  );

function sampleDoc(kind?: "invoice" | "quote"): InvoiceViewModel {
  const inv: Invoice = {
    id: "gallery",
    kind: kind ?? "invoice",
    status: "issued",
    number: kind === "quote" ? "QUO-2026-014" : "INV-2026-042",
    clientId: null,
    client: {
      name: "Thandi Mokoena",
      email: "thandi@brewco.za",
      address: "18 Kloof Street, Gardens",
      city: "Cape Town",
      postalCode: "8001",
      country: "South Africa",
      taxId: kind === "quote" ? "" : "4123456789",
    },
    issueDate: "2026-09-28",
    dueDate: "2026-10-12",
    currency: "ZAR",
    taxMode: "exclusive",
    templateId: "classic",
    accentColor: "#0f766e",
    fontPair: "modern",
    logoId: null,
    logoSizePx: 72,
    notes:
      "Thank you for your business. Website redesign phase 2 kicks off on receipt of this " +
      (kind === "quote" ? "signed quote." : "payment."),
    paymentInstructions:
      "FNB Cheque · 6284 1190 2211 · Branch 250 655\nReference: INV-2026-042\nOr PayFast: pay.example/inv042",
    lineItems: [
      { id: "l1", description: "Website redesign — home + about pages", quantity: 1, unitPrice: 12500, unit: "", taxRate: 15, discountPercent: 0 },
      { id: "l2", description: "Brand identity refresh and logo pack", quantity: 1, unitPrice: 8200, unit: "", taxRate: 15, discountPercent: 10 },
      { id: "l3", description: "Photography direction (day rate)", quantity: 2, unitPrice: 4500, unit: "day", taxRate: 15, discountPercent: 0 },
    ],
    totals: {
      subtotal: 28810,
      discountTotal: 820,
      taxTotal: 4321.5,
      taxByRate: [{ rate: 15, taxable: 28810, tax: 4321.5 }],
      total: 33131.5,
    },
    snapshot: {
      number: kind === "quote" ? "QUO-2026-014" : "INV-2026-042",
      issuedAt: "2026-09-28T09:00:00Z",
      business: {
        name: "Milo Creative Studio",
        email: "hello@milostudio.co.za",
        phone: "082 555 0142",
        address: "7B Lower Main Road, Observatory",
        city: "Cape Town",
        postalCode: "7925",
        country: "South Africa",
        taxId: "4890123456",
        companyNumber: "2019/443022/07",
        logoDataUrl: LOGO,
        accentColor: "#0f766e",
        fontPair: "modern",
      },
      client: {
        name: "Thandi Mokoena",
        email: "thandi@brewco.za",
        address: "18 Kloof Street, Gardens",
        city: "Cape Town",
        postalCode: "8001",
        country: "South Africa",
        taxId: kind === "quote" ? "" : "4123456789",
      },
      currency: "ZAR",
      taxMode: "exclusive",
      templateId: "classic",
      issueDate: "2026-09-28",
      dueDate: "2026-10-12",
      notes: "",
      paymentInstructions: "",
      lineItems: [],
      totals: {
        subtotal: 28810,
        discountTotal: 820,
        taxTotal: 4321.5,
        taxByRate: [{ rate: 15, taxable: 28810, tax: 4321.5 }],
        total: 33131.5,
      },
      sarsTaxInvoice: kind !== "quote",
      logoSizePx: 72,
    },
    createdAt: "2026-09-28T09:00:00Z",
    updatedAt: "2026-09-28T09:00:00Z",
  };
  const kind_ = kind ?? "invoice";
  return {
    kind: inv.kind,
    number: inv.number ?? "",
    business: inv.snapshot!.business,
    client: inv.client,
    currency: inv.currency,
    taxMode: inv.taxMode,
    templateId: "classic",
    accentColor: "#0f766e",
    fontPair: "modern",
    logoSizePx: 72,
    logoDataUrl: LOGO,
    issueDate: inv.issueDate,
    dueDate: inv.dueDate,
    notes: inv.notes,
    paymentInstructions: inv.paymentInstructions,
    lineItems: inv.lineItems,
    totals: inv.totals,
    status: inv.status,
    sarsTaxInvoice: kind_ !== "quote",
    sarsMode: kind_ === "quote" ? undefined : "full",
  };
}

function samplePayslip(): Payslip {
  return {
    id: "gallery-pay",
    status: "issued",
    number: "PAY-2026-007",
    clientId: null,
    employee: {
      name: "Sipho Dlamini",
      email: "sipho@milostudio.co.za",
      taxId: "8809125247 088",
      employeeNumber: "EMP-004",
      jobTitle: "Junior Designer",
      address: "22 Vilakazi Street, Orlando West, Soweto",
    },
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    payDate: "2026-09-25",
    currency: "ZAR",
    accentColor: "#0f766e",
    fontPair: "modern",
    logoId: null,
    earnings: [
      { id: "e1", label: "Basic salary", amount: 22000 },
      { id: "e2", label: "Overtime", amount: 2400 },
      { id: "e3", label: "Cell phone allowance", amount: 350 },
    ],
    deductions: [
      { id: "d1", label: "PAYE", amount: 3412 },
      { id: "d2", label: "UIF", amount: 177.12 },
      { id: "d3", label: "Medical aid (50%)", amount: 940 },
    ],
    notes: "Paid via FNB. Queries: payroll@milostudio.co.za",
    totals: { gross: 24750, deductionTotal: 4529.12, net: 20220.88 },
    createdAt: "2026-09-25T08:00:00Z",
    updatedAt: "2026-09-25T08:00:00Z",
  };
}

function GallerySheet({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2 className="mb-2 text-sm font-semibold text-white/90">{label}</h2>
      <div style={{ zoom: 0.52 } as React.CSSProperties}>{children}</div>
    </section>
  );
}

export function TemplateGallery() {
  const params = useMemo(
    () => new URLSearchParams(window.location.search),
    [],
  );
  const withDeco = params.get("deco") === "1";
  const kind = params.get("kind") === "quote" ? "quote" : "invoice";
  const showPayslip = params.get("payslip") === "1";

  const doc = useMemo(() => sampleDoc(kind), [kind]);

  return (
    <div className="mx-auto max-w-[1400px] bg-neutral-900 p-6">
      <h1 className="mb-1 text-xl font-bold text-white">
        Template gallery — {kind} {withDeco ? "· with seeded identity shapes" : "· template-native"}
      </h1>
      <p className="mb-6 text-xs text-white/50">
        /template-gallery?deco=1 toggles seeded shapes · ?kind=quote · ?payslip=1
      </p>

      {showPayslip ? (
        (["modern", "classic", "minimal"] as const).map((tpl) => (
          <GallerySheet key={tpl} label={`Payslip · ${tpl}`}>
            <PayslipPreview
              slip={{ ...samplePayslip(), templateId: tpl }}
              business={
                {
                  id: "default",
                  name: "Milo Creative Studio",
                  email: "",
                  phone: "",
                  address: "7B Lower Main Road, Observatory",
                  city: "Cape Town",
                  postalCode: "7925",
                  country: "South Africa",
                  taxId: "",
                  companyNumber: "2019/443022/07",
                  vatRegistered: true,
                  logos: [],
                  accentColor: "#0f766e",
                  fontPair: "modern",
                  currency: "ZAR",
                  defaultTaxRate: 15,
                  taxMode: "exclusive",
                  paymentTerms: "",
                  netDays: 14,
                  invoicePrefix: "INV-",
                  quotePrefix: "QUO-",
                  createdAt: "",
                  updatedAt: "",
                } as never
              }
              logoDataUrl={LOGO}
            />
          </GallerySheet>
        ))
      ) : (
        BUILTIN_TEMPLATES.map((meta) => {
          const view: InvoiceViewModel = {
            ...doc,
            templateId: meta.id,
            accentColor: meta.defaultAccent,
            decorations: withDeco
              ? buildTemplateDecorations(meta.id, meta.defaultAccent).map((d) =>
                  d.shapeId === "logo"
                    ? { ...d, imageDataUrl: LOGO }
                    : d,
                )
              : undefined,
          };
          return (
            <GallerySheet
              key={meta.id}
              label={`${meta.name} · ${meta.id} · ${meta.category}`}
            >
              <InvoicePreview doc={view} />
            </GallerySheet>
          );
        })
      )}
    </div>
  );
}

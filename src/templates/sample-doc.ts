import type { InvoiceViewModel } from "@/templates/InvoicePreview";
import type { BuiltinTemplateId } from "@/lib/types";

const LOGO =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0f766e"/><path d="M36 12 20 36h10l-4 16 18-26H33l3-14z" fill="#fff"/></svg>`,
  );

/**
 * Realistic sample document used by the template gallery, WYSIWYG template
 * thumbnails, and the dev harness — so what you pick is what you get.
 */
export function sampleInvoiceView(
  templateId: BuiltinTemplateId | string,
  accent: string,
  kind: "invoice" | "quote" = "invoice",
): InvoiceViewModel {
  const isQuote = kind === "quote";
  return {
    kind,
    number: isQuote ? "QUO-2026-014" : "INV-2026-042",
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
      accentColor: accent,
      fontPair: "modern",
    },
    client: {
      name: "Thandi Mokoena",
      email: "thandi@brewco.za",
      address: "18 Kloof Street, Gardens",
      city: "Cape Town",
      postalCode: "8001",
      country: "South Africa",
      taxId: isQuote ? "" : "4123456789",
    },
    currency: "ZAR",
    taxMode: "exclusive",
    templateId,
    accentColor: accent,
    fontPair: "modern",
    logoSizePx: 72,
    logoDataUrl: LOGO,
    issueDate: "2026-09-28",
    dueDate: "2026-10-12",
    notes: isQuote
      ? "Quote includes two revision rounds. Valid for 14 days."
      : "Thank you for your business. Phase 2 kicks off on receipt of payment.",
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
    status: "issued",
    sarsTaxInvoice: !isQuote,
    sarsMode: isQuote ? undefined : "full",
  };
}

export const SAMPLE_LOGO = LOGO;

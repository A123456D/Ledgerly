import type { InvoiceSectionId } from "@/lib/types";

export const INVOICE_SECTIONS: {
  id: InvoiceSectionId;
  label: string;
  hint: string;
  editAnchor: string;
}[] = [
  {
    id: "header",
    label: "Header & business",
    hint: "Your name and contact shown at the top",
    editAnchor: "edit-section-header",
  },
  {
    id: "logo",
    label: "Logo",
    hint: "Brand mark on the invoice",
    editAnchor: "edit-section-logo",
  },
  {
    id: "reference",
    label: "Reference & title",
    hint: "Invoice title and reference number",
    editAnchor: "edit-section-reference",
  },
  {
    id: "dates",
    label: "Dates",
    hint: "Issue and due dates",
    editAnchor: "edit-section-dates",
  },
  {
    id: "from",
    label: "From",
    hint: "Your business details",
    editAnchor: "edit-section-header",
  },
  {
    id: "billTo",
    label: "Bill to",
    hint: "Client details",
    editAnchor: "edit-section-billTo",
  },
  {
    id: "lineItems",
    label: "Line items",
    hint: "Products and services table",
    editAnchor: "edit-section-lineItems",
  },
  {
    id: "totals",
    label: "Totals",
    hint: "Subtotal, VAT, and amount due",
    editAnchor: "edit-section-lineItems",
  },
  {
    id: "notes",
    label: "Notes",
    hint: "Extra message for the client",
    editAnchor: "edit-section-notes",
  },
  {
    id: "payment",
    label: "Payment",
    hint: "Banking and payment instructions",
    editAnchor: "edit-section-payment",
  },
];

export function sectionMeta(id: InvoiceSectionId) {
  return INVOICE_SECTIONS.find((s) => s.id === id);
}

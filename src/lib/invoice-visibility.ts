/** Which invoice blocks appear on preview / PDF. Missing keys default to visible. */
export type InvoiceVisibleField =
  | "issueDate"
  | "dueDate"
  | "invoiceNumber"
  | "from"
  | "billTo"
  | "logo"
  | "notes"
  | "payment"
  | "vat"
  | "subtotal";

export type InvoiceVisibility = Partial<Record<InvoiceVisibleField, boolean>>;

export type ResolvedInvoiceVisibility = Record<InvoiceVisibleField, boolean>;

export const DEFAULT_INVOICE_VISIBILITY: ResolvedInvoiceVisibility = {
  issueDate: true,
  dueDate: true,
  invoiceNumber: true,
  from: true,
  billTo: true,
  logo: true,
  notes: true,
  payment: true,
  vat: true,
  subtotal: true,
};

export const INVOICE_VISIBILITY_OPTIONS: {
  key: InvoiceVisibleField;
  label: string;
}[] = [
  { key: "issueDate", label: "Issue date" },
  { key: "dueDate", label: "Due date" },
  { key: "invoiceNumber", label: "Invoice #" },
  { key: "from", label: "From" },
  { key: "billTo", label: "Bill to" },
  { key: "logo", label: "Logo" },
  { key: "vat", label: "VAT" },
  { key: "subtotal", label: "Subtotal" },
  { key: "notes", label: "Notes" },
  { key: "payment", label: "Payment" },
];

export function resolveVisibility(
  visibility?: InvoiceVisibility | null,
): ResolvedInvoiceVisibility {
  return { ...DEFAULT_INVOICE_VISIBILITY, ...visibility };
}

export function isVisible(
  visibility: InvoiceVisibility | null | undefined,
  field: InvoiceVisibleField,
): boolean {
  return resolveVisibility(visibility)[field];
}

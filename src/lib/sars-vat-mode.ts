/**
 * SARS VAT compliance tier derivation for ZAR invoices.
 *
 * Ref: VAT Act 89 of 1991
 *   §20   – full tax invoice requirements (consideration > R5 000)
 *   §20(5) – abridged tax invoice (R50 < consideration ≤ R5 000)
 *
 * "Consideration" = total INCLUDING VAT (ZAR).
 */

import type { InvoiceViewModel } from "@/templates/InvoicePreview";

export type SarsVatMode = "no-formal" | "abridged" | "full";

const ABRIDGED_THRESHOLD = 50;
const FULL_THRESHOLD = 5_000;

/**
 * Derive the SARS tax-invoice tier from the VAT-inclusive total.
 * Zero-rated lines (0% rate with a non-zero amount) force the full tier
 * because §20 requires full particulars for zero-rated supplies.
 */
export function deriveSarsMode(
  totalInclVat: number,
  hasZeroRatedLine: boolean,
): SarsVatMode {
  if (hasZeroRatedLine) return "full";
  if (totalInclVat > FULL_THRESHOLD) return "full";
  if (totalInclVat > ABRIDGED_THRESHOLD) return "abridged";
  return "no-formal";
}

/** Derive mode directly from a live InvoiceViewModel. */
export function sarsModeFromDoc(
  doc: Pick<InvoiceViewModel, "totals" | "lineItems">,
): SarsVatMode {
  const hasZeroRated = doc.lineItems.some(
    (l) => (l.taxRate ?? 0) === 0 && (l.unitPrice ?? 0) !== 0 && l.description.trim() !== "",
  );
  return deriveSarsMode(doc.totals.total, hasZeroRated);
}

/**
 * SARS tax-invoice mode is opt-in. Explicit false stays off.
 * Legacy records with no flag follow whether a VAT number was already saved.
 */
export function isSarsTaxInvoiceEnabled(
  business: { vatRegistered?: boolean; taxId?: string } | null | undefined,
): boolean {
  if (!business) return false;
  if (typeof business.vatRegistered === "boolean") return business.vatRegistered;
  return Boolean(business.taxId?.trim());
}

/** Short UI label for the badge. */
export function sarsModeLabel(mode: SarsVatMode): string {
  switch (mode) {
    case "full":
      return "Full";
    case "abridged":
      return "Abridged";
    case "no-formal":
      return "≤ R50";
  }
}

/** Tailwind colour classes for the compliance badge. */
export function sarsModeBadgeClass(mode: SarsVatMode): string {
  switch (mode) {
    case "full":
      return "bg-blue-100 text-blue-800 border border-blue-200";
    case "abridged":
      return "bg-amber-50 text-amber-800 border border-amber-200";
    case "no-formal":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  }
}

/**
 * Returns human-readable error strings that must be resolved before
 * a SARS-compliant tax invoice can be sent/issued.
 *
 * Returns an empty array when everything passes.
 *
 * @param doc    - Live invoice view model (totals already recomputed).
 * @param business - Current business profile (Z2 supplier fields).
 * @param mode   - Pre-computed SARS tier for this document.
 */
export function sarsInvoiceSendErrors(
  doc: InvoiceViewModel,
  business: { name: string; address: string; taxId: string } | null | undefined,
  mode: SarsVatMode,
): string[] {
  const errors: string[] = [];

  // ── Z2 Supplier (required on all modes) ──────────────────────────
  if (!business?.name?.trim()) {
    errors.push("Supplier name missing — add it in Settings.");
  }
  if (!business?.address?.trim()) {
    errors.push("Supplier address missing — add it in Settings.");
  }
  if (!business?.taxId?.trim()) {
    errors.push("Supplier VAT number missing — add it in Settings.");
  } else {
    const digits = business.taxId.trim().replace(/[\s-]/g, "");
    if (!/^\d{10}$/.test(digits)) {
      errors.push("Supplier VAT number must be exactly 10 digits.");
    }
  }

  // ── Z1 Issue date ────────────────────────────────────────────────
  if (!doc.issueDate) {
    errors.push("Issue date is required on a Tax Invoice.");
  }

  // ── Z4 At least one described line ───────────────────────────────
  if (!doc.lineItems.some((l) => l.description.trim())) {
    errors.push("Add at least one line item with a description.");
  }

  // ── Full mode: recipient particulars (Z3) ─────────────────────────
  if (mode === "full") {
    if (!doc.client.name?.trim()) {
      errors.push(
        "Client name required for full Tax Invoice (total > R5 000) — go to Bill To.",
      );
    }
    if (!doc.client.address?.trim()) {
      errors.push(
        "Client address required for full Tax Invoice (total > R5 000) — go to Bill To.",
      );
    }
  }

  return errors;
}

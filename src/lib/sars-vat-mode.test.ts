import { describe, it, expect } from "vitest";
import {
  deriveSarsMode,
  sarsModeFromDoc,
  sarsInvoiceSendErrors,
  type SarsVatMode,
} from "./sars-vat-mode";
import type { InvoiceViewModel } from "@/templates/InvoicePreview";

// ── deriveSarsMode ────────────────────────────────────────────────────────────

describe("deriveSarsMode", () => {
  it("≤ R50 → no-formal", () => {
    expect(deriveSarsMode(0, false)).toBe("no-formal");
    expect(deriveSarsMode(50, false)).toBe("no-formal");
  });

  it("R50.01 – R5 000 → abridged", () => {
    expect(deriveSarsMode(50.01, false)).toBe("abridged");
    expect(deriveSarsMode(5000, false)).toBe("abridged");
    expect(deriveSarsMode(4999.99, false)).toBe("abridged");
  });

  it("> R5 000 → full", () => {
    expect(deriveSarsMode(5000.01, false)).toBe("full");
    expect(deriveSarsMode(100_000, false)).toBe("full");
  });

  it("zero-rated line forces full regardless of total", () => {
    expect(deriveSarsMode(10, true)).toBe("full");
    expect(deriveSarsMode(4999, true)).toBe("full");
  });
});

// ── sarsModeFromDoc ───────────────────────────────────────────────────────────

function makeLine(taxRate: number, unitPrice: number, description = "item") {
  return { id: "l1", description, quantity: 1, unitPrice, taxRate, discountPercent: 0, unit: "" };
}

function makeDoc(total: number, taxRate = 15): Pick<InvoiceViewModel, "totals" | "lineItems"> {
  return {
    totals: { total, subtotal: total, taxTotal: 0, discountTotal: 0, taxByRate: [] },
    lineItems: [makeLine(taxRate, total)],
  };
}

describe("sarsModeFromDoc", () => {
  it("derives no-formal for small totals", () => {
    expect(sarsModeFromDoc(makeDoc(30))).toBe("no-formal");
  });

  it("derives abridged for mid-range", () => {
    expect(sarsModeFromDoc(makeDoc(500))).toBe("abridged");
  });

  it("derives full for large totals", () => {
    expect(sarsModeFromDoc(makeDoc(6000))).toBe("full");
  });

  it("zero-rated line with value and description forces full", () => {
    const doc = makeDoc(100, 0);
    expect(sarsModeFromDoc(doc)).toBe("full");
  });

  it("zero-rated line with empty description does NOT force full", () => {
    const doc = {
      totals: { total: 100, subtotal: 100, taxTotal: 0, discountTotal: 0, taxByRate: [] },
      lineItems: [makeLine(0, 100, "")], // empty description = undescribed line
    };
    expect(sarsModeFromDoc(doc)).toBe("abridged");
  });

  it("zero-priced line does NOT force full", () => {
    const doc = {
      totals: { total: 100, subtotal: 100, taxTotal: 0, discountTotal: 0, taxByRate: [] },
      lineItems: [makeLine(0, 0, "free"), makeLine(15, 100, "consulting")],
    };
    expect(sarsModeFromDoc(doc)).toBe("abridged");
  });
});

// ── sarsInvoiceSendErrors ─────────────────────────────────────────────────────

function makeViewDoc(overrides: Partial<InvoiceViewModel> = {}): InvoiceViewModel {
  return {
    kind: "invoice",
    number: "INV-001",
    business: {
      name: "Acme Ltd",
      email: "acme@example.com",
      address: "1 Main St",
      city: "Cape Town",
      postalCode: "8001",
      country: "ZA",
      taxId: "4123456789",
    },
    client: {
      name: "Client Co",
      email: "client@example.com",
      address: "2 Client Rd",
      city: "Johannesburg",
      postalCode: "2000",
      country: "ZA",
      taxId: "",
    },
    currency: "ZAR",
    taxMode: "exclusive",
    templateId: "classic",
    accentColor: "#0f766e",
    issueDate: "2026-09-09",
    dueDate: "2026-09-30",
    notes: "",
    paymentInstructions: "",
    lineItems: [{ id: "l1", description: "Consulting", quantity: 1, unitPrice: 1000, taxRate: 15, discountPercent: 0, unit: "" }],
    totals: { total: 1150, subtotal: 1000, taxTotal: 150, discountTotal: 0, taxByRate: [{ rate: 15, taxable: 1000, tax: 150 }] },
    status: "draft",
    ...overrides,
  };
}

const goodBusiness = { name: "Acme Ltd", address: "1 Main St", taxId: "4123456789" };

describe("sarsInvoiceSendErrors", () => {
  it("no errors for a fully compliant abridged invoice", () => {
    const doc = makeViewDoc();
    expect(sarsInvoiceSendErrors(doc, goodBusiness, "abridged")).toHaveLength(0);
  });

  it("no errors for a fully compliant full invoice", () => {
    const doc = makeViewDoc({
      totals: { total: 6000, subtotal: 5217.39, taxTotal: 782.61, discountTotal: 0, taxByRate: [] },
    });
    expect(sarsInvoiceSendErrors(doc, goodBusiness, "full")).toHaveLength(0);
  });

  it("blocks when supplier name missing", () => {
    const biz = { ...goodBusiness, name: "" };
    const errors = sarsInvoiceSendErrors(makeViewDoc(), biz, "abridged");
    expect(errors.some((e) => e.includes("Supplier name"))).toBe(true);
  });

  it("blocks when supplier address missing", () => {
    const biz = { ...goodBusiness, address: "" };
    const errors = sarsInvoiceSendErrors(makeViewDoc(), biz, "abridged");
    expect(errors.some((e) => e.includes("address"))).toBe(true);
  });

  it("blocks when supplier VAT number missing", () => {
    const biz = { ...goodBusiness, taxId: "" };
    const errors = sarsInvoiceSendErrors(makeViewDoc(), biz, "abridged");
    expect(errors.some((e) => e.includes("VAT number"))).toBe(true);
  });

  it("blocks when supplier VAT number is not 10 digits", () => {
    const biz = { ...goodBusiness, taxId: "12345" };
    const errors = sarsInvoiceSendErrors(makeViewDoc(), biz, "abridged");
    expect(errors.some((e) => e.includes("10 digits"))).toBe(true);
  });

  it("accepts 10-digit VAT with spaces/dashes stripped", () => {
    const biz = { ...goodBusiness, taxId: "412 345 678 9" };
    const errors = sarsInvoiceSendErrors(makeViewDoc(), biz, "abridged");
    expect(errors.some((e) => e.includes("10 digits"))).toBe(false);
  });

  it("blocks when issue date missing", () => {
    const doc = makeViewDoc({ issueDate: "" });
    const errors = sarsInvoiceSendErrors(doc, goodBusiness, "abridged");
    expect(errors.some((e) => e.includes("Issue date"))).toBe(true);
  });

  it("blocks when no described line item", () => {
    const doc = makeViewDoc({
      lineItems: [{ id: "l1", description: "", quantity: 1, unitPrice: 100, taxRate: 15, discountPercent: 0, unit: "" }],
    });
    const errors = sarsInvoiceSendErrors(doc, goodBusiness, "abridged");
    expect(errors.some((e) => e.includes("line item"))).toBe(true);
  });

  // Full mode additional checks
  it("full mode blocks when client name missing", () => {
    const doc = makeViewDoc({ client: { ...makeViewDoc().client, name: "" } });
    const errors = sarsInvoiceSendErrors(doc, goodBusiness, "full");
    expect(errors.some((e) => e.includes("Client name"))).toBe(true);
  });

  it("full mode blocks when client address missing", () => {
    const doc = makeViewDoc({ client: { ...makeViewDoc().client, address: "" } });
    const errors = sarsInvoiceSendErrors(doc, goodBusiness, "full");
    expect(errors.some((e) => e.includes("Client address"))).toBe(true);
  });

  it("abridged mode does NOT block on missing client name", () => {
    const doc = makeViewDoc({ client: { ...makeViewDoc().client, name: "" } });
    const errors = sarsInvoiceSendErrors(doc, goodBusiness, "abridged");
    expect(errors.some((e) => e.includes("Client name"))).toBe(false);
  });

  it("abridged mode does NOT block on missing client address", () => {
    const doc = makeViewDoc({ client: { ...makeViewDoc().client, address: "" } });
    const errors = sarsInvoiceSendErrors(doc, goodBusiness, "abridged");
    expect(errors.some((e) => e.includes("Client address"))).toBe(false);
  });

  // Acceptance criterion 1: ≤ R5 000 can send without client address
  it("AC1: invoice ≤ R5 000 abridged sends without client address", () => {
    const doc = makeViewDoc({ client: { ...makeViewDoc().client, address: "" } });
    const errors = sarsInvoiceSendErrors(doc, goodBusiness, "abridged");
    expect(errors).toHaveLength(0);
  });

  // Acceptance criterion 2: > R5 000 full requires client name + address
  it("AC2: invoice > R5 000 full blocks until client name + address present", () => {
    const doc = makeViewDoc({ client: { ...makeViewDoc().client, name: "", address: "" } });
    const errors = sarsInvoiceSendErrors(doc, goodBusiness, "full");
    expect(errors.some((e) => e.includes("Client name"))).toBe(true);
    expect(errors.some((e) => e.includes("Client address"))).toBe(true);
  });

  // Acceptance criterion 4: missing supplier VAT → send blocked
  it("AC4: missing supplier VAT blocks send", () => {
    const biz = { name: "Acme", address: "1 Main", taxId: "" };
    const errors = sarsInvoiceSendErrors(makeViewDoc(), biz, "abridged");
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes("VAT number"))).toBe(true);
  });

  it("passes null business gracefully", () => {
    const errors = sarsInvoiceSendErrors(makeViewDoc(), null, "abridged");
    expect(errors.length).toBeGreaterThan(0);
  });
});

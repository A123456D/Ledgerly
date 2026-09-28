import { describe, expect, it } from "vitest";
import {
  SA_TAX_TABLE_2026,
  expenseDeductible,
  moneyStats,
  nextProvisionalDeadline,
  provisionalEstimate,
  saIncomeTax,
  taxYearOfISO,
  taxYearRange,
  twelveMonthsBeforeISO,
  vatThresholdStatus,
  VAT_COMPULSORY_THRESHOLD,
} from "./money";
import type { Expense, Invoice } from "./types";

function inv(patch: Partial<Invoice>): Invoice {
  return {
    id: "inv_test",
    kind: "invoice",
    status: "issued",
    number: null,
    clientId: null,
    client: {
      name: "Test Client",
      email: "",
      address: "",
      city: "",
      postalCode: "",
      country: "",
      taxId: "",
    },
    issueDate: "2026-01-15",
    dueDate: "",
    currency: "ZAR",
    taxMode: "exclusive",
    templateId: "classic",
    accentColor: "#000000",
    notes: "",
    paymentInstructions: "",
    lineItems: [],
    totals: { subtotal: 0, discountTotal: 0, taxTotal: 0, taxByRate: [], total: 0 },
    createdAt: "2026-01-15T08:00:00Z",
    updatedAt: "2026-01-15T08:00:00Z",
    ...patch,
  };
}

function exp(patch: Partial<Expense>): Expense {
  return {
    id: "exp_test",
    date: "2026-01-20",
    vendor: "Vendor",
    description: "",
    category: "other",
    total: 1000,
    vatPortion: 0,
    currency: "ZAR",
    createdAt: "2026-01-20T08:00:00Z",
    updatedAt: "2026-01-20T08:00:00Z",
    ...patch,
  };
}

const TODAY = "2026-09-15";

describe("saIncomeTax (2026 individual table)", () => {
  it("is zero at or below the R95,750 threshold", () => {
    expect(saIncomeTax(0)).toBe(0);
    expect(saIncomeTax(95750)).toBe(0);
  });

  it("matches SARS bracket anchors (after the primary rebate)", () => {
    // SARS table figures are pre-rebate; the rebate comes off once at the end.
    // 18% band: 237,100 × 18% = 42,678 − 17,235 rebate
    expect(saIncomeTax(237100)).toBe(25443);
    // first rand of the 26% band
    expect(saIncomeTax(237101)).toBe(25443 + 0.26);
    // 31% band: 77,362 + 31% × (500,000 − 370,500) − 17,235
    expect(saIncomeTax(500000)).toBe(100272);
    // top band: 644,489 + 45% × (2,000,000 − 1,817,000) − 17,235
    expect(saIncomeTax(2000000)).toBe(709604);
  });

  it("rebate brings income just above the threshold to a small positive tax", () => {
    const tax = saIncomeTax(100000);
    expect(tax).toBe(Math.round(100000 * 0.18 - SA_TAX_TABLE_2026.rebate));
    expect(tax).toBeGreaterThan(0);
  });
});

describe("taxYearOfISO / taxYearRange", () => {
  it("flips on 1 March (SA individual tax year)", () => {
    expect(taxYearOfISO("2026-02-28")).toBe(2026);
    expect(taxYearOfISO("2026-03-01")).toBe(2027);
    expect(taxYearOfISO("2025-12-31")).toBe(2026);
  });

  it("ranges run 1 Mar to end of Feb, leap-year aware", () => {
    expect(taxYearRange(2026)).toEqual({ start: "2025-03-01", end: "2026-02-28" });
    expect(taxYearRange(2028)).toEqual({ start: "2027-03-01", end: "2028-02-29" });
  });
});

describe("twelveMonthsBeforeISO", () => {
  it("steps back a year and handles Feb 29", () => {
    expect(twelveMonthsBeforeISO("2026-09-15")).toBe("2025-09-15");
    expect(twelveMonthsBeforeISO("2028-02-29")).toBe("2027-02-28");
    expect(twelveMonthsBeforeISO("2026-01-01")).toBe("2025-01-01");
  });
});

describe("moneyStats", () => {
  it("sums outstanding and overdue from issued + partial balances", () => {
    const docs = [
      inv({ id: "a", status: "issued", totals: { ...inv({}).totals, total: 1000, subtotal: 1000 } }),
      inv({
        id: "b",
        status: "partial",
        dueDate: "2026-08-01",
        amountPaid: 200,
        totals: { ...inv({}).totals, total: 1000, subtotal: 1000 },
      }),
      inv({ id: "c", status: "paid", totals: { ...inv({}).totals, total: 500, subtotal: 500 } }),
      inv({ id: "d", status: "void", totals: { ...inv({}).totals, total: 999, subtotal: 999 } }),
      inv({ id: "e", status: "draft", totals: { ...inv({}).totals, total: 999, subtotal: 999 } }),
    ];
    const stats = moneyStats(docs, { currency: "ZAR", today: TODAY });
    // a: 1000 outstanding, not overdue (no due date); b: 800 outstanding, overdue
    expect(stats.outstanding).toBe(1800);
    expect(stats.overdueTotal).toBe(800);
    expect(stats.overdueCount).toBe(1);
  });

  it("counts received cash in the current month only", () => {
    const docs = [
      inv({
        id: "paid_this_month",
        status: "paid",
        paidAt: "2026-09-02",
        totals: { ...inv({}).totals, total: 700, subtotal: 700 },
      }),
      inv({
        id: "paid_last_month",
        status: "paid",
        paidAt: "2026-08-30",
        totals: { ...inv({}).totals, total: 300, subtotal: 300 },
      }),
      inv({
        id: "partial_this_month",
        status: "partial",
        paidAt: "2026-09-10",
        amountPaid: 150,
        totals: { ...inv({}).totals, total: 900, subtotal: 900 },
      }),
    ];
    const stats = moneyStats(docs, { currency: "ZAR", today: TODAY });
    expect(stats.receivedThisMonth).toBe(850);
    expect(stats.outstanding).toBe(750);
  });

  it("books turnover ex-VAT by issue date, tax year and rolling 12 months", () => {
    const line = (n: number) => ({ subtotal: n, discountTotal: 0, taxTotal: 0, taxByRate: [], total: n });
    const docs = [
      inv({ id: "in_year", issueDate: "2026-04-01", totals: line(100) }),
      inv({ id: "before_year", issueDate: "2025-02-01", totals: line(50) }),
      inv({ id: "older_than_12m", issueDate: "2025-08-14", totals: line(70) }),
      inv({ id: "within_12m", issueDate: "2025-09-16", totals: line(60) }),
      inv({ id: "future_issue", issueDate: "2026-10-01", totals: line(30) }),
    ];
    const stats = moneyStats(docs, { currency: "ZAR", today: TODAY });
    // Tax year 2026 = 2025-03-01..2026-02-28 → only in_year + (future excluded)
    expect(stats.turnoverTaxYear).toBe(100);
    // Rolling 12 months to 2026-09-15 → within_12m + in_year (older_than_12m excluded)
    expect(stats.turnover12m).toBe(160);
  });

  it("ignores quotes and flags foreign-currency documents", () => {
    const docs = [
      inv({ id: "q", kind: "quote", status: "issued", totals: { ...inv({}).totals, total: 5000, subtotal: 5000 } }),
      inv({ id: "usd", currency: "USD", status: "paid", totals: { ...inv({}).totals, total: 800, subtotal: 800 } }),
      inv({ id: "zar", status: "paid", totals: { ...inv({}).totals, total: 100, subtotal: 100 } }),
    ];
    const stats = moneyStats(docs, { currency: "ZAR", today: TODAY });
    // zar invoice issued 2026-01-15: tax year 2026 already ended → not in the
    // current (2027) tax-year figure, but inside the rolling 12 months.
    expect(stats.turnoverTaxYear).toBe(0);
    expect(stats.turnover12m).toBe(100);
    expect(stats.foreignCount).toBe(1);
  });
});

describe("vatThresholdStatus", () => {
  it("walks none → voluntary → approaching → compulsory → registered", () => {
    expect(vatThresholdStatus(49999, false)).toBe("none");
    expect(vatThresholdStatus(50000, false)).toBe("voluntary");
    expect(vatThresholdStatus(899999, false)).toBe("voluntary");
    expect(vatThresholdStatus(900000, false)).toBe("approaching");
    expect(vatThresholdStatus(VAT_COMPULSORY_THRESHOLD, false)).toBe("compulsory");
    expect(vatThresholdStatus(VAT_COMPULSORY_THRESHOLD, true)).toBe("registered");
  });
});

describe("expenseDeductible", () => {
  it("removes input VAT only when VAT-registered", () => {
    const e = exp({ total: 1150, vatPortion: 150 });
    expect(expenseDeductible(e, true)).toBe(1000);
    expect(expenseDeductible(e, false)).toBe(1150);
  });
});

describe("provisionalEstimate + deadlines", () => {
  it("estimates tax on turnover minus deductible expenses", () => {
    const docs = [
      inv({ id: "a", issueDate: "2026-06-01", totals: { ...inv({}).totals, subtotal: 400000, total: 460000 } }),
    ];
    const costs = [
      exp({ id: "e1", date: "2026-06-10", total: 1150, vatPortion: 150 }),
      exp({ id: "e2", date: "2024-06-10", total: 999999 }), // outside tax year
    ];
    const est = provisionalEstimate(docs, costs, {
      vatRegistered: true,
      currency: "ZAR",
      today: TODAY,
    });
    expect(est.turnover).toBe(400000);
    expect(est.expenses).toBe(1000);
    expect(est.taxable).toBe(399000);
    expect(est.annualTax).toBe(saIncomeTax(399000));
    expect(est.nextDeadline?.label).toContain("Second provisional");
    expect(est.nextDeadline?.date).toBe("2027-02-28");
  });

  it("hands back the right IRP6 deadline through the cycle", () => {
    expect(nextProvisionalDeadline("2026-05-01")).toEqual({
      label: "First provisional (IRP6)",
      date: "2026-08-31",
    });
    expect(nextProvisionalDeadline("2026-08-31")).toEqual({
      label: "First provisional (IRP6)",
      date: "2026-08-31",
    });
    expect(nextProvisionalDeadline("2026-09-01")).toEqual({
      label: "Second provisional (IRP6)",
      date: "2027-02-28",
    });
    expect(nextProvisionalDeadline("2026-02-28")).toEqual({
      label: "Second provisional (IRP6)",
      date: "2026-02-28",
    });
  });
});

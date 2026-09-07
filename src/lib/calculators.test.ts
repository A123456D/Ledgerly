import { describe, expect, it } from "vitest";
import {
  breakEven,
  cashRunway,
  convertCurrency,
  invoiceDiscount,
  latePaymentInterest,
  marginMarkupFromPrice,
  priceForNetProfit,
  priceFromMargin,
  priceFromMarkup,
  salarySplit,
} from "./calculators";

describe("invoiceDiscount", () => {
  it("applies a percent discount then VAT", () => {
    const r = invoiceDiscount({
      subtotal: 1000,
      kind: "percent",
      discount: 10,
      vatRate: 15,
    });
    expect(r.discountAmount).toBe(100);
    expect(r.afterDiscount).toBe(900);
    expect(r.vat).toBe(135);
    expect(r.total).toBe(1035);
  });

  it("caps a flat discount at the subtotal", () => {
    const r = invoiceDiscount({
      subtotal: 50,
      kind: "flat",
      discount: 80,
      vatRate: 0,
    });
    expect(r.discountAmount).toBe(50);
    expect(r.total).toBe(0);
  });
});

describe("margin and markup", () => {
  it("prices from a 20% margin", () => {
    expect(priceFromMargin(80, 20)).toBe(100);
  });

  it("prices from a 25% markup", () => {
    expect(priceFromMarkup(80, 25)).toBe(100);
  });

  it("reads margin and markup from a selling price", () => {
    expect(marginMarkupFromPrice(80, 100)).toEqual({
      profit: 20,
      marginPct: 20,
      markupPct: 25,
    });
  });

  it("adds tax-on-profit to hit a net goal", () => {
    expect(priceForNetProfit(80, 16, 20)).toBe(100);
  });
});

describe("latePaymentInterest", () => {
  it("computes simple interest over 365 days", () => {
    const r = latePaymentInterest({
      principal: 1000,
      annualRate: 10,
      days: 365,
    });
    expect(r.interest).toBe(100);
    expect(r.total).toBe(1100);
  });

  it("returns no interest when not overdue", () => {
    expect(
      latePaymentInterest({ principal: 500, annualRate: 12, days: 0 }).interest,
    ).toBe(0);
  });
});

describe("salarySplit", () => {
  it("finds gross from take-home", () => {
    const r = salarySplit({
      amount: 70,
      direction: "net",
      taxPct: 25,
      deductionPct: 5,
      deductionFlat: 0,
    });
    expect(r?.gross).toBe(100);
    expect(r?.net).toBe(70);
  });

  it("finds take-home from gross", () => {
    const r = salarySplit({
      amount: 100,
      direction: "gross",
      taxPct: 20,
      deductionPct: 0,
      deductionFlat: 10,
    });
    expect(r?.tax).toBe(20);
    expect(r?.net).toBe(70);
  });
});

describe("cashRunway", () => {
  it("divides cash by net burn", () => {
    const r = cashRunway({ cash: 12000, monthlyExpenses: 5000, monthlyIncome: 2000 });
    expect(r.netBurn).toBe(3000);
    expect(r.months).toBe(4);
  });
});

describe("breakEven", () => {
  it("ceils units to cover fixed costs", () => {
    const r = breakEven({
      fixedCosts: 1000,
      pricePerUnit: 50,
      variablePerUnit: 30,
    });
    expect(r.contribution).toBe(20);
    expect(r.units).toBe(50);
    expect(r.revenue).toBe(2500);
  });
});

describe("convertCurrency", () => {
  it("multiplies by the rate", () => {
    expect(convertCurrency(100, 18.5).converted).toBe(1850);
  });
});

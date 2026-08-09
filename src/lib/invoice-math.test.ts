import { describe, expect, it } from "vitest";
import { calculateLine, calculateTotals, roundMoney } from "./invoice-math";

describe("roundMoney", () => {
  it("rounds half up to cents", () => {
    expect(roundMoney(1.005)).toBe(1.01);
    expect(roundMoney(1.004)).toBe(1);
  });
});

describe("exclusive tax", () => {
  it("computes single line", () => {
    const line = calculateLine(
      { quantity: 2, unitPrice: 100, taxRate: 21 },
      "exclusive",
    );
    expect(line.net).toBe(200);
    expect(line.tax).toBe(42);
    expect(line.gross).toBe(242);
  });

  it("applies discount before tax", () => {
    const line = calculateLine(
      { quantity: 1, unitPrice: 100, taxRate: 20, discountPercent: 10 },
      "exclusive",
    );
    expect(line.discountAmount).toBe(10);
    expect(line.net).toBe(90);
    expect(line.tax).toBe(18);
    expect(line.gross).toBe(108);
  });

  it("aggregates multi-rate totals", () => {
    const totals = calculateTotals(
      [
        { quantity: 1, unitPrice: 100, taxRate: 21 },
        { quantity: 1, unitPrice: 50, taxRate: 6 },
        { quantity: 1, unitPrice: 20, taxRate: 0 },
      ],
      "exclusive",
    );
    expect(totals.subtotal).toBe(170);
    expect(totals.taxTotal).toBe(24);
    expect(totals.total).toBe(194);
    expect(totals.taxByRate).toEqual([
      { rate: 6, taxable: 50, tax: 3 },
      { rate: 21, taxable: 100, tax: 21 },
    ]);
  });
});

describe("inclusive tax", () => {
  it("extracts tax from gross", () => {
    const line = calculateLine(
      { quantity: 1, unitPrice: 121, taxRate: 21 },
      "inclusive",
    );
    expect(line.gross).toBe(121);
    expect(line.net).toBe(100);
    expect(line.tax).toBe(21);
  });

  it("totals equal sum of gross lines", () => {
    const totals = calculateTotals(
      [
        { quantity: 1, unitPrice: 121, taxRate: 21 },
        { quantity: 2, unitPrice: 53, taxRate: 6 },
      ],
      "inclusive",
    );
    expect(totals.total).toBe(227);
    expect(totals.taxTotal).toBe(roundMoney(21 + (106 - 106 / 1.06)));
  });
});

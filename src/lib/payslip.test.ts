import { describe, expect, it } from "vitest";
import { calculatePayslipTotals, monthEndISO, monthStartISO } from "./payslip";

describe("calculatePayslipTotals", () => {
  it("nets earnings minus deductions", () => {
    const totals = calculatePayslipTotals(
      [
        { id: "a", label: "Basic", amount: 20000 },
        { id: "b", label: "Overtime", amount: 1500.5 },
      ],
      [
        { id: "c", label: "PAYE", amount: 3200 },
        { id: "d", label: "UIF", amount: 215.05 },
      ],
    );
    expect(totals.gross).toBe(21500.5);
    expect(totals.deductionTotal).toBe(3415.05);
    expect(totals.net).toBe(18085.45);
  });
});

describe("pay month bounds", () => {
  it("finds September 2026", () => {
    expect(monthStartISO("2026-09-07")).toBe("2026-09-01");
    expect(monthEndISO("2026-09-07")).toBe("2026-09-30");
  });
});

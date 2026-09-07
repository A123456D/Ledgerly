import { roundMoney, vatSplit } from "./invoice-math";
import { addDaysISO } from "./format";

function clampNonNeg(n: number): number {
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

export type DiscountKind = "percent" | "flat";

export function invoiceDiscount(input: {
  subtotal: number;
  kind: DiscountKind;
  discount: number;
  vatRate?: number;
}): {
  subtotal: number;
  discountAmount: number;
  afterDiscount: number;
  vat: number;
  total: number;
} {
  const subtotal = roundMoney(clampNonNeg(input.subtotal));
  const discountRaw = clampNonNeg(input.discount);
  const discountAmount =
    input.kind === "percent"
      ? roundMoney(subtotal * (Math.min(100, discountRaw) / 100))
      : roundMoney(Math.min(subtotal, discountRaw));
  const afterDiscount = roundMoney(subtotal - discountAmount);
  const vat = vatSplit(afterDiscount, input.vatRate ?? 0, "net").tax;
  return {
    subtotal,
    discountAmount,
    afterDiscount,
    vat,
    total: roundMoney(afterDiscount + vat),
  };
}

export function priceFromMargin(cost: number, marginPct: number): number | null {
  const c = clampNonNeg(cost);
  const m = Math.min(99.99, Math.max(0, marginPct)) / 100;
  if (m >= 1) return null;
  return roundMoney(c / (1 - m));
}

export function priceFromMarkup(cost: number, markupPct: number): number {
  return roundMoney(clampNonNeg(cost) * (1 + clampNonNeg(markupPct) / 100));
}

export function marginMarkupFromPrice(
  cost: number,
  price: number,
): {
  profit: number;
  marginPct: number;
  markupPct: number;
} {
  const c = clampNonNeg(cost);
  const p = clampNonNeg(price);
  const profit = roundMoney(p - c);
  const marginPct = p === 0 ? 0 : roundMoney((profit / p) * 100);
  const markupPct = c === 0 ? 0 : roundMoney((profit / c) * 100);
  return { profit, marginPct, markupPct };
}

/** Selling price so that (price - cost) after income tax equals desired net profit. */
export function priceForNetProfit(
  cost: number,
  desiredNet: number,
  taxOnProfitPct: number,
): number | null {
  const t = Math.min(99.99, Math.max(0, taxOnProfitPct)) / 100;
  if (t >= 1) return null;
  const grossProfitNeeded = clampNonNeg(desiredNet) / (1 - t);
  return roundMoney(clampNonNeg(cost) + grossProfitNeeded);
}

export function daysBetweenISO(from: string, to: string): number {
  if (!from || !to) return 0;
  const a = new Date(`${from}T12:00:00`);
  const b = new Date(`${to}T12:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86_400_000));
}

export function latePaymentInterest(input: {
  principal: number;
  annualRate: number;
  days: number;
  compound?: boolean;
}): { interest: number; total: number; days: number } {
  const principal = roundMoney(clampNonNeg(input.principal));
  const rate = clampNonNeg(input.annualRate) / 100;
  const days = Math.max(0, Math.floor(input.days));
  if (days === 0 || rate === 0 || principal === 0) {
    return { interest: 0, total: principal, days };
  }
  const interest = input.compound
    ? roundMoney(principal * ((1 + rate / 365) ** days - 1))
    : roundMoney(principal * rate * (days / 365));
  return { interest, total: roundMoney(principal + interest), days };
}

export function salarySplit(input: {
  amount: number;
  direction: "net" | "gross";
  taxPct: number;
  deductionPct: number;
  deductionFlat: number;
}): {
  gross: number;
  tax: number;
  deductions: number;
  net: number;
} | null {
  const taxPct = Math.max(0, input.taxPct) / 100;
  const deductionPct = Math.max(0, input.deductionPct) / 100;
  const keep = 1 - taxPct - deductionPct;
  const flat = clampNonNeg(input.deductionFlat);
  if (keep <= 0) return null;
  const amount = clampNonNeg(input.amount);

  let gross: number;
  if (input.direction === "gross") {
    gross = roundMoney(amount);
  } else {
    gross = roundMoney((amount + flat) / keep);
  }
  const tax = roundMoney(gross * taxPct);
  const percentDeductions = roundMoney(gross * deductionPct);
  const deductions = roundMoney(percentDeductions + flat);
  const net = roundMoney(gross - tax - deductions);
  return { gross, tax, deductions, net };
}

export function cashRunway(input: {
  cash: number;
  monthlyExpenses: number;
  monthlyIncome?: number;
}): {
  netBurn: number;
  months: number | null;
  runwayEnds: string | null;
} {
  const cash = clampNonNeg(input.cash);
  const netBurn = roundMoney(
    Math.max(0, clampNonNeg(input.monthlyExpenses) - clampNonNeg(input.monthlyIncome ?? 0)),
  );
  if (netBurn === 0) {
    return { netBurn: 0, months: null, runwayEnds: null };
  }
  const months = cash / netBurn;
  const wholeMonths = Math.floor(months);
  const extraDays = Math.round((months - wholeMonths) * 30);
  const runwayEnds = addDaysISO(
    new Date().toISOString().slice(0, 10),
    wholeMonths * 30 + extraDays,
  );
  return { netBurn, months: roundMoney(months), runwayEnds };
}

export function breakEven(input: {
  fixedCosts: number;
  pricePerUnit: number;
  variablePerUnit: number;
}): {
  contribution: number;
  units: number | null;
  revenue: number | null;
} {
  const contribution = roundMoney(
    clampNonNeg(input.pricePerUnit) - clampNonNeg(input.variablePerUnit),
  );
  if (contribution <= 0) {
    return { contribution, units: null, revenue: null };
  }
  const units = Math.ceil(clampNonNeg(input.fixedCosts) / contribution);
  return {
    contribution,
    units,
    revenue: roundMoney(units * clampNonNeg(input.pricePerUnit)),
  };
}

export function convertCurrency(
  amount: number,
  rate: number,
): { converted: number; rate: number } {
  const r = clampNonNeg(rate);
  return { converted: roundMoney(clampNonNeg(amount) * r), rate: r };
}

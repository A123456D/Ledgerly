/** Round money to 2 decimal places using banker's-friendly half-up. */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export interface LineInput {
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discountPercent?: number;
}

export interface LineBreakdown {
  grossBeforeDiscount: number;
  discountAmount: number;
  lineBase: number;
  net: number;
  tax: number;
  gross: number;
  taxRate: number;
}

export interface TotalsResult {
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  taxByRate: { rate: number; taxable: number; tax: number }[];
  total: number;
  lines: LineBreakdown[];
}

function lineGrossBeforeTax(line: LineInput): {
  grossBeforeDiscount: number;
  discountAmount: number;
  lineBase: number;
} {
  const qty = Number.isFinite(line.quantity) ? line.quantity : 0;
  const price = Number.isFinite(line.unitPrice) ? line.unitPrice : 0;
  const discountPercent = Math.min(
    100,
    Math.max(0, line.discountPercent ?? 0),
  );
  const grossBeforeDiscount = roundMoney(qty * price);
  const discountAmount = roundMoney(
    (grossBeforeDiscount * discountPercent) / 100,
  );
  const lineBase = roundMoney(grossBeforeDiscount - discountAmount);
  return { grossBeforeDiscount, discountAmount, lineBase };
}

function breakdownExclusive(line: LineInput): LineBreakdown {
  const { grossBeforeDiscount, discountAmount, lineBase } =
    lineGrossBeforeTax(line);
  const rate = Math.max(0, line.taxRate || 0);
  const net = lineBase;
  const tax = roundMoney((net * rate) / 100);
  return {
    grossBeforeDiscount,
    discountAmount,
    lineBase,
    net,
    tax,
    gross: roundMoney(net + tax),
    taxRate: rate,
  };
}

function breakdownInclusive(line: LineInput): LineBreakdown {
  const { grossBeforeDiscount, discountAmount, lineBase } =
    lineGrossBeforeTax(line);
  const rate = Math.max(0, line.taxRate || 0);
  const gross = lineBase;
  const net =
    rate === 0 ? gross : roundMoney(gross / (1 + rate / 100));
  const tax = roundMoney(gross - net);
  return {
    grossBeforeDiscount,
    discountAmount,
    lineBase,
    net,
    tax,
    gross,
    taxRate: rate,
  };
}

export function calculateLine(
  line: LineInput,
  mode: "exclusive" | "inclusive",
): LineBreakdown {
  return mode === "inclusive"
    ? breakdownInclusive(line)
    : breakdownExclusive(line);
}

export function calculateTotals(
  lines: LineInput[],
  mode: "exclusive" | "inclusive",
): TotalsResult {
  const breakdowns = lines.map((line) => calculateLine(line, mode));
  const discountTotal = roundMoney(
    breakdowns.reduce((sum, l) => sum + l.discountAmount, 0),
  );
  const subtotal = roundMoney(
    breakdowns.reduce((sum, l) => sum + l.net, 0),
  );
  const taxTotal = roundMoney(
    breakdowns.reduce((sum, l) => sum + l.tax, 0),
  );
  const total =
    mode === "inclusive"
      ? roundMoney(breakdowns.reduce((sum, l) => sum + l.gross, 0))
      : roundMoney(subtotal + taxTotal);

  const bucketMap = new Map<number, { taxable: number; tax: number }>();
  for (const line of breakdowns) {
    if (line.taxRate === 0 && line.tax === 0) continue;
    const existing = bucketMap.get(line.taxRate) ?? {
      taxable: 0,
      tax: 0,
    };
    existing.taxable = roundMoney(existing.taxable + line.net);
    existing.tax = roundMoney(existing.tax + line.tax);
    bucketMap.set(line.taxRate, existing);
  }

  const taxByRate = [...bucketMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([rate, { taxable, tax }]) => ({ rate, taxable, tax }));

  return {
    subtotal,
    discountTotal,
    taxTotal,
    taxByRate,
    total,
    lines: breakdowns,
  };
}

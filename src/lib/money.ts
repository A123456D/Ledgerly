import { roundMoney } from "./invoice-math";
import { formatDate, todayISO } from "./format";
import type { Expense, Invoice } from "./types";

/**
 * Money & tax math. All functions are pure — UI and tests share them.
 * Turnover figures are always ex-VAT (InvoiceTotals.subtotal is net).
 */

export interface TaxBracket {
  /** Tax on the full bracket below, plus `rate` of the amount over `over`. */
  base: number;
  rate: number;
  over: number;
}

export interface SaTaxTable {
  /** SARS tax year label — the calendar year the Feb year-end falls in. */
  year: number;
  /** Human range, e.g. "1 Mar 2025 – 28 Feb 2026". */
  range: string;
  brackets: TaxBracket[];
  /** Primary rebate (under-65 individuals). */
  rebate: number;
  /** Below this taxable income no tax is due (rebate already applied). */
  threshold: number;
}

/**
 * 2026 individual rates (year ending 28 Feb 2026). When SARS publishes the
 * next year's table, add a new entry and keep this one for old date ranges.
 */
export const SA_TAX_TABLE_2026: SaTaxTable = {
  year: 2026,
  range: "1 Mar 2025 – 28 Feb 2026",
  brackets: [
    { base: 0, rate: 0.18, over: 0 },
    { base: 42678, rate: 0.26, over: 237100 },
    { base: 77362, rate: 0.31, over: 370500 },
    { base: 121475, rate: 0.36, over: 512800 },
    { base: 179147, rate: 0.39, over: 673000 },
    { base: 251258, rate: 0.41, over: 857900 },
    { base: 644489, rate: 0.45, over: 1817000 },
  ],
  rebate: 17235,
  threshold: 95750,
};

/** Annual income tax for an under-65 individual on the given taxable income. */
export function saIncomeTax(
  taxableIncome: number,
  table: SaTaxTable = SA_TAX_TABLE_2026,
): number {
  const taxable = Math.max(0, taxableIncome);
  if (taxable <= table.threshold) return 0;
  let bracket = table.brackets[0];
  for (const b of table.brackets) {
    if (taxable > b.over) bracket = b;
  }
  const annual = bracket.base + (taxable - bracket.over) * bracket.rate - table.rebate;
  return roundMoney(Math.max(0, annual));
}

/** SA tax year label (year ending end of Feb): Mar 2025 – Feb 2026 → 2026. */
export function taxYearOfISO(iso: string): number {
  const [, month] = iso.split("-").map(Number);
  const year = Number(iso.slice(0, 4));
  return month >= 3 ? year + 1 : year;
}

export function taxYearRange(label: number): { start: string; end: string } {
  const start = `${label - 1}-03-01`;
  const leap = (label % 4 === 0 && label % 100 !== 0) || label % 400 === 0;
  const end = leap ? `${label}-02-29` : `${label}-02-28`;
  return { start, end };
}

/** ISO day one year before `iso` (Feb 29 → Feb 28), for the rolling 12-month window. */
export function twelveMonthsBeforeISO(iso: string): string {
  const year = Number(iso.slice(0, 4)) - 1;
  const md = iso.slice(4);
  if (md === "-02-29" && !isLeapYear(year)) return `${year}-02-28`;
  return `${year}${md}`;
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export interface MoneyStats {
  /** Unpaid balance on issued + partial invoices (business currency). */
  outstanding: number;
  /** Overdue subset of that balance. */
  overdueTotal: number;
  overdueCount: number;
  /** Cash actually received this calendar month (full payments + partials). */
  receivedThisMonth: number;
  /** Issued turnover (ex-VAT) so far in the current SA tax year. */
  turnoverTaxYear: number;
  /** Issued turnover (ex-VAT) over the rolling 12 months to today. */
  turnover12m: number;
  /** Issued invoices in other currencies — excluded from the sums above. */
  foreignCount: number;
}

/** Same rule as document-kind.isOverdue: issued/partial with a past due date. */
function invoiceOverdue(inv: Invoice, today: string): boolean {
  if (inv.status !== "issued" && inv.status !== "partial") return false;
  return !!inv.dueDate && inv.dueDate < today;
}

/** Unpaid balance on one invoice (0 for paid/void/draft). */
export function invoiceBalance(inv: Invoice): number {
  if (inv.status !== "issued" && inv.status !== "partial") return 0;
  return roundMoney(Math.max(0, inv.totals.total - (inv.amountPaid ?? 0)));
}

function inMonth(iso: string | undefined, today: string): boolean {
  return !!iso && iso.slice(0, 7) === today.slice(0, 7);
}

export function moneyStats(
  invoices: Invoice[],
  options: { currency: string; today?: string },
): MoneyStats {
  const today = options.today ?? todayISO();
  const stats: MoneyStats = {
    outstanding: 0,
    overdueTotal: 0,
    overdueCount: 0,
    receivedThisMonth: 0,
    turnoverTaxYear: 0,
    turnover12m: 0,
    foreignCount: 0,
  };
  const year = taxYearOfISO(today);
  const { start } = taxYearRange(year);
  const cutoff12m = twelveMonthsBeforeISO(today);

  for (const inv of invoices) {
    if (inv.kind === "quote") continue;
    if (inv.status === "draft" || inv.status === "void") continue;
    if (inv.currency && inv.currency !== options.currency) {
      stats.foreignCount += 1;
      continue;
    }
    if (invoiceOverdue(inv, today)) {
      const balance = invoiceBalance(inv);
      if (balance > 0) {
        stats.overdueTotal = roundMoney(stats.overdueTotal + balance);
        stats.overdueCount += 1;
      }
    }
    stats.outstanding = roundMoney(stats.outstanding + invoiceBalance(inv));

    // Cash received this month: full payments carry paidAt (set when marked
    // paid), partial payments carry amountPaid + paidAt.
    if (inv.status === "paid" && inMonth(inv.paidAt, today)) {
      stats.receivedThisMonth = roundMoney(stats.receivedThisMonth + inv.totals.total);
    } else if (inv.status === "partial" && inMonth(inv.paidAt, today)) {
      stats.receivedThisMonth = roundMoney(
        stats.receivedThisMonth + (inv.amountPaid ?? 0),
      );
    }

    // Turnover is booked on the issue date, ex-VAT, issued documents only.
    const issuedOn = inv.issueDate || "";
    if (issuedOn >= start && issuedOn <= today) {
      stats.turnoverTaxYear = roundMoney(stats.turnoverTaxYear + inv.totals.subtotal);
    }
    if (issuedOn > cutoff12m && issuedOn <= today) {
      stats.turnover12m = roundMoney(stats.turnover12m + inv.totals.subtotal);
    }
  }
  return stats;
}

export type VatThresholdLevel =
  | "none"
  | "voluntary"
  | "approaching"
  | "compulsory"
  | "registered";

export const VAT_COMPULSORY_THRESHOLD = 1_000_000;
export const VAT_COMPULSORY_WARNING = 900_000;
export const VAT_VOLUNTARY_THRESHOLD = 50_000;

export function vatThresholdStatus(
  turnover12m: number,
  vatRegistered: boolean,
): VatThresholdLevel {
  if (vatRegistered) return "registered";
  if (turnover12m >= VAT_COMPULSORY_THRESHOLD) return "compulsory";
  if (turnover12m >= VAT_COMPULSORY_WARNING) return "approaching";
  if (turnover12m >= VAT_VOLUNTARY_THRESHOLD) return "voluntary";
  return "none";
}

/** Deductible amount for income tax: input VAT back out when VAT-registered. */
export function expenseDeductible(expense: Expense, vatRegistered: boolean): number {
  return vatRegistered
    ? roundMoney(Math.max(0, expense.total - expense.vatPortion))
    : expense.total;
}

export interface ProvisionalEstimate {
  taxYear: number;
  /** Human window the numbers cover, e.g. "1 Mar 2026 – 28 Feb 2027". */
  range: string;
  /** Which SARS table the rates come from (latest published). */
  ratesYear: number;
  turnover: number;
  expenses: number;
  taxable: number;
  annualTax: number;
  /** Annual tax as a share of turnover — a practical "set aside" guide. */
  setAsidePct: number;
  /** Annual tax ÷ 12, a per-month provisioning hint. */
  perMonth: number;
  nextDeadline: { label: string; date: string } | null;
}

/**
 * Rough provisional-tax picture from what this app can see: issued invoices
 * (turnover, ex-VAT) minus logged expenses. Other income (salary, interest,
 * investments) is NOT included — the estimate is a floor, not a filing.
 */
export function provisionalEstimate(
  invoices: Invoice[],
  expenses: Expense[],
  options: { vatRegistered: boolean; currency: string; today?: string },
): ProvisionalEstimate {
  const today = options.today ?? todayISO();
  const year = taxYearOfISO(today);
  const { start, end } = taxYearRange(year);

  let turnover = 0;
  for (const inv of invoices) {
    if (inv.kind === "quote") continue;
    if (inv.status === "draft" || inv.status === "void") continue;
    if (inv.currency && inv.currency !== options.currency) continue;
    if (inv.issueDate >= start && inv.issueDate <= end) {
      turnover = roundMoney(turnover + inv.totals.subtotal);
    }
  }

  let expenseTotal = 0;
  for (const e of expenses) {
    if (e.currency && e.currency !== options.currency) continue;
    if (e.date >= start && e.date <= end) {
      expenseTotal = roundMoney(expenseTotal + expenseDeductible(e, options.vatRegistered));
    }
  }

  const taxable = roundMoney(Math.max(0, turnover - expenseTotal));
  const annualTax = saIncomeTax(taxable);
  const window = taxYearRange(year);
  return {
    taxYear: year,
    range: `${formatDate(window.start)} – ${formatDate(window.end)}`,
    ratesYear: SA_TAX_TABLE_2026.year,
    turnover,
    expenses: expenseTotal,
    taxable,
    annualTax,
    setAsidePct: turnover > 0 ? roundMoney((annualTax / turnover) * 100) : 0,
    perMonth: roundMoney(annualTax / 12),
    nextDeadline: nextProvisionalDeadline(today),
  };
}

/**
 * IRP6 provisional deadlines for a Feb year-end: top-up within 6 months
 * (31 Aug) and at year-end (28/29 Feb). Returns the next one from `today`.
 */
export function nextProvisionalDeadline(
  today: string,
): { label: string; date: string } | null {
  const year = taxYearOfISO(today);
  const first = `${year - 1}-08-31`;
  const second = taxYearRange(year).end;
  if (today <= first) return { label: "First provisional (IRP6)", date: first };
  if (today <= second) return { label: "Second provisional (IRP6)", date: second };
  // Between year-end and the new year's Mar 1 (rare — taxYearOfISO flips on 1 Mar).
  return { label: "First provisional (IRP6)", date: `${year}-08-31` };
}

/** Card/banner variant computed once for the dashboard strip. */
export function vatNotice(
  level: VatThresholdLevel,
  turnover12m: number,
): { tone: "info" | "warn" | "alert" | "ok"; title: string; body: string } {
  const fmt = (n: number) => `R${Math.round(n).toLocaleString("en-ZA")}`;
  switch (level) {
    case "compulsory":
      return {
        tone: "alert",
        title: "You may need to register for VAT",
        body: `Rolling 12-month turnover has passed the R1 million compulsory VAT registration threshold (${fmt(turnover12m)}). Check with SARS or your accountant.`,
      };
    case "approaching":
      return {
        tone: "warn",
        title: "Approaching the VAT registration threshold",
        body: `You're within R${Math.max(0, VAT_COMPULSORY_THRESHOLD - Math.round(turnover12m)).toLocaleString("en-ZA")} of the R1 million compulsory registration threshold (rolling 12 months: ${fmt(turnover12m)}).`,
      };
    case "voluntary":
      return {
        tone: "info",
        title: "Voluntary VAT registration is possible",
        body: "Turnover is over R50,000 in the last 12 months — you may register for VAT voluntarily if it suits your clients.",
      };
    case "registered":
      return {
        tone: "ok",
        title: "VAT registered",
        body: "Invoices carry your VAT number and expense input VAT is tracked for your returns.",
      };
    default:
      return { tone: "info", title: "", body: "" };
  }
}

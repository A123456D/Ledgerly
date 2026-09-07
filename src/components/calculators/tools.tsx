"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useState } from "react";
import { getBusiness } from "@/lib/db";
import { formatDate, todayISO } from "@/lib/format";
import {
  breakEven,
  cashRunway,
  convertCurrency,
  daysBetweenISO,
  invoiceDiscount,
  latePaymentInterest,
  marginMarkupFromPrice,
  priceForNetProfit,
  priceFromMargin,
  priceFromMarkup,
  salarySplit,
  type DiscountKind,
} from "@/lib/calculators";
import { Button, DecimalInput, Field, inputClass } from "@/components/ui";
import {
  copyText,
  moneyPlain,
  MoneyField,
  Panel,
  ResultCard,
  Segmented,
  useCopied,
} from "./shared";

function useCurrency() {
  const business = useLiveQuery(() => getBusiness(), []);
  return business?.currency || "ZAR";
}

function useCopyFlash() {
  const { copied, flash } = useCopied();
  async function onCopy(label: string, value: number) {
    if (await copyText(moneyPlain(value))) flash(label);
  }
  return { copied, onCopy };
}

export function DiscountTool() {
  const currency = useCurrency();
  const { copied, onCopy } = useCopyFlash();
  const [subtotal, setSubtotal] = useState(0);
  const [kind, setKind] = useState<DiscountKind>("percent");
  const [discount, setDiscount] = useState(0);
  const [vatRate, setVatRate] = useState(15);
  const result = invoiceDiscount({ subtotal, kind, discount, vatRate });

  return (
    <Panel>
      <Segmented
        value={kind}
        onChange={setKind}
        options={[
          { id: "percent", label: "Percent off" },
          { id: "flat", label: "Flat amount" },
        ]}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <MoneyField label="Invoice subtotal" value={subtotal} onChange={setSubtotal} />
        <MoneyField
          label={kind === "percent" ? "Discount %" : "Discount amount"}
          value={discount}
          onChange={setDiscount}
        />
        <MoneyField
          label="VAT % after discount"
          value={vatRate}
          onChange={setVatRate}
          hint="0 if the invoice is VAT-free"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ResultCard
          label="Discount"
          value={result.discountAmount}
          currency={currency}
          copied={copied === "Discount"}
          onCopy={() => void onCopy("Discount", result.discountAmount)}
        />
        <ResultCard
          label="After discount"
          value={result.afterDiscount}
          currency={currency}
          copied={copied === "After"}
          onCopy={() => void onCopy("After", result.afterDiscount)}
        />
        <ResultCard
          label="VAT"
          value={result.vat}
          currency={currency}
          copied={copied === "VAT"}
          onCopy={() => void onCopy("VAT", result.vat)}
        />
        <ResultCard
          label="Final invoice"
          value={result.total}
          currency={currency}
          copied={copied === "Final"}
          onCopy={() => void onCopy("Final", result.total)}
        />
      </div>
    </Panel>
  );
}

export function MarginTool() {
  const currency = useCurrency();
  const { copied, onCopy } = useCopyFlash();
  const [mode, setMode] = useState<"margin" | "markup" | "price" | "net">("margin");
  const [cost, setCost] = useState(0);
  const [target, setTarget] = useState(0);
  const [taxOnProfit, setTaxOnProfit] = useState(0);

  const priced =
    mode === "margin"
      ? priceFromMargin(cost, target)
      : mode === "markup"
        ? priceFromMarkup(cost, target)
        : mode === "net"
          ? priceForNetProfit(cost, target, taxOnProfit)
          : target;
  const stats = marginMarkupFromPrice(cost, priced ?? 0);

  return (
    <Panel>
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { id: "margin", label: "Target margin %" },
          { id: "markup", label: "Target markup %" },
          { id: "price", label: "From selling price" },
          { id: "net", label: "Net profit goal" },
        ]}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <MoneyField label="Cost" value={cost} onChange={setCost} />
        <MoneyField
          label={
            mode === "margin"
              ? "Gross margin %"
              : mode === "markup"
                ? "Markup %"
                : mode === "net"
                  ? "Desired net profit"
                  : "Selling price"
          }
          value={target}
          onChange={setTarget}
        />
        {mode === "net" ? (
          <MoneyField
            label="Tax on profit %"
            value={taxOnProfit}
            onChange={setTaxOnProfit}
            hint="Leave 0 for gross profit only"
          />
        ) : (
          <div />
        )}
      </div>
      {priced === null ? (
        <p className="text-sm text-red-700">Margin or tax must be under 100%.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ResultCard
            label="Selling price"
            value={priced}
            currency={currency}
            copied={copied === "Price"}
            onCopy={() => void onCopy("Price", priced)}
          />
          <ResultCard
            label="Gross profit"
            value={stats.profit}
            currency={currency}
            copied={copied === "Profit"}
            onCopy={() => void onCopy("Profit", stats.profit)}
          />
          <ResultCard
            label="Margin"
            value={stats.marginPct}
            copied={copied === "Margin"}
            onCopy={() => void onCopy("Margin", stats.marginPct)}
            display={`${stats.marginPct}%`}
          />
          <ResultCard
            label="Markup"
            value={stats.markupPct}
            copied={copied === "Markup"}
            onCopy={() => void onCopy("Markup", stats.markupPct)}
            display={`${stats.markupPct}%`}
          />
        </div>
      )}
    </Panel>
  );
}

export function InterestTool() {
  const currency = useCurrency();
  const { copied, onCopy } = useCopyFlash();
  const [principal, setPrincipal] = useState(0);
  const [annualRate, setAnnualRate] = useState(10);
  const [dueDate, setDueDate] = useState("");
  const [asOf, setAsOf] = useState(todayISO());
  const [compound, setCompound] = useState(false);
  const days = daysBetweenISO(dueDate || asOf, asOf);
  const result = latePaymentInterest({
    principal,
    annualRate,
    days,
    compound,
  });

  return (
    <Panel>
      <p className="text-sm text-[var(--muted)]">
        Simple interest uses a 365-day year. Daily compound is optional. Set your own
        rate — this is not legal advice or a statutory table.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <MoneyField label="Overdue amount" value={principal} onChange={setPrincipal} />
        <MoneyField label="Annual interest %" value={annualRate} onChange={setAnnualRate} />
        <Field label="Due date">
          <input
            type="date"
            className={inputClass}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </Field>
        <Field label="Interest as of">
          <input
            type="date"
            className={inputClass}
            value={asOf}
            onChange={(e) => setAsOf(e.target.value)}
          />
        </Field>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {[5, 8, 10, 12, 15, 18, 20, 24].map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setAnnualRate(r)}
            className={`rounded-full px-2.5 py-1 text-xs tabular-nums ${
              annualRate === r
                ? "bg-teal-800 text-white"
                : "border border-[var(--line)] bg-[var(--wash)] text-[var(--muted)]"
            }`}
          >
            {r}%
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <input
          type="checkbox"
          checked={compound}
          onChange={(e) => setCompound(e.target.checked)}
        />
        Compound daily
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <ResultCard
          label="Days overdue"
          value={result.days}
          copied={copied === "Days"}
          onCopy={() => void onCopy("Days", result.days)}
          display={`${result.days} days`}
        />
        <ResultCard
          label="Interest"
          value={result.interest}
          currency={currency}
          copied={copied === "Interest"}
          onCopy={() => void onCopy("Interest", result.interest)}
        />
        <ResultCard
          label="Amount now due"
          value={result.total}
          currency={currency}
          copied={copied === "Due"}
          onCopy={() => void onCopy("Due", result.total)}
        />
      </div>
      {dueDate ? (
        <p className="text-xs text-[var(--muted)]">
          From {formatDate(dueDate)} to {formatDate(asOf)}.
        </p>
      ) : null}
    </Panel>
  );
}

export function SalaryTool() {
  const currency = useCurrency();
  const { copied, onCopy } = useCopyFlash();
  const [direction, setDirection] = useState<"net" | "gross">("net");
  const [amount, setAmount] = useState(0);
  const [taxPct, setTaxPct] = useState(25);
  const [deductionPct, setDeductionPct] = useState(0);
  const [deductionFlat, setDeductionFlat] = useState(0);
  const result = salarySplit({
    amount,
    direction,
    taxPct,
    deductionPct,
    deductionFlat,
  });

  return (
    <Panel>
      <p className="text-sm text-[var(--muted)]">
        Estimated only. Enter your tax and deduction rates — this is not a payroll or
        SARS/HMRC calculator.
      </p>
      <Segmented
        value={direction}
        onChange={setDirection}
        options={[
          { id: "net", label: "Net → gross" },
          { id: "gross", label: "Gross → net" },
        ]}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MoneyField
          label={direction === "net" ? "Take-home needed" : "Gross pay"}
          value={amount}
          onChange={setAmount}
        />
        <MoneyField label="Income tax %" value={taxPct} onChange={setTaxPct} />
        <MoneyField
          label="Other deductions %"
          value={deductionPct}
          onChange={setDeductionPct}
        />
        <MoneyField
          label="Flat deductions"
          value={deductionFlat}
          onChange={setDeductionFlat}
        />
      </div>
      {!result ? (
        <p className="text-sm text-red-700">Tax plus deductions must stay under 100%.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ResultCard
            label="Gross"
            value={result.gross}
            currency={currency}
            copied={copied === "Gross"}
            onCopy={() => void onCopy("Gross", result.gross)}
          />
          <ResultCard
            label="Tax"
            value={result.tax}
            currency={currency}
            copied={copied === "Tax"}
            onCopy={() => void onCopy("Tax", result.tax)}
          />
          <ResultCard
            label="Deductions"
            value={result.deductions}
            currency={currency}
            copied={copied === "Ded"}
            onCopy={() => void onCopy("Ded", result.deductions)}
          />
          <ResultCard
            label="Take-home"
            value={result.net}
            currency={currency}
            copied={copied === "Net"}
            onCopy={() => void onCopy("Net", result.net)}
          />
        </div>
      )}
    </Panel>
  );
}

const FX_CODES = [
  "ZAR",
  "USD",
  "EUR",
  "GBP",
  "AUD",
  "CAD",
  "NZD",
  "JPY",
  "CHF",
  "SEK",
  "NOK",
  "DKK",
  "INR",
  "CNY",
  "BRL",
  "MXN",
  "SGD",
  "HKD",
  "PLN",
  "CZK",
];

const FX_CACHE = "easyledger-fx-v1";

type FxCache = {
  base: string;
  date: string;
  rates: Record<string, number>;
};

async function fetchFxRates(base: string): Promise<{ date: string; rates: Record<string, number> }> {
  const code = base.toUpperCase();
  try {
    const res = await fetch(
      `https://api.frankfurter.app/latest?from=${encodeURIComponent(code)}`,
    );
    if (res.ok) {
      const data = (await res.json()) as {
        date?: string;
        rates?: Record<string, number>;
      };
      if (data.rates && Object.keys(data.rates).length) {
        return { date: data.date ?? "", rates: data.rates };
      }
    }
  } catch {
    /* try CDN mirror */
  }
  const res = await fetch(
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${code.toLowerCase()}.min.json`,
  );
  if (!res.ok) throw new Error("Rate lookup failed");
  const data = (await res.json()) as Record<string, unknown>;
  const table = data[code.toLowerCase()] as Record<string, number> | undefined;
  if (!table) throw new Error("Rate lookup failed");
  const rates: Record<string, number> = {};
  for (const [key, value] of Object.entries(table)) {
    if (typeof value === "number") rates[key.toUpperCase()] = value;
  }
  return { date: typeof data.date === "string" ? data.date : "", rates };
}

export function FxTool() {
  const home = useCurrency();
  const { copied, onCopy } = useCopyFlash();
  const [from, setFrom] = useState(home);
  const [to, setTo] = useState(home === "ZAR" ? "USD" : "ZAR");
  const [amount, setAmount] = useState(0);
  const [rate, setRate] = useState(1);
  const [status, setStatus] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    setFrom(home);
    setTo(home === "ZAR" ? "USD" : "ZAR");
  }, [home]);

  async function loadRates(base: string, quote: string) {
    setStatus("Fetching live rates…");
    try {
      const { date: asOf, rates } = await fetchFxRates(base);
      const payload: FxCache = { base, date: asOf, rates };
      localStorage.setItem(FX_CACHE, JSON.stringify(payload));
      const next = quote === base ? 1 : rates[quote];
      if (!next) throw new Error(`No rate for ${quote}`);
      setRate(next);
      setDate(asOf);
      setStatus(asOf ? `Live mid-market ${asOf}` : "Live mid-market");
    } catch {
      try {
        const cached = JSON.parse(localStorage.getItem(FX_CACHE) || "null") as FxCache | null;
        if (cached?.base === base && cached.rates[quote]) {
          setRate(cached.rates[quote]);
          setDate(cached.date);
          setStatus(`Offline cache ${cached.date || ""}`.trim());
          return;
        }
      } catch {
        /* ignore */
      }
      setStatus("Could not fetch rates — enter a rate yourself.");
    }
  }

  const converted = convertCurrency(amount, rate).converted;

  return (
    <Panel>
      <p className="text-sm text-[var(--muted)]">
        Live rates when you are online. Log a foreign invoice or expense, then copy
        the converted amount. You can always type a rate yourself.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MoneyField label="Amount" value={amount} onChange={setAmount} />
        <Field label="From">
          <select className={inputClass} value={from} onChange={(e) => setFrom(e.target.value)}>
            {FX_CODES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="To">
          <select className={inputClass} value={to} onChange={(e) => setTo(e.target.value)}>
            {FX_CODES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <MoneyField
          label={`Rate (${from} → ${to})`}
          value={rate}
          onChange={setRate}
          hint="Override anytime"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={() => void loadRates(from, to)}>
          Fetch live rate
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setFrom(to);
            setTo(from);
            setRate(rate ? 1 / rate : 1);
          }}
        >
          Swap
        </Button>
        {status ? <span className="self-center text-xs text-[var(--muted)]">{status}</span> : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <ResultCard
          label={from}
          value={amount}
          currency={from}
          copied={copied === "From"}
          onCopy={() => void onCopy("From", amount)}
        />
        <ResultCard
          label={to}
          value={converted}
          currency={to}
          copied={copied === "To"}
          onCopy={() => void onCopy("To", converted)}
        />
      </div>
      {date ? (
        <p className="text-xs text-[var(--muted)]">Reference date {date}.</p>
      ) : null}
    </Panel>
  );
}

export function RunwayTool() {
  const currency = useCurrency();
  const { copied, onCopy } = useCopyFlash();
  const [cash, setCash] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [income, setIncome] = useState(0);
  const result = cashRunway({
    cash,
    monthlyExpenses: expenses,
    monthlyIncome: income,
  });

  return (
    <Panel>
      <div className="grid gap-4 sm:grid-cols-3">
        <MoneyField label="Cash on hand" value={cash} onChange={setCash} />
        <MoneyField
          label="Average monthly costs"
          value={expenses}
          onChange={setExpenses}
        />
        <MoneyField
          label="Average monthly income"
          value={income}
          onChange={setIncome}
          hint="Optional — subtracts from burn"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <ResultCard
          label="Monthly net burn"
          value={result.netBurn}
          currency={currency}
          copied={copied === "Burn"}
          onCopy={() => void onCopy("Burn", result.netBurn)}
        />
        <ResultCard
          label="Runway"
          value={result.months ?? 0}
          copied={copied === "Months"}
          onCopy={() => void onCopy("Months", result.months ?? 0)}
          display={
            result.netBurn === 0
              ? "Not burning"
              : `${result.months} months`
          }
        />
        <ResultCard
          label="Cash-out around"
          value={0}
          copied={copied === "Date"}
          onCopy={() => {
            if (result.runwayEnds) {
              void copyText(result.runwayEnds).then((ok) => {
                if (ok) void onCopy("Date", 0);
              });
            }
          }}
          display={result.runwayEnds ? formatDate(result.runwayEnds) : "—"}
        />
      </div>
    </Panel>
  );
}

export function BreakEvenTool() {
  const currency = useCurrency();
  const { copied, onCopy } = useCopyFlash();
  const [fixed, setFixed] = useState(0);
  const [price, setPrice] = useState(0);
  const [variable, setVariable] = useState(0);
  const result = breakEven({
    fixedCosts: fixed,
    pricePerUnit: price,
    variablePerUnit: variable,
  });

  return (
    <Panel>
      <div className="grid gap-4 sm:grid-cols-3">
        <MoneyField label="Fixed costs" value={fixed} onChange={setFixed} />
        <MoneyField label="Price per unit / job" value={price} onChange={setPrice} />
        <MoneyField
          label="Variable cost per unit"
          value={variable}
          onChange={setVariable}
        />
      </div>
      {result.units === null ? (
        <p className="text-sm text-red-700">
          Price must be higher than variable cost, or you never break even.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <ResultCard
            label="Contribution each"
            value={result.contribution}
            currency={currency}
            copied={copied === "Cont"}
            onCopy={() => void onCopy("Cont", result.contribution)}
          />
          <ResultCard
            label="Units / jobs to break even"
            value={result.units}
            copied={copied === "Units"}
            onCopy={() => void onCopy("Units", result.units ?? 0)}
          />
          <ResultCard
            label="Break-even revenue"
            value={result.revenue ?? 0}
            currency={currency}
            copied={copied === "Rev"}
            onCopy={() => void onCopy("Rev", result.revenue ?? 0)}
          />
        </div>
      )}
    </Panel>
  );
}

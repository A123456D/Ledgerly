"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getBusiness } from "@/lib/db";
import { formatMoney, uid } from "@/lib/format";
import { vatSplit, roundMoney, type VatAmountKind, type VatSplit } from "@/lib/invoice-math";
import {
  createDraftInvoice,
  emptyLine,
  saveInvoice,
} from "@/lib/invoice-service";
import { documentHref } from "@/lib/document-kind";
import { Button, DecimalInput, Field } from "@/components/ui";
import {
  copyText,
  moneyPlain,
  ResultCard,
  Segmented,
  useCopied,
} from "./shared";

const COMMON_RATES = [0, 5, 6, 9, 10, 12, 13.5, 15, 19, 20, 21, 22, 23, 25, 27];

type Row = VatSplit & { id: string; rate: number; kind: VatAmountKind };

const KIND_LABEL: Record<VatAmountKind, string> = {
  net: "Net (ex VAT)",
  tax: "VAT amount",
  gross: "Gross (inc VAT)",
};

export function VatTool() {
  const router = useRouter();
  const business = useLiveQuery(() => getBusiness(), []);
  const currency = business?.currency || "ZAR";
  const defaultRate = business?.defaultTaxRate ?? 15;
  const { copied, flash } = useCopied();

  const [kind, setKind] = useState<VatAmountKind>("net");
  const [amount, setAmount] = useState(0);
  const [rate, setRate] = useState<number | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);

  const activeRate = rate ?? defaultRate;
  const split = useMemo(
    () => vatSplit(amount, activeRate, kind),
    [amount, activeRate, kind],
  );

  const rates = useMemo(() => {
    const set = new Set(COMMON_RATES);
    set.add(defaultRate);
    return [...set].sort((a, b) => a - b);
  }, [defaultRate]);

  const rowTotals = useMemo(() => {
    return rows.reduce(
      (acc, row) => ({
        net: roundMoney(acc.net + row.net),
        tax: roundMoney(acc.tax + row.tax),
        gross: roundMoney(acc.gross + row.gross),
      }),
      { net: 0, tax: 0, gross: 0 },
    );
  }, [rows]);

  async function onCopy(label: string, value: number) {
    if (await copyText(moneyPlain(value))) flash(label);
  }

  function addRow() {
    if (split.net === 0 && split.tax === 0 && split.gross === 0) return;
    setRows((current) => [
      ...current,
      { id: uid("vat"), rate: activeRate, kind, ...split },
    ]);
  }

  async function startInvoice() {
    const lines = rows.length
      ? rows
      : split.net || split.tax || split.gross
        ? [{ rate: activeRate, kind, ...split }]
        : [];
    if (!lines.length) return;
    setBusy(true);
    try {
      const invoice = await createDraftInvoice({ kind: "invoice" });
      const allGross = lines.every((line) => line.kind === "gross");
      invoice.taxMode = allGross ? "inclusive" : "exclusive";
      invoice.lineItems = lines.map((line) => ({
        ...emptyLine(line.rate),
        description: `Item at ${line.rate}% VAT`,
        quantity: 1,
        unitPrice: allGross ? line.gross : line.net,
        taxRate: line.rate,
      }));
      await saveInvoice(invoice);
      router.push(documentHref("invoice", invoice.id));
    } finally {
      setBusy(false);
    }
  }

  const empty =
    rows.length === 0 && split.net === 0 && split.tax === 0 && split.gross === 0;

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="min-w-0 space-y-4 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3.5 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <Segmented
            value={kind}
            onChange={setKind}
            options={(Object.keys(KIND_LABEL) as VatAmountKind[]).map((id) => ({
              id,
              label: KIND_LABEL[id],
            }))}
          />
          <Button
            className="w-full sm:w-auto"
            onClick={() => void startInvoice()}
            disabled={busy || empty}
          >
            New invoice from this
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={KIND_LABEL[kind]}>
            <DecimalInput value={amount} onChange={setAmount} />
          </Field>
          <Field label="VAT rate %" hint={`Default from settings: ${defaultRate}%`}>
            <DecimalInput value={activeRate} onChange={setRate} />
          </Field>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {rates.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRate(r)}
              className={`rounded-full px-2.5 py-1 text-xs tabular-nums transition ${
                activeRate === r
                  ? "bg-teal-800 text-white"
                  : "border border-[var(--line)] bg-[var(--wash)] text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              {r}%
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <ResultCard
            label="Net"
            value={split.net}
            currency={currency}
            copied={copied === "Net"}
            onCopy={() => void onCopy("Net", split.net)}
          />
          <ResultCard
            label={`VAT ${activeRate}%`}
            value={split.tax}
            currency={currency}
            copied={copied === "VAT"}
            onCopy={() => void onCopy("VAT", split.tax)}
          />
          <ResultCard
            label="Gross"
            value={split.gross}
            currency={currency}
            copied={copied === "Gross"}
            onCopy={() => void onCopy("Gross", split.gross)}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={addRow}>
            Add to breakdown
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setAmount(0);
              setRows([]);
            }}
          >
            Clear
          </Button>
          {copied ? (
            <span className="self-center text-xs text-[var(--muted)]">
              Copied {copied}
            </span>
          ) : null}
        </div>
      </section>

      <section className="min-w-0 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3.5 sm:p-5">
        <h2 className="font-[family-name:var(--font-display)] text-xl">Breakdown</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Stack mixed rates, then copy the totals or drop them onto a new invoice.
        </p>
        {rows.length === 0 ? (
          <p className="mt-6 text-sm text-[var(--muted)]">
            No lines yet. Calculate an amount, then add it here.
          </p>
        ) : (
          <>
            <div className="mt-4 space-y-2 sm:hidden">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="rounded-lg border border-[var(--line)] bg-[var(--wash)]/50 p-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="tabular-nums font-medium">{row.rate}% VAT</span>
                    <button
                      type="button"
                      className="min-h-11 text-xs text-red-700 underline sm:min-h-0"
                      onClick={() =>
                        setRows((current) => current.filter((r) => r.id !== row.id))
                      }
                    >
                      Remove
                    </button>
                  </div>
                  <p className="mt-1 tabular-nums text-[var(--muted)]">
                    {formatMoney(row.net, currency)} + {formatMoney(row.tax, currency)} ={" "}
                    {formatMoney(row.gross, currency)}
                  </p>
                </div>
              ))}
              <p className="pt-1 text-sm font-medium tabular-nums">
                Total {formatMoney(rowTotals.gross, currency)}
              </p>
            </div>
            <div className="mt-4 hidden overflow-x-auto sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[var(--muted)]">
                    <th className="pb-2 font-medium">Rate</th>
                    <th className="pb-2 text-right font-medium">Net</th>
                    <th className="pb-2 text-right font-medium">VAT</th>
                    <th className="pb-2 text-right font-medium">Gross</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-[var(--line)]">
                      <td className="py-2 tabular-nums">{row.rate}%</td>
                      <td className="py-2 text-right tabular-nums">
                        {formatMoney(row.net, currency)}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {formatMoney(row.tax, currency)}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {formatMoney(row.gross, currency)}
                      </td>
                      <td className="py-2 text-right">
                        <button
                          type="button"
                          className="text-xs text-red-700 hover:underline"
                          onClick={() =>
                            setRows((current) =>
                              current.filter((r) => r.id !== row.id),
                            )
                          }
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[var(--ink)] font-medium">
                    <td className="pt-3">Total</td>
                    <td className="pt-3 text-right tabular-nums">
                      {formatMoney(rowTotals.net, currency)}
                    </td>
                    <td className="pt-3 text-right tabular-nums">
                      {formatMoney(rowTotals.tax, currency)}
                    </td>
                    <td className="pt-3 text-right tabular-nums">
                      {formatMoney(rowTotals.gross, currency)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

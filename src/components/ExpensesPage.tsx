"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { Button, DecimalInput, Field, PageHeader, inputClass } from "@/components/ui";
import { db } from "@/lib/db";
import { formatDate, formatMoney, todayISO } from "@/lib/format";
import {
  deleteExpense,
  emptyExpense,
  saveExpense,
} from "@/lib/expense-service";
import {
  expenseDeductible,
  provisionalEstimate,
  taxYearOfISO,
  taxYearRange,
} from "@/lib/money";
import {
  EXPENSE_CATEGORY_LABELS,
  type Expense,
  type ExpenseCategory,
} from "@/lib/types";

const CATEGORIES = Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[];

function TaxSummary({
  turnover,
  expenses,
  taxable,
  annualTax,
  setAsidePct,
  perMonth,
  yearEnding,
  range,
  ratesYear,
  nextDeadline,
  currency,
  vatRegistered,
}: {
  turnover: number;
  expenses: number;
  taxable: number;
  annualTax: number;
  setAsidePct: number;
  perMonth: number;
  yearEnding: string;
  range: string;
  ratesYear: number;
  nextDeadline: { label: string; date: string } | null;
  currency: string;
  vatRegistered: boolean;
}) {
  const rows: Array<{ label: string; value: string; strong?: boolean }> = [
    { label: "Invoiced (excl. VAT)", value: formatMoney(turnover, currency) },
    {
      label: vatRegistered ? "Expenses (excl. input VAT)" : "Expenses",
      value: `− ${formatMoney(expenses, currency)}`,
    },
    { label: "Estimated taxable income", value: formatMoney(taxable, currency) },
    {
      label: "Estimated tax for the year",
      value: formatMoney(annualTax, currency),
      strong: true,
    },
  ];
  return (
    <section className="mb-6 rounded-xl border border-[var(--line)] bg-[var(--panel)]">
      <div className="border-b border-[var(--line)] bg-[var(--wash)] px-4 py-3">
        <h2 className="font-[family-name:var(--font-display)] text-base text-[var(--ink)]">
          Tax estimate · year ending {yearEnding}
        </h2>
        <p className="mt-0.5 text-xs text-[var(--muted)]">
          From invoices issued {range} and logged expenses, at {ratesYear}{" "}
          individual rates (latest published). A floor, not a filing — salary
          and other income aren&apos;t included.
        </p>
      </div>
      <dl className="space-y-1.5 px-4 py-3 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-3">
            <dt className="text-[var(--muted)]">{row.label}</dt>
            <dd
              className={`tabular-nums ${row.strong ? "font-medium text-[var(--ink)]" : "text-[var(--ink)]"}`}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-col gap-1.5 border-t border-[var(--line)] px-4 py-3 text-xs text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
        <span>
          {annualTax > 0
            ? `Set aside about ${setAsidePct}% of what you bill — roughly ${formatMoney(perMonth, currency)} a month.`
            : "No tax estimate yet — issue invoices or log expenses to see one."}
        </span>
        {nextDeadline ? (
          <span className="shrink-0 rounded-md bg-[var(--wash)] px-2 py-1 font-medium text-[var(--ink)]">
            {nextDeadline.label} · {formatDate(nextDeadline.date)}
          </span>
        ) : null}
      </div>
    </section>
  );
}

function ExpenseForm({
  draft,
  currency,
  vatRegistered,
  editing,
  busy,
  error,
  onChange,
  onSave,
  onCancel,
}: {
  draft: Expense;
  currency: string;
  vatRegistered: boolean;
  editing: boolean;
  busy: boolean;
  error: string;
  onChange: (patch: Partial<Expense>) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <section className="mb-6 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
      <h2 className="mb-3 font-[family-name:var(--font-display)] text-base text-[var(--ink)]">
        {editing ? "Edit expense" : "Log an expense"}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Date">
          <input
            type="date"
            className={inputClass}
            value={draft.date}
            onChange={(e) => onChange({ date: e.target.value })}
          />
        </Field>
        <Field label="Paid to (vendor)">
          <input
            className={inputClass}
            placeholder="e.g. Vodacom"
            value={draft.vendor}
            maxLength={120}
            onChange={(e) => onChange({ vendor: e.target.value })}
          />
        </Field>
        <Field label="Category">
          <select
            className={inputClass}
            value={draft.category}
            onChange={(e) => onChange({ category: e.target.value as ExpenseCategory })}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {EXPENSE_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field label={`Total paid (${currency})`}>
          <DecimalInput
            value={draft.total}
            onChange={(n) => onChange({ total: n })}
            align="right"
          />
        </Field>
        {vatRegistered ? (
          <Field
            label={`VAT portion (${currency})`}
            hint="Input VAT you'd claim back"
          >
            <DecimalInput
              value={draft.vatPortion}
              onChange={(n) => onChange({ vatPortion: n })}
              align="right"
            />
          </Field>
        ) : null}
        <Field label="What it was for">
          <input
            className={inputClass}
            placeholder="Optional note"
            value={draft.description}
            maxLength={300}
            onChange={(e) => onChange({ description: e.target.value })}
          />
        </Field>
      </div>
      {error ? (
        <p className="mt-2 text-xs text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-3 flex gap-2">
        <Button onClick={onSave} disabled={busy}>
          {editing ? "Save changes" : "Add expense"}
        </Button>
        {editing ? (
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        ) : null}
      </div>
    </section>
  );
}

export function ExpensesPage() {
  const business = useLiveQuery(() => db.business.get("default"), []);
  const expenses = useLiveQuery(
    () => db.expenses.orderBy("date").reverse().toArray(),
    [],
  );
  const invoices = useLiveQuery(() => db.invoices.toArray(), []);
  const [draft, setDraft] = useState<Expense | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const currency = business?.currency ?? "ZAR";
  const vatRegistered = !!business?.vatRegistered;

  const ready = business !== undefined && expenses !== undefined && invoices !== undefined;

  const estimate = useMemo(() => {
    if (!business) return null;
    return provisionalEstimate(invoices ?? [], expenses ?? [], {
      vatRegistered,
      currency,
    });
  }, [business, invoices, expenses, vatRegistered, currency]);

  function patchDraft(patch: Partial<Expense>) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }

  async function onSave() {
    if (!draft) return;
    setBusy(true);
    setError("");
    try {
      await saveExpense({ ...draft, currency });
      setDraft(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save expense");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this expense? This cannot be undone.")) return;
    setBusy(true);
    try {
      await deleteExpense(id);
      if (draft?.id === id) setDraft(null);
    } finally {
      setBusy(false);
    }
  }

  const { start, end } = taxYearRange(
    estimate?.taxYear ?? taxYearOfISO(todayISO()),
  );

  return (
    <div className="min-w-0">
      <PageHeader
        title="Expenses & Tax"
        subtitle="Log what you spend, see a running tax estimate — data stays on this device."
        actions={
          draft ? null : (
            <Button
              variant="secondary"
              onClick={() => {
                setError("");
                setDraft(emptyExpense(currency));
              }}
              disabled={!ready}
            >
              Add expense
            </Button>
          )
        }
      />

      {!ready ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : (
        <>
          {estimate ? (
            <TaxSummary
              turnover={estimate.turnover}
              expenses={estimate.expenses}
              taxable={estimate.taxable}
              annualTax={estimate.annualTax}
              setAsidePct={estimate.setAsidePct}
              perMonth={estimate.perMonth}
              yearEnding={formatDate(taxYearRange(estimate.taxYear).end)}
              range={estimate.range}
              ratesYear={estimate.ratesYear}
              nextDeadline={estimate.nextDeadline}
              currency={currency}
              vatRegistered={vatRegistered}
            />
          ) : null}

          {draft ? (
            <ExpenseForm
              draft={draft}
              currency={currency}
              vatRegistered={vatRegistered}
              editing={expenses?.some((e) => e.id === draft.id) ?? false}
              busy={busy}
              error={error}
              onChange={patchDraft}
              onSave={onSave}
              onCancel={() => {
                setDraft(null);
                setError("");
              }}
            />
          ) : null}

          {expenses && expenses.length > 0 ? (
            <section className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--panel)]">
              <table className="w-full min-w-[34rem] text-left text-sm">
                <thead className="border-b border-[var(--line)] bg-[var(--wash)] text-xs uppercase tracking-wider text-[var(--muted)]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Expense</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 text-right font-medium">
                      {vatRegistered ? "Deductible" : "Amount"}
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => {
                    const inTaxYear = e.date >= start && e.date <= end;
                    return (
                      <tr
                        key={e.id}
                        className={`border-b border-[var(--line)] last:border-0 ${
                          inTaxYear ? "" : "opacity-50"
                        }`}
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-[var(--muted)]">
                          {formatDate(e.date)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-[var(--ink)]">
                            {e.vendor || "Expense"}
                          </span>
                          {e.description ? (
                            <span className="block text-xs text-[var(--muted)]">
                              {e.description}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-[var(--muted)]">
                          {EXPENSE_CATEGORY_LABELS[e.category]}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatMoney(
                            expenseDeductible(e, vatRegistered),
                            e.currency || currency,
                          )}
                          {vatRegistered && e.vatPortion > 0 ? (
                            <span className="block text-xs text-[var(--muted)]">
                              paid {formatMoney(e.total, e.currency || currency)}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              disabled={busy}
                              onClick={() => {
                                setError("");
                                setDraft({ ...e });
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              className="text-red-700 hover:bg-red-50 hover:text-red-800"
                              disabled={busy}
                              onClick={() => onDelete(e.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          ) : !draft ? (
            <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--panel)]/60 px-4 py-12 text-center sm:px-6 sm:py-16">
              <p className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
                No expenses logged yet
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">
                Data, fuel, software, home office — log what you spend and the
                tax estimate updates instantly.
              </p>
              <Button
                className="mt-6"
                onClick={() => {
                  setError("");
                  setDraft(emptyExpense(currency));
                }}
              >
                Log your first expense
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

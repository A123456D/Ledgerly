"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/format";
import { DecimalInput, Field } from "@/components/ui";

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function moneyPlain(n: number) {
  return n.toFixed(2);
}

export function useCopied() {
  const [copied, setCopied] = useState("");
  function flash(label: string) {
    setCopied(label);
    window.setTimeout(() => setCopied(""), 1600);
  }
  return { copied, flash };
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
}) {
  return (
    <div className="flex min-w-0 flex-wrap gap-1">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`min-h-11 rounded-md px-3 py-2 text-sm transition sm:min-h-0 sm:py-1.5 ${
            value === opt.id
              ? "bg-[var(--ink)] text-[var(--paper)]"
              : "bg-[var(--wash)] text-[var(--muted)] hover:text-[var(--ink)]"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function ResultCard({
  label,
  value,
  currency,
  copied,
  onCopy,
  display,
}: {
  label: string;
  value: number;
  currency?: string;
  copied: boolean;
  onCopy: () => void;
  display?: string;
}) {
  const shown =
    display ??
    (currency ? formatMoney(value, currency) : value.toLocaleString("en-ZA"));
  return (
    <button
      type="button"
      onClick={onCopy}
      className="min-w-0 rounded-lg border border-[var(--line)] bg-[var(--wash)]/60 px-3 py-3 text-left transition hover:border-teal-700/40"
    >
      <div className="text-xs text-[var(--muted)]">{label}</div>
      <div className="mt-1 break-words font-[family-name:var(--font-display)] text-lg tabular-nums text-[var(--ink)] sm:text-xl">
        {shown}
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-wide text-[var(--muted)]">
        {copied ? "Copied" : "Tap to copy"}
      </div>
    </button>
  );
}

export function Panel({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 space-y-4 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3.5 sm:p-5">
      {title ? (
        <h2 className="font-[family-name:var(--font-display)] text-xl">{title}</h2>
      ) : null}
      {children}
    </section>
  );
}

export function MoneyField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <DecimalInput value={value} onChange={onChange} />
    </Field>
  );
}

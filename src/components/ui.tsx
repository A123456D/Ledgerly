"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ensureDefaults } from "@/lib/db";
import { InstallAppButton } from "@/components/InstallAppButton";
import { OfflineBanner } from "@/components/OfflineBanner";
import { PwaRegister } from "@/components/PwaRegister";
import { AutoBackupRunner } from "@/components/AutoBackupRunner";
import { assetUrl } from "@/lib/asset";
import { APP_NAME, BRAND_MARK_PATH } from "@/lib/brand";
import { statusDisplay } from "@/lib/document-kind";
import type { DocKind } from "@/lib/types";
import { parseNonNegativeDecimal } from "@/lib/decimal-input";

const links = [
  { href: "/", label: "Invoices" },
  { href: "/quotes", label: "Quotes" },
  { href: "/payslips", label: "Payslips" },
  { href: "/clients", label: "Clients" },
  { href: "/items", label: "Catalog" },
  { href: "/calculator", label: "Calculator" },
  { href: "/templates", label: "Templates" },
  { href: "/settings", label: "Settings" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ensureDefaults().then(() => setReady(true));
  }, []);

  return (
    <div className="flex min-h-full min-h-[100dvh] max-w-[100vw] flex-col overflow-x-clip pb-[env(safe-area-inset-bottom)]">
      <PwaRegister />
      <AutoBackupRunner />
      <OfflineBanner />
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--panel)]/95 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto max-w-7xl pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] sm:px-6">
          <div className="flex items-center justify-between gap-3 py-2.5">
            <Link href="/" className="flex min-w-0 items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={assetUrl(BRAND_MARK_PATH)}
                alt={APP_NAME}
                width={36}
                height={36}
                className="h-8 w-8 shrink-0 rounded-[0.55rem] object-contain sm:h-9 sm:w-9"
              />
              <span className="truncate font-[family-name:var(--font-display)] text-lg text-[var(--ink)] sm:text-xl">
                {APP_NAME}
              </span>
            </Link>
            <div className="shrink-0">
              <InstallAppButton />
            </div>
          </div>
          <nav className="flex flex-wrap gap-1 pb-2.5">
            {links.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/" || pathname.startsWith("/invoice")
                  : link.href === "/quotes"
                    ? pathname.startsWith("/quote")
                    : link.href === "/payslips"
                      ? pathname.startsWith("/payslip")
                      : link.href === "/calculator"
                        ? pathname.startsWith("/calculator") ||
                          pathname.startsWith("/vat")
                        : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`inline-flex min-h-11 shrink-0 items-center rounded-md px-3 py-2 text-sm whitespace-nowrap transition sm:min-h-0 sm:py-1.5 ${
                    active
                      ? "bg-[var(--ink)] text-[var(--paper)]"
                      : "text-[var(--muted)] hover:bg-[var(--wash)] hover:text-[var(--ink)]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full min-w-0 max-w-7xl flex-1 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] py-4 sm:px-6 sm:py-8">
        {ready ? children : <p className="text-sm text-[var(--muted)]">Loading…</p>}
      </main>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.35rem,6vw,2.25rem)] tracking-tight text-[var(--ink)] sm:text-4xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 max-w-xl text-sm text-[var(--muted)]">{subtitle}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">{actions}</div>
      ) : null}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  const styles = {
    primary:
      "bg-[var(--accent)] text-white hover:brightness-110 shadow-sm",
    secondary:
      "bg-[var(--panel)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--wash)]",
    danger: "bg-red-700 text-white hover:bg-red-600",
    ghost: "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--wash)]",
  }[variant];
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center rounded-md px-3.5 py-2.5 text-base font-medium transition disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0 sm:py-2 sm:text-sm ${styles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="block text-sm">
      <div className="mb-1 text-[var(--muted)]">{label}</div>
      {children}
      {hint ? <span className="mt-1 block text-xs text-[var(--muted)]">{hint}</span> : null}
    </div>
  );
}

export const inputClass =
  "w-full min-w-0 max-w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2.5 text-base text-[var(--ink)] outline-none ring-[var(--accent)] placeholder:text-neutral-400 focus:ring-2 sm:py-2 sm:text-sm";

/** Text input for money/qty — no spinners, allows typing decimals naturally. */
export function DecimalInput({
  value,
  onChange,
  className = inputClass,
  placeholder = "0",
  align = "left",
  disabled,
}: {
  value: number;
  onChange: (n: number) => void;
  className?: string;
  placeholder?: string;
  align?: "left" | "right";
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState("");
  const display =
    draft !== null ? draft : value === 0 ? "" : String(value);

  return (
    <div className="min-w-0">
      <input
        type="text"
        inputMode="decimal"
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        className={`${className} ${align === "right" ? "text-right tabular-nums" : ""} ${
          error ? "border-red-400" : ""
        }`}
        placeholder={placeholder}
        value={display}
        onChange={(e) => {
          const parsed = parseNonNegativeDecimal(e.target.value);
          setDraft(parsed.draft);
          if (parsed.ok) {
            setError("");
            onChange(parsed.value);
          } else {
            setError(parsed.error);
          }
        }}
        onBlur={() => {
          setDraft(null);
          setError("");
        }}
      />
      {error ? (
        <p className="mt-1 text-[11px] leading-tight text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function StatusPill({
  status,
  kind,
}: {
  status: string;
  kind?: DocKind | null;
}) {
  const map: Record<string, string> = {
    draft: "bg-amber-100 text-amber-900",
    issued: "bg-teal-100 text-teal-900",
    paid: "bg-emerald-100 text-emerald-900",
    accepted: "bg-emerald-100 text-emerald-900",
    declined: "bg-rose-100 text-rose-800",
    void: "bg-neutral-200 text-neutral-600",
  };
  const label = statusDisplay(status, kind);
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${map[status] || "bg-neutral-100"}`}
    >
      {label}
    </span>
  );
}

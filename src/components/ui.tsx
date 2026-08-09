"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ensureDefaults } from "@/lib/db";
import { InstallAppButton } from "@/components/InstallAppButton";
import { OfflineBanner } from "@/components/OfflineBanner";
import { PwaRegister } from "@/components/PwaRegister";
import { AutoBackupRunner } from "@/components/AutoBackupRunner";

const links = [
  { href: "/", label: "Invoices" },
  { href: "/clients", label: "Clients" },
  { href: "/items", label: "Catalog" },
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
    <div className="min-h-full flex flex-col">
      <PwaRegister />
      <AutoBackupRunner />
      <OfflineBanner />
      <header className="border-b border-[var(--line)] bg-[var(--panel)]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="group flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/ledgerly-mark.png"
              alt="Ledgerly"
              className="h-8 w-8 rounded-[0.55rem] object-contain sm:h-9 sm:w-9"
            />
            <span className="hidden text-xs text-[var(--muted)] sm:inline">
              invoices that hold up
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <InstallAppButton />
            <nav className="flex items-center gap-1 text-sm">
              {links.map((link) => {
                const active =
                  link.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`rounded-md px-3 py-1.5 transition ${
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
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
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
    <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--ink)] sm:text-4xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 max-w-xl text-sm text-[var(--muted)]">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
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
      className={`inline-flex items-center justify-center rounded-md px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
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
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-[var(--muted)]">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-[var(--muted)]">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--ink)] outline-none ring-[var(--accent)] placeholder:text-neutral-400 focus:ring-2";

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-amber-100 text-amber-900",
    issued: "bg-teal-100 text-teal-900",
    paid: "bg-emerald-100 text-emerald-900",
    void: "bg-neutral-200 text-neutral-600",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${map[status] || "bg-neutral-100"}`}
    >
      {status}
    </span>
  );
}

"use client";

import Link from "next/link";
import { Button, ButtonLink, StatusPill } from "@/components/ui";
import type { DocKind } from "@/lib/types";

export function DocumentListItem({
  href,
  title,
  subtitle,
  status,
  kind,
  dueDate,
  meta,
  amount,
  isDraft,
  onDelete,
  busy,
}: {
  href: string;
  title: string;
  subtitle?: string;
  status: string;
  kind?: DocKind | null;
  dueDate?: string;
  meta?: string;
  amount: string;
  isDraft: boolean;
  onDelete?: () => void;
  busy?: boolean;
}) {
  const openLabel = isDraft ? `Edit draft ${title}` : `Open ${title}`;

  return (
    <article className="relative rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 transition hover:border-[var(--accent)]/35 hover:bg-[var(--wash)]/40">
      <Link
        href={href}
        className="absolute inset-0 z-0 rounded-xl"
        aria-label={openLabel}
      />
      <div className="pointer-events-none relative z-[1] flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-[var(--ink)]">{title}</p>
          {subtitle ? (
            <p className="mt-0.5 truncate text-sm text-[var(--muted)]">{subtitle}</p>
          ) : null}
        </div>
        <StatusPill status={status} kind={kind} dueDate={dueDate} />
      </div>
      <div className="pointer-events-none relative z-[1] mt-3 flex items-center justify-between gap-2 text-sm">
        <span className="text-[var(--muted)]">{meta}</span>
        <span className="tabular-nums font-medium">{amount}</span>
      </div>
      <div className="relative z-[1] mt-3 flex gap-2">
        <ButtonLink
          href={href}
          variant={isDraft ? "primary" : "secondary"}
          className="flex-1 sm:flex-none"
        >
          {isDraft ? "Edit" : "Open"}
        </ButtonLink>
        {isDraft && onDelete ? (
          <Button
            type="button"
            variant="ghost"
            className="text-red-700 hover:bg-red-50 hover:text-red-800"
            disabled={busy}
            onClick={() => onDelete()}
          >
            Delete
          </Button>
        ) : null}
      </div>
    </article>
  );
}

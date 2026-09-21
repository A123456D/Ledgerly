import { todayISO } from "@/lib/format";
import type { DocKind } from "@/lib/types";

export function isQuote(kind?: DocKind | null): boolean {
  return kind === "quote";
}

export function documentKind(kind?: DocKind | null): DocKind {
  return kind === "quote" ? "quote" : "invoice";
}

export function documentNoun(kind?: DocKind | null): "Quote" | "Invoice" {
  return isQuote(kind) ? "Quote" : "Invoice";
}

export function documentNounLower(kind?: DocKind | null): "quote" | "invoice" {
  return isQuote(kind) ? "quote" : "invoice";
}

export function issueDateLabel(kind?: DocKind | null): string {
  return isQuote(kind) ? "Quote date" : "Issue date";
}

export function dueDateLabel(kind?: DocKind | null): string {
  return isQuote(kind) ? "Valid until" : "Due date";
}

export function amountDueLabel(kind?: DocKind | null): string {
  return isQuote(kind) ? "Quote total" : "Amount due";
}

export function documentHref(kind: DocKind | null | undefined, id: string): string {
  return isQuote(kind) ? `/quote?id=${id}` : `/invoice?id=${id}`;
}

/** List heading: issued number, else who it's for, else a clear untitled draft. */
export function documentListTitle(doc: {
  number?: string | null;
  partyName?: string | null;
}): string {
  const number = doc.number?.trim();
  if (number) return number;
  const who = doc.partyName?.trim();
  if (who) return who;
  return "Untitled draft";
}

export function documentListHref(kind?: DocKind | null): string {
  return isQuote(kind) ? "/quotes" : "/";
}

export function statusDisplay(status: string): string {
  if (status === "issued") return "Sent";
  if (status === "partial") return "Partial";
  return status;
}

/**
 * Returns true when an invoice (not quote) is past its due date and still
 * unpaid/partially paid. Overdue is derived — not stored.
 */
export function isOverdue(
  status: string,
  dueDate: string | undefined,
  kind?: DocKind | null,
): boolean {
  if (isQuote(kind)) return false;
  if (status !== "issued" && status !== "partial") return false;
  if (!dueDate) return false;
  return dueDate < todayISO();
}

export function mapIssuePrefix(
  kind: DocKind | null | undefined,
  prefix: string,
): string {
  if (!isQuote(kind)) return prefix;
  return prefix.replaceAll("Issued ", "Quoted ").replaceAll("Issue ", "Quote ");
}

export function mapDuePrefix(
  kind: DocKind | null | undefined,
  prefix: string,
): string {
  if (!isQuote(kind)) return prefix;
  if (prefix === "Due " || prefix.startsWith("Due ")) {
    return prefix.replace("Due ", "Valid until ");
  }
  return prefix;
}

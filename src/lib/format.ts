export function formatMoney(
  amount: number,
  currency: string,
  locale = "en-ZA",
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency || "ZAR",
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export const COMPANY_NUMBER_MAX_LENGTH = 40;

/** Print line for a CIPC / company registration number. Empty input → "". */
export function companyNumberLine(value?: string | null): string {
  const v = (value ?? "").trim().slice(0, COMPANY_NUMBER_MAX_LENGTH);
  return v ? `Company No. ${v}` : "";
}

/** Date-only strings ("2026-09-28") must be read as local calendar days, never UTC instants. */
function parseISODate(iso: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso)
    ? new Date(iso + "T12:00:00")
    : new Date(iso);
}

function isoFromLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function formatDate(iso: string, locale = "en-ZA"): string {
  if (!iso) return "";
  const d = parseISODate(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

export function todayISO(): string {
  return isoFromLocal(new Date());
}

export function addDaysISO(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return isoFromLocal(d);
}

export function uid(prefix = "id"): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

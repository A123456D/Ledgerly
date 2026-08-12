import type { CSSProperties, ReactNode } from "react";
import { createContext, useContext } from "react";
import type {
  CustomTemplate,
  FontPair,
  InvoiceTotals,
  LineItem,
  PartySnapshot,
  TaxMode,
  TemplateId,
} from "@/lib/types";
import type { InvoiceVisibility } from "@/lib/invoice-visibility";
import { isVisible, resolveVisibility } from "@/lib/invoice-visibility";
import { formatDate, formatMoney } from "@/lib/format";
import { getBuiltinTemplate, isBuiltinTemplateId } from "@/lib/templates/catalog";

const LogoVisibleCtx = createContext(true);

export interface InvoiceViewModel {
  number: string;
  business: PartySnapshot & {
    phone?: string;
    logoDataUrl?: string;
    accentColor?: string;
    fontPair?: FontPair;
  };
  client: PartySnapshot;
  currency: string;
  taxMode: TaxMode;
  templateId: TemplateId;
  accentColor: string;
  fontPair?: FontPair;
  logoDataUrl?: string;
  issueDate: string;
  dueDate: string;
  notes: string;
  paymentInstructions: string;
  lineItems: LineItem[];
  totals: InvoiceTotals;
  status: string;
  visibility?: InvoiceVisibility;
  customTemplate?: CustomTemplate | null;
}

function show(doc: InvoiceViewModel, field: Parameters<typeof isVisible>[1]) {
  return isVisible(doc.visibility, field);
}

/** Issue / due lines — omitted when hidden or empty. */
function DateMeta({
  doc,
  className = "",
  issuePrefix = "",
  duePrefix = "Due ",
  sep = " · ",
  stacked = false,
  issueClassName,
  dueClassName,
}: {
  doc: InvoiceViewModel;
  className?: string;
  issuePrefix?: string;
  duePrefix?: string;
  sep?: string;
  stacked?: boolean;
  issueClassName?: string;
  dueClassName?: string;
}) {
  const issue =
    show(doc, "issueDate") && doc.issueDate
      ? `${issuePrefix}${formatDate(doc.issueDate)}`
      : null;
  const due =
    show(doc, "dueDate") && doc.dueDate
      ? `${duePrefix}${formatDate(doc.dueDate)}`
      : null;
  if (!issue && !due) return null;
  if (stacked) {
    return (
      <div className={className}>
        {issue ? <p className={issueClassName}>{issue}</p> : null}
        {due ? <p className={dueClassName}>{due}</p> : null}
      </div>
    );
  }
  return <p className={className}>{[issue, due].filter(Boolean).join(sep)}</p>;
}

function InvoiceNumber({
  doc,
  className = "",
  as: Tag = "p",
}: {
  doc: InvoiceViewModel;
  className?: string;
  as?: "p" | "span" | "div";
}) {
  if (!show(doc, "invoiceNumber") || !doc.number) return null;
  return <Tag className={className}>{doc.number}</Tag>;
}

function Gate({
  doc,
  field,
  children,
}: {
  doc: InvoiceViewModel;
  field: Parameters<typeof isVisible>[1];
  children: ReactNode;
}) {
  if (!show(doc, field)) return null;
  return <>{children}</>;
}

/* ───────── primitives ───────── */

function partyLines(p: PartySnapshot, phone?: string) {
  return [
    p.name,
    p.address,
    [p.postalCode, p.city].filter(Boolean).join(" "),
    p.country,
    phone,
    p.email,
    p.taxId ? `Tax ID ${p.taxId}` : "",
  ].filter(Boolean);
}

function Party({
  p,
  phone,
  strong = true,
  className = "",
  light,
}: {
  p: PartySnapshot;
  phone?: string;
  strong?: boolean;
  className?: string;
  light?: boolean;
}) {
  const lines = partyLines(p, phone);
  if (!lines.length) return null;
  return (
    <div className={`space-y-0.5 text-[13px] leading-snug ${className}`}>
      {lines.map((line, i) => (
        <p
          key={`${i}-${line}`}
          className={
            i === 0 && strong
              ? `font-semibold tracking-tight ${light ? "text-white" : ""}`
              : light
                ? "text-white/75"
                : "opacity-70"
          }
        >
          {line}
        </p>
      ))}
    </div>
  );
}

function Logo({
  src,
  name,
  accent,
  className = "h-12 w-12",
  invert,
  rounded = "rounded-xl",
}: {
  src?: string;
  name: string;
  accent: string;
  className?: string;
  invert?: boolean;
  rounded?: string;
}) {
  const logoVisible = useContext(LogoVisibleCtx);
  if (!logoVisible) return null;
  if (!src && !name) return null;
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className={`${className} ${rounded} object-contain ${invert ? "brightness-0 invert" : ""}`}
      />
    );
  }
  return (
    <div
      className={`flex items-center justify-center ${rounded} text-lg font-bold text-white ${className}`}
      style={{ background: accent }}
    >
      {(name || "L").slice(0, 1).toUpperCase()}
    </div>
  );
}

function Label({
  children,
  className = "",
  color,
}: {
  children: ReactNode;
  className?: string;
  color?: string;
}) {
  return (
    <p
      className={`text-[10px] font-bold uppercase tracking-[0.22em] ${className}`}
      style={color ? { color } : undefined}
    >
      {children}
    </p>
  );
}

function lineAmt(doc: InvoiceViewModel, line: LineItem) {
  const base =
    (line.quantity || 0) *
    (line.unitPrice || 0) *
    (1 - (line.discountPercent || 0) / 100);
  return doc.taxMode === "inclusive"
    ? base
    : base + (base * (line.taxRate || 0)) / 100;
}

function FancyTable({
  doc,
  accent,
  mode = "soft",
}: {
  doc: InvoiceViewModel;
  accent: string;
  mode?: "soft" | "solid" | "dark" | "gold" | "lined";
}) {
  const head =
    mode === "solid"
      ? { background: accent, color: "#fff" }
      : mode === "dark"
        ? { background: "rgba(255,255,255,0.08)", color: "#e2e8f0" }
        : mode === "gold"
          ? { background: "transparent", color: accent, borderBottom: `1px solid ${accent}` }
          : mode === "lined"
            ? { background: "transparent", color: "#000", borderBottom: "2px solid #000" }
            : { background: `${accent}14`, color: "#334155" };

  const showVat = show(doc, "vat");
  const headers = showVat
    ? ["Description", "Qty", "Rate", "VAT", "Amount"]
    : ["Description", "Qty", "Rate", "Amount"];

  return (
    <table className="mt-6 w-full table-fixed border-collapse text-[13px]">
      <colgroup>
        <col className="w-auto" />
        <col className="w-[12%]" />
        <col className="w-[16%]" />
        {showVat ? <col className="w-[10%]" /> : null}
        <col className="w-[18%]" />
      </colgroup>
      <thead>
        <tr style={head}>
          {headers.map((h, i) => (
            <th
              key={h}
              className={`px-2 py-3 text-[10px] font-bold uppercase tracking-[0.12em] ${i === 0 ? "text-left rounded-l-lg" : "text-right"} ${i === headers.length - 1 ? "rounded-r-lg" : ""}`}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {doc.lineItems.map((line, i) => (
          <tr
            key={line.id}
            className={
              mode === "dark"
                ? "border-b border-white/10"
                : i % 2 === 1
                  ? "bg-black/[0.02]"
                  : "border-b border-black/[0.06]"
            }
          >
            <td className="truncate px-2 py-3.5">
              {line.description || "—"}
              {line.discountPercent ? (
                <span className="ml-2 text-[11px] opacity-45">−{line.discountPercent}%</span>
              ) : null}
            </td>
            <td className="px-1.5 py-3.5 text-right tabular-nums">
              {line.quantity}
              {line.unit ? ` ${line.unit}` : ""}
            </td>
            <td className="px-1.5 py-3.5 text-right tabular-nums">
              {formatMoney(line.unitPrice, doc.currency)}
            </td>
            {showVat ? (
              <td className="px-1.5 py-3.5 text-right tabular-nums">{line.taxRate || 0}%</td>
            ) : null}
            <td className="px-2 py-3.5 text-right font-semibold tabular-nums">
              {formatMoney(lineAmt(doc, line), doc.currency)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DueCard({
  doc,
  accent,
  invert,
}: {
  doc: InvoiceViewModel;
  accent: string;
  invert?: boolean;
}) {
  return (
    <div className="ml-auto mt-6 w-[15.5rem] space-y-2 text-[13px]">
      {show(doc, "subtotal") ? (
        <div className={`flex justify-between ${invert ? "text-white/70" : "opacity-65"}`}>
          <span>Subtotal</span>
          <span className="tabular-nums">{formatMoney(doc.totals.subtotal, doc.currency)}</span>
        </div>
      ) : null}
      {show(doc, "vat")
        ? doc.totals.taxByRate.map((b) => (
            <div
              key={b.rate}
              className={`flex justify-between ${invert ? "text-white/70" : "opacity-65"}`}
            >
              <span>VAT {b.rate}%</span>
              <span className="tabular-nums">{formatMoney(b.tax, doc.currency)}</span>
            </div>
          ))
        : null}
      <div
        className={`mt-2 rounded-2xl px-5 py-4 ${invert ? "bg-white text-slate-900" : "text-white"}`}
        style={invert ? undefined : { background: accent }}
      >
        <p
          className={`text-[10px] font-bold uppercase tracking-[0.2em] ${invert ? "opacity-50" : "text-white/80"}`}
        >
          Amount due
        </p>
        <p className="mt-1 text-[1.65rem] font-bold tabular-nums tracking-tight">
          {formatMoney(doc.totals.total, doc.currency)}
        </p>
      </div>
    </div>
  );
}

function Notes({
  doc,
  light,
}: {
  doc: InvoiceViewModel;
  light?: boolean;
}) {
  const notes = show(doc, "notes") ? doc.notes : "";
  const payment = show(doc, "payment") ? doc.paymentInstructions : "";
  if (!notes && !payment) return null;
  return (
    <div
      className={`mt-10 grid gap-6 border-t pt-7 text-[13px] sm:grid-cols-2 ${light ? "border-white/15 text-white/80" : "border-black/10 opacity-80"}`}
    >
      {notes ? (
        <div>
          <Label className={light ? "text-white/50" : "opacity-45"}>Notes</Label>
          <p className="mt-2 whitespace-pre-wrap leading-relaxed">{notes}</p>
        </div>
      ) : null}
      {payment ? (
        <div>
          <Label className={light ? "text-white/50" : "opacity-45"}>Payment</Label>
          <p className="mt-2 whitespace-pre-wrap leading-relaxed">{payment}</p>
        </div>
      ) : null}
    </div>
  );
}

function Sheet({
  children,
  className = "",
  style,
  bleed,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  bleed?: boolean;
}) {
  return (
    <article
      className={`invoice-sheet relative ${bleed ? "invoice-sheet-bleed overflow-hidden" : "overflow-visible"} ${className}`}
      style={style}
    >
      {children}
    </article>
  );
}

function Orb({
  className,
  color,
}: {
  className: string;
  color: string;
}) {
  return (
    <div
      className={`pointer-events-none absolute rounded-full ${className}`}
      style={{ background: color }}
    />
  );
}

/* ───────── 14 Canva-grade templates ───────── */

/** Clean Warm — Canva minimal cream + teal due card + corner orb */
function Classic({ doc, accent, logo }: Ctx) {
  return (
    <Sheet className="bg-[#fffdf9] text-[#1c1917] font-[family-name:var(--font-body)]">
      <Orb className="-right-16 -top-20 h-56 w-56 opacity-[0.14]" color={accent} />
      <Orb className="-bottom-24 -left-16 h-48 w-48 opacity-[0.08]" color={accent} />
      <div className="relative flex min-w-0 items-start justify-between gap-6">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <Logo src={logo} name={doc.business.name} accent={accent} className="h-14 w-14 shrink-0" />
          <div className="min-w-0">
            <h1 className="truncate font-[family-name:var(--font-display)] text-[1.75rem] font-semibold tracking-tight">
              {doc.business.name || "Your business"}
            </h1>
            <p className="mt-1 truncate text-sm opacity-55">{doc.business.email}</p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p
            className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight"
            style={{ color: accent }}
          >
            Invoice
          </p>
          <p className="mt-1 text-sm font-medium tabular-nums">
            <InvoiceNumber doc={doc} />
          </p>
          <DateMeta doc={doc} className="mt-3 text-xs opacity-55" />
        </div>
      </div>
      <div className="relative mt-10 grid grid-cols-2 gap-4">
        <Gate doc={doc} field="from">
          <div className="rounded-2xl bg-[#f6f1ea] p-5">
            <Label className="opacity-45">From</Label>
            <Party p={doc.business} phone={doc.business.phone} className="mt-2" />
          </div>
        </Gate>
        <Gate doc={doc} field="billTo">
          <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
            <Label className="opacity-45">Bill to</Label>
            <Party p={doc.client} className="mt-2" />
          </div>
        </Gate>
      </div>
      <FancyTable doc={doc} accent={accent} mode="soft" />
      <DueCard doc={doc} accent={accent} />
      <Notes doc={doc} />
    </Sheet>
  );
}

/** Swiss White — hairline, massive whitespace, outlined due */
function Minimal({ doc, accent, logo }: Ctx) {
  return (
    <Sheet className="bg-white text-[#111] font-[family-name:var(--font-body)]">
      <div className="flex items-end justify-between border-b border-neutral-200 pb-10">
        <div>
          <Logo src={logo} name={doc.business.name} accent={accent} className="mb-8 h-10 w-auto max-w-[120px] rounded-none" />
          <p className="text-[11px] uppercase tracking-[0.4em] text-neutral-400">
            {doc.business.name || "Studio"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-[0.4em] text-neutral-400">Invoice</p>
          <p className="mt-3 text-3xl font-light tracking-tight">{doc.number}</p>
        </div>
      </div>
      <div className="mt-14 grid grid-cols-3 gap-10 text-[13px]">
        <Gate doc={doc} field="from">
          <div>
            <Label className="text-neutral-400">From</Label>
            <Party p={doc.business} phone={doc.business.phone} className="mt-4" />
          </div>
        </Gate>
        <Gate doc={doc} field="billTo">
          <div>
            <Label className="text-neutral-400">Bill to</Label>
            <Party p={doc.client} className="mt-4" />
          </div>
        </Gate>
        <div className="text-right">
          <Label className="text-neutral-400">Dates</Label>
          <DateMeta doc={doc} stacked className="mt-4" dueClassName="mt-1 text-neutral-400" />
        </div>
      </div>
      <FancyTable doc={doc} accent={accent} mode="lined" />
      <div className="ml-auto mt-8 w-60 border border-neutral-900 p-4">
        <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Amount due</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">
          {formatMoney(doc.totals.total, doc.currency)}
        </p>
      </div>
      <Notes doc={doc} />
    </Sheet>
  );
}

/** Color Block — full left color column (very Canva) */
function Bold({ doc, accent, logo }: Ctx) {
  return (
    <Sheet bleed className="bg-white text-[#0f172a] font-[family-name:var(--font-body)]">
      <div className="grid min-h-[297mm] grid-cols-[0.38fr_0.62fr]">
        <div className="relative flex flex-col justify-between p-8 text-white" style={{ background: accent }}>
          <Orb className="-left-10 top-24 h-40 w-40 opacity-100" color="rgba(255,255,255,0.12)" />
          <div>
            <Logo src={logo} name={doc.business.name} accent="#fff" className="h-12 w-12" invert={!!logo} rounded="rounded-2xl" />
            <h1 className="mt-8 font-[family-name:var(--font-display)] text-3xl font-bold leading-tight">
              {doc.business.name || "Studio"}
            </h1>
            <div className="mt-8">
              <Label className="text-white/60">From</Label>
              <Party p={doc.business} phone={doc.business.phone} className="mt-2" light />
            </div>
          </div>
          <div>
            <Label className="text-white/60">Invoice</Label>
            <p className="mt-2 text-2xl font-bold tabular-nums">{doc.number}</p>
            <DateMeta doc={doc} stacked className="mt-3 text-sm text-white/70" />
          </div>
        </div>
        <div className="invoice-pad flex flex-col">
          <div>
            <Label className="opacity-40">Bill to</Label>
            <Party p={doc.client} className="mt-2 text-base" />
          </div>
          <FancyTable doc={doc} accent={accent} mode="soft" />
          <DueCard doc={doc} accent={accent} />
          <div className="mt-auto">
            <Notes doc={doc} />
          </div>
        </div>
      </div>
    </Sheet>
  );
}

/** Serif Editorial — centered crest, ornament rules */
function Atelier({ doc, accent, logo }: Ctx) {
  return (
    <Sheet className="bg-[#faf6f0] text-[#2a211c] font-[family-name:var(--font-display)]">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full ring-1 ring-black/10" style={{ background: `${accent}18` }}>
          <Logo src={logo} name={doc.business.name} accent={accent} className="h-10 w-10 rounded-full" />
        </div>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight">
          {doc.business.name || "Atelier"}
        </h1>
        <div className="mx-auto mt-5 flex items-center justify-center gap-3" style={{ color: accent }}>
          <span className="h-px w-12 bg-current" />
          <span className="text-[11px] uppercase tracking-[0.35em]">Invoice {doc.number}</span>
          <span className="h-px w-12 bg-current" />
        </div>
        <DateMeta doc={doc} className="mt-3 text-sm opacity-55" sep=" — " duePrefix="" />
      </div>
      <div className="mt-12 grid grid-cols-2 gap-12 text-sm">
        <div>
          <Label className="opacity-45">Studio</Label>
          <Party p={doc.business} phone={doc.business.phone} className="mt-3 font-[family-name:var(--font-body)]" />
        </div>
        <div className="text-right">
          <Label className="opacity-45">Client</Label>
          <Party p={doc.client} className="mt-3 font-[family-name:var(--font-body)]" />
        </div>
      </div>
      <FancyTable doc={doc} accent={accent} mode="soft" />
      <DueCard doc={doc} accent={accent} />
      <Notes doc={doc} />
    </Sheet>
  );
}

/** Corporate Blue — stacked blue bars (Forma energy) */
function Nordic({ doc, accent, logo }: Ctx) {
  return (
    <Sheet bleed className="bg-white text-[#0f172a] font-[family-name:var(--font-body)]">
      <div className="px-10 py-7 text-white" style={{ background: accent }}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo src={logo} name={doc.business.name} accent="#fff" className="h-11 w-11" invert={!!logo} />
            <h1 className="text-2xl font-bold tracking-tight">{doc.business.name || "Company"}</h1>
          </div>
          <div className="rounded-lg bg-white/15 px-4 py-2 text-right backdrop-blur">
            <p className="text-[10px] uppercase tracking-[0.24em] text-white/70">Invoice</p>
            <p className="font-semibold tabular-nums">{doc.number}</p>
          </div>
        </div>
      </div>
      {(show(doc, "issueDate") && doc.issueDate) || (show(doc, "dueDate") && doc.dueDate) ? (
      <div className="px-10 py-3 text-sm text-white/90" style={{ background: `${accent}cc` }}>
        <DateMeta doc={doc} issuePrefix="Issued " sep=" · " />
      </div>
      ) : null}
      <div className="invoice-pad">
        <div className="grid grid-cols-2 gap-8">
          <div>
            <Label className="text-slate-400">Bill to</Label>
            <Party p={doc.client} className="mt-2" />
          </div>
          <div>
            <Label className="text-slate-400">From</Label>
            <Party p={doc.business} phone={doc.business.phone} className="mt-2" />
          </div>
        </div>
        <FancyTable doc={doc} accent={accent} mode="soft" />
        <DueCard doc={doc} accent={accent} />
        <Notes doc={doc} />
      </div>
    </Sheet>
  );
}

/** Noir Glow — dark + luminous orbs */
function Midnight({ doc, accent, logo }: Ctx) {
  return (
    <Sheet className="bg-[#070b16] text-[#e8eefc] font-[family-name:var(--font-body)]">
      <Orb className="-right-20 -top-24 h-72 w-72 opacity-40 blur-3xl" color={accent} />
      <Orb className="bottom-10 left-10 h-40 w-40 opacity-20 blur-2xl" color="#22d3ee" />
      <div className="relative flex items-start justify-between gap-6">
        <div>
          <Logo src={logo} name={doc.business.name} accent={accent} className="h-12 w-auto max-w-[130px]" />
          <h1 className="mt-6 font-[family-name:var(--font-display)] text-3xl font-semibold">
            {doc.business.name || "Midnight"}
          </h1>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-right backdrop-blur-md">
          <Label className="text-white/45">Invoice</Label>
          <p className="mt-2 text-xl font-semibold tabular-nums" style={{ color: accent }}>
            {doc.number}
          </p>
          <DateMeta doc={doc} className="mt-3 text-xs text-white/50" duePrefix="" />
        </div>
      </div>
      <div className="relative mt-10 grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <Label className="text-white/40">Bill to</Label>
          <Party p={doc.client} className="mt-2" light />
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <Label className="text-white/40">From</Label>
          <Party p={doc.business} phone={doc.business.phone} className="mt-2" light />
        </div>
      </div>
      <FancyTable doc={doc} accent={accent} mode="dark" />
      <DueCard doc={doc} accent={accent} />
      <Notes doc={doc} light />
    </Sheet>
  );
}

/** Soft Pastel — peach orbs, pill number, rounded card shell */
function Coral({ doc, accent, logo }: Ctx) {
  return (
    <Sheet className="bg-[#fff5f7] text-[#1c1917] font-[family-name:var(--font-display)]">
      <Orb className="-right-12 top-8 h-44 w-44 opacity-30" color="#fda4af" />
      <Orb className="left-10 top-40 h-28 w-28 opacity-25" color="#fdba74" />
      <div className="relative overflow-hidden rounded-[28px] bg-white shadow-[0_20px_50px_rgba(225,29,72,0.08)] ring-1 ring-rose-100">
        <div className="flex items-center justify-between gap-4 px-7 py-6" style={{ background: `linear-gradient(120deg, ${accent}18, #fda4af33)` }}>
          <div className="flex items-center gap-3">
            <Logo src={logo} name={doc.business.name} accent={accent} className="h-12 w-12" rounded="rounded-2xl" />
            <div>
              <h1 className="text-xl font-semibold">{doc.business.name || "Studio"}</h1>
              <p className="text-xs opacity-50">{doc.business.email}</p>
            </div>
          </div>
          <div className="rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-sm" style={{ background: accent }}>
            {doc.number}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 px-7 py-6 text-sm font-[family-name:var(--font-body)]">
          <div>
            <Label className="opacity-40">Bill to</Label>
            <Party p={doc.client} className="mt-2" />
          </div>
          <div>
            <Label className="opacity-40">From</Label>
            <Party p={doc.business} phone={doc.business.phone} className="mt-2" />
          </div>
          <div>
            <Label className="opacity-40">Dates</Label>
            <DateMeta doc={doc} stacked className="mt-2" issueClassName="font-medium" dueClassName="opacity-55" />
          </div>
        </div>
        <div className="px-5 pb-7 font-[family-name:var(--font-body)]">
          <FancyTable doc={doc} accent={accent} mode="soft" />
          <DueCard doc={doc} accent={accent} />
          <Notes doc={doc} />
        </div>
      </div>
    </Sheet>
  );
}

/** Consulting Grid — dark left rail */
function Slate({ doc, accent, logo }: Ctx) {
  return (
    <Sheet bleed className="bg-white text-[#0f172a] font-[family-name:var(--font-body)]">
      <div className="grid min-h-[297mm] grid-cols-[72px_1fr]">
        <div style={{ background: accent }} />
        <div className="invoice-pad">
          <div className="flex items-start justify-between gap-6">
            <div className="flex gap-3">
              <Logo src={logo} name={doc.business.name} accent={accent} className="h-12 w-12" rounded="rounded-md" />
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{doc.business.name || "Advisory"}</h1>
                <p className="mt-1 font-[family-name:var(--font-mono)] text-[11px] text-slate-500">
                  {doc.business.taxId || doc.business.email}
                </p>
              </div>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-right">
              <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-slate-500">
                Invoice
              </p>
              <p className="mt-1 font-[family-name:var(--font-mono)] text-lg font-semibold">
                {doc.number}
              </p>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-3 gap-6 border-y border-slate-200 py-6">
            <div>
              <Label className="text-slate-400">Client</Label>
              <Party p={doc.client} className="mt-2" />
            </div>
            <div>
              <Label className="text-slate-400">Supplier</Label>
              <Party p={doc.business} phone={doc.business.phone} className="mt-2" />
            </div>
            <div className="font-[family-name:var(--font-mono)] text-xs">
              <Label className="text-slate-400">Terms</Label>
              <DateMeta doc={doc} stacked className="mt-2" issuePrefix="Issue " />
            </div>
          </div>
          <FancyTable doc={doc} accent={accent} mode="soft" />
          <DueCard doc={doc} accent={accent} />
          <Notes doc={doc} />
        </div>
      </div>
    </Sheet>
  );
}

/** Black & Gold — luxury Canva bestseller pattern */
function Luxe({ doc, accent, logo }: Ctx) {
  return (
    <Sheet className="bg-[#0c0a09] text-[#f5efe6] font-[family-name:var(--font-display)]">
      <div className="border px-7 py-9" style={{ borderColor: `${accent}55` }}>
        <div className="text-center">
          <div
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
            style={{ boxShadow: `0 0 0 1px ${accent}` }}
          >
            <Logo src={logo} name={doc.business.name} accent={accent} className="h-10 w-10 rounded-full" />
          </div>
          <p className="mt-6 text-[11px] uppercase tracking-[0.5em]" style={{ color: accent }}>
            Private invoice
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            {doc.business.name || "Maison"}
          </h1>
          <p className="mt-3 text-sm tabular-nums opacity-70">{doc.number}</p>
        </div>
        <div className="mx-auto my-8 h-px w-28" style={{ background: accent }} />
        <div className="grid grid-cols-2 gap-10 font-[family-name:var(--font-body)] text-sm">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: accent }}>
              Prepared for
            </p>
            <Party p={doc.client} className="mt-3" light />
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: accent }}>
              Dates
            </p>
            <DateMeta doc={doc} stacked className="mt-3" dueClassName="opacity-60" />
          </div>
        </div>
        <div className="font-[family-name:var(--font-body)]">
          <FancyTable doc={doc} accent={accent} mode="gold" />
          <DueCard doc={doc} accent={accent} />
          <Notes doc={doc} light />
        </div>
      </div>
    </Sheet>
  );
}

/** Pastel Sage — wellness */
function Meadow({ doc, accent, logo }: Ctx) {
  return (
    <Sheet className="bg-[#eef5ea] text-[#1f2a22] font-[family-name:var(--font-display)]">
      <div
        className="absolute inset-x-0 top-0 h-36"
        style={{ background: `linear-gradient(180deg, ${accent}30, transparent)` }}
      />
      <Orb className="right-8 top-24 h-32 w-32 opacity-25" color="#86efac" />
      <div className="relative flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Logo src={logo} name={doc.business.name} accent={accent} className="h-12 w-12" rounded="rounded-full" />
          <div>
            <h1 className="text-2xl font-semibold">{doc.business.name || "Meadow"}</h1>
            <p className="text-sm opacity-55">{doc.business.email}</p>
          </div>
        </div>
        <div className="text-right">
          <Label className="opacity-45">Invoice</Label>
          <p className="mt-1 text-xl font-semibold" style={{ color: accent }}>
            {doc.number}
          </p>
        </div>
      </div>
      <div className="relative mt-10 grid grid-cols-2 gap-4 font-[family-name:var(--font-body)]">
        <div className="rounded-[28px] bg-white/90 p-5 shadow-sm ring-1 ring-black/5">
          <Label className="opacity-40">Bill to</Label>
          <Party p={doc.client} className="mt-2" />
        </div>
        <div className="rounded-[28px] bg-white/55 p-5 ring-1 ring-black/5">
          <Label className="opacity-40">Schedule</Label>
          <DateMeta doc={doc} stacked className="mt-2 text-sm" issueClassName="font-medium" dueClassName="opacity-60" />
          <Party p={doc.business} phone={doc.business.phone} className="mt-4 text-xs" strong={false} />
        </div>
      </div>
      <div className="font-[family-name:var(--font-body)]">
        <FancyTable doc={doc} accent={accent} mode="soft" />
        <DueCard doc={doc} accent={accent} />
        <Notes doc={doc} />
      </div>
    </Sheet>
  );
}

/** Mono Punch — thick frame, watermark */
function Ink({ doc, accent, logo }: Ctx) {
  return (
    <Sheet className="bg-white text-black font-[family-name:var(--font-display)]">
      <div className="pointer-events-none absolute inset-3 border-[3px] border-black" />
      <div className="relative">
        <p className="pointer-events-none absolute right-0 top-16 origin-right rotate-90 text-7xl font-black tracking-tighter text-black/[0.04]">
          INVOICE
        </p>
        <div className="flex items-start justify-between gap-6">
          <div>
            <Logo src={logo} name={doc.business.name} accent={accent} className="h-11 w-11" rounded="rounded-none" />
            <h1 className="mt-5 text-3xl font-black uppercase tracking-tight">
              {doc.business.name || "Ink Co"}
            </h1>
          </div>
          <div className="text-right">
            <p className="text-5xl font-black tracking-tighter">INVOICE</p>
            <p className="mt-2 font-[family-name:var(--font-mono)] text-sm">{doc.number}</p>
            <DateMeta doc={doc} className="mt-4 text-sm font-[family-name:var(--font-body)]" sep=" / " duePrefix="" />
          </div>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-10 border-y-[3px] border-black py-6 font-[family-name:var(--font-body)] text-sm">
          <div>
            <Label>Bill to</Label>
            <Party p={doc.client} className="mt-3" />
          </div>
          <div>
            <Label>From</Label>
            <Party p={doc.business} phone={doc.business.phone} className="mt-3" />
          </div>
        </div>
        <div className="font-[family-name:var(--font-body)]">
          <FancyTable doc={doc} accent={accent} mode="solid" />
          <DueCard doc={doc} accent={accent} />
          <Notes doc={doc} />
        </div>
      </div>
    </Sheet>
  );
}

/** Gradient Studio — diagonal gradient header */
function Studio({ doc, accent, logo }: Ctx) {
  return (
    <Sheet bleed className="bg-[#fafaf9] text-[#1c1917] font-[family-name:var(--font-body)]">
      <div
        className="relative overflow-hidden px-10 pb-14 pt-9 text-white"
        style={{
          background: `linear-gradient(135deg, ${accent} 0%, #fb7185 55%, #fbbf24 120%)`,
          clipPath: "polygon(0 0, 100% 0, 100% 78%, 0 100%)",
        }}
      >
        <Orb className="right-10 top-6 h-28 w-28 opacity-100" color="rgba(255,255,255,0.2)" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <Logo src={logo} name={doc.business.name} accent="#fff" className="h-11 w-auto max-w-[110px]" invert={!!logo} />
            <h1 className="mt-6 font-[family-name:var(--font-display)] text-4xl font-bold leading-none tracking-tight">
              {doc.business.name || "Studio"}
            </h1>
          </div>
          <div className="rounded-2xl bg-white/20 px-4 py-3 text-right backdrop-blur">
            <p className="text-[10px] uppercase tracking-[0.24em] text-white/80">Invoice</p>
            <p className="mt-1 text-lg font-bold tabular-nums">{doc.number}</p>
          </div>
        </div>
      </div>
      <div className="invoice-pad -mt-6">
        <div className="grid grid-cols-[1.2fr_0.8fr] gap-6">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
            <Label className="opacity-40">Bill to</Label>
            <Party p={doc.client} className="mt-2" />
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
            <Label className="opacity-40">Dates</Label>
            <DateMeta doc={doc} stacked className="mt-2" issueClassName="font-medium" dueClassName="opacity-55" />
            <Party p={doc.business} phone={doc.business.phone} className="mt-4 text-xs" strong={false} />
          </div>
        </div>
        <FancyTable doc={doc} accent={accent} mode="soft" />
        <DueCard doc={doc} accent={accent} />
        <Notes doc={doc} />
      </div>
    </Sheet>
  );
}

/** Forma Navy — agency system look */
function Harbor({ doc, accent, logo }: Ctx) {
  const brass = "#d4a84b";
  return (
    <Sheet bleed className="bg-[#f4f7fb] text-[#0b1220] font-[family-name:var(--font-body)]">
      <div className="px-10 py-8 text-white" style={{ background: accent }}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/10 p-2">
              <Logo src={logo} name={doc.business.name} accent={brass} className="h-10 w-10" invert={!!logo} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{doc.business.name || "Harbor"}</h1>
              <p className="text-xs text-white/65">{doc.business.email}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/55">Invoice</p>
            <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color: brass }}>
              {doc.number}
            </p>
          </div>
        </div>
        <div className="mt-6 h-1 w-24 rounded-full" style={{ background: brass }} />
      </div>
      <div className="invoice-pad">
        <div className="grid grid-cols-3 gap-6">
          <div>
            <Label className="text-slate-400">Bill to</Label>
            <Party p={doc.client} className="mt-2" />
          </div>
          <div>
            <Label className="text-slate-400">From</Label>
            <Party p={doc.business} phone={doc.business.phone} className="mt-2" />
          </div>
          <div>
            <Label className="text-slate-400">Schedule</Label>
            <DateMeta doc={doc} stacked className="mt-2" issueClassName="font-medium" dueClassName="opacity-55" />
          </div>
        </div>
        <FancyTable doc={doc} accent={accent} mode="soft" />
        <DueCard doc={doc} accent={accent} />
        <Notes doc={doc} />
      </div>
    </Sheet>
  );
}

/** Heritage Statement — double rule parchment */
function Parchment({ doc, accent, logo }: Ctx) {
  return (
    <Sheet className="bg-[#f2e6d0] text-[#3f2a1d] font-[family-name:var(--font-display)]">
      <div className="pointer-events-none absolute inset-3 border border-[#7c2d12]/45" />
      <div className="pointer-events-none absolute inset-[18px] border border-[#7c2d12]/25" />
      <div className="relative">
        <div className="flex items-start justify-between gap-6">
          <div className="flex gap-3">
            <Logo src={logo} name={doc.business.name} accent={accent} className="h-12 w-12" rounded="rounded-sm" />
            <div>
              <h1 className="text-2xl font-semibold">{doc.business.name || "Parchment"}</h1>
              <Party
                p={doc.business}
                phone={doc.business.phone}
                className="mt-2 font-[family-name:var(--font-body)] text-xs"
                strong={false}
              />
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm uppercase tracking-[0.28em]" style={{ color: accent }}>
              Statement of account
            </p>
            <p className="mt-2 text-lg font-semibold tabular-nums">{doc.number}</p>
            <DateMeta doc={doc} stacked className="mt-4 font-[family-name:var(--font-body)] text-sm" issuePrefix="Dated " duePrefix="Payable by " dueClassName="opacity-70" />
          </div>
        </div>
        <div className="mt-10 border border-[#7c2d12]/30 bg-[#fff8ea]/70 px-5 py-4 font-[family-name:var(--font-body)]">
          <Label className="opacity-55">Rendered to</Label>
          <Party p={doc.client} className="mt-2" />
        </div>
        <div className="font-[family-name:var(--font-body)]">
          <FancyTable doc={doc} accent={accent} mode="soft" />
          <DueCard doc={doc} accent={accent} />
          <Notes doc={doc} />
        </div>
      </div>
    </Sheet>
  );
}

function CanvaCopy({ doc, accent, logo }: Ctx & { custom?: CustomTemplate | null }) {
  const custom = doc.customTemplate;
  const bg = custom?.backgroundDataUrl;
  const top = custom?.contentTopMm ?? 52;
  const style = custom?.contentStyle ?? "card";
  const useAccent = custom?.accentColor || accent;

  return (
    <Sheet className="bg-white text-[#1c1917] font-[family-name:var(--font-body)]">
      {bg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={bg}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-top"
        />
      ) : null}
      <div className="relative" style={{ paddingTop: `${top}mm` }}>
        <div
          className={
            style === "transparent"
              ? "px-1"
              : style === "band"
                ? "px-4 py-4"
                : "rounded-xl border border-black/5 bg-white/92 px-5 py-5 shadow-sm backdrop-blur-[2px]"
          }
          style={style === "band" ? { background: "rgba(255,255,255,0.94)" } : undefined}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Logo src={logo} name={doc.business.name} accent={useAccent} className="h-10 w-auto max-w-[100px]" />
              <Gate doc={doc} field="invoiceNumber">
                <div>
                  <Label className="text-neutral-500">Invoice</Label>
                  <p className="text-lg font-semibold" style={{ color: useAccent }}>
                    {doc.number}
                  </p>
                </div>
              </Gate>
            </div>
            <DateMeta doc={doc} stacked className="text-right text-sm text-neutral-600" issuePrefix="Issued " />
          </div>
          <div className="grid grid-cols-2 gap-6 text-sm">
            <Gate doc={doc} field="from">
              <div>
                <Label className="text-neutral-400">From</Label>
                <Party p={doc.business} phone={doc.business.phone} className="mt-1" />
              </div>
            </Gate>
            <Gate doc={doc} field="billTo">
              <div>
                <Label className="text-neutral-400">Bill to</Label>
                <Party p={doc.client} className="mt-1" />
              </div>
            </Gate>
          </div>
          <FancyTable doc={doc} accent={useAccent} mode="soft" />
          <DueCard doc={doc} accent={useAccent} />
          <Notes doc={doc} />
        </div>
      </div>
    </Sheet>
  );
}

type Ctx = {
  doc: InvoiceViewModel;
  accent: string;
  logo?: string;
};

const RENDERERS: Record<string, (p: Ctx) => ReactNode> = {
  classic: Classic,
  minimal: Minimal,
  bold: Bold,
  atelier: Atelier,
  nordic: Nordic,
  midnight: Midnight,
  coral: Coral,
  slate: Slate,
  luxe: Luxe,
  meadow: Meadow,
  ink: Ink,
  studio: Studio,
  harbor: Harbor,
  parchment: Parchment,
};

export function InvoicePreview({ doc }: { doc: InvoiceViewModel }) {
  const visibility = resolveVisibility(doc.visibility);
  const view: InvoiceViewModel = {
    ...doc,
    visibility,
    issueDate: visibility.issueDate ? doc.issueDate : "",
    dueDate: visibility.dueDate ? doc.dueDate : "",
    number: visibility.invoiceNumber ? doc.number : "",
    notes: visibility.notes ? doc.notes : "",
    paymentInstructions: visibility.payment ? doc.paymentInstructions : "",
    logoDataUrl: visibility.logo ? doc.logoDataUrl : undefined,
    business: visibility.from
      ? {
          ...doc.business,
          logoDataUrl: visibility.logo ? doc.business.logoDataUrl : undefined,
        }
      : {
          name: "",
          email: "",
          address: "",
          city: "",
          postalCode: "",
          country: "",
          taxId: "",
          accentColor: doc.business.accentColor,
          fontPair: doc.business.fontPair,
        },
    client: visibility.billTo
      ? doc.client
      : {
          name: "",
          email: "",
          address: "",
          city: "",
          postalCode: "",
          country: "",
          taxId: "",
        },
  };

  const meta = isBuiltinTemplateId(view.templateId)
    ? getBuiltinTemplate(view.templateId)
    : undefined;
  const accent = view.accentColor || meta?.defaultAccent || "#0f766e";
  const logo = visibility.logo
    ? view.logoDataUrl || view.business.logoDataUrl
    : undefined;

  const tree =
    view.customTemplate || view.templateId.startsWith("custom:") ? (
      <CanvaCopy doc={view} accent={accent} logo={logo} />
    ) : (
      <>{(RENDERERS[view.templateId] || Classic)({ doc: view, accent, logo })}</>
    );

  return (
    <LogoVisibleCtx.Provider value={visibility.logo}>{tree}</LogoVisibleCtx.Provider>
  );
}

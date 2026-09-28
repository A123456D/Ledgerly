import {
  createContext,
  useContext,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import type {
  CustomTemplate,
  DocKind,
  FontPair,
  InvoiceDecoration,
  InvoiceTotals,
  LineItem,
  PartySnapshot,
  SectionAccents,
  TaxMode,
  TemplateId,
} from "@/lib/types";
import type { InvoiceVisibility } from "@/lib/invoice-visibility";
import { isVisible, resolveVisibility } from "@/lib/invoice-visibility";
import { companyNumberLine, formatDate, formatMoney } from "@/lib/format";
import { getBuiltinTemplate, isBuiltinTemplateId } from "@/lib/templates/catalog";
import { DEFAULT_FONT_PAIR, fontPairCssVars } from "@/lib/fonts";
import { clampLogoSizePx, DEFAULT_LOGO_SIZE_PX } from "@/lib/logo-size";
import { DecorationLayer, DecorationMediaContext } from "@/components/DecorationLayer";
import {
  fillLogoImages,
  isLogoDecoration,
} from "@/lib/decorations/logo-decoration";
import { isBusinessNameDecoration } from "@/lib/decorations/business-name-decoration";
import { inkOn, mutedInkOn } from "@/lib/color";
import {
  amountDueLabel,
  isQuote,
  mapDuePrefix,
  mapIssuePrefix,
} from "@/lib/document-kind";
import type { SarsVatMode } from "@/lib/sars-vat-mode";
import {
  EditableSection,
  SectionAccentsCtx,
  useSectionAccent,
} from "@/components/invoice-edit-context";

const LogoVisibleCtx = createContext(true);
const InlineLogoCtx = createContext(true);
const FontPairCtx = createContext<FontPair>(DEFAULT_FONT_PAIR);
const LogoSizeCtx = createContext(DEFAULT_LOGO_SIZE_PX);

export interface InvoiceViewModel {
  kind?: DocKind;
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
  /** Logo edge length in CSS px on the A4 sheet */
  logoSizePx?: number;
  logoDataUrl?: string;
  issueDate: string;
  dueDate: string;
  notes: string;
  paymentInstructions: string;
  lineItems: LineItem[];
  totals: InvoiceTotals;
  status: string;
  visibility?: InvoiceVisibility;
  sectionAccents?: SectionAccents;
  decorations?: InvoiceDecoration[];
  customTemplate?: CustomTemplate | null;
  /**
   * SARS VAT compliance tier (derived from the VAT-inclusive total, ZAR).
   * Set only when this document is a SARS tax invoice.
   */
  sarsMode?: SarsVatMode;
  /** When true, print as Tax Invoice and apply SARS send gates. */
  sarsTaxInvoice?: boolean;
}

const SheetDecorCtx = createContext<InvoiceDecoration[]>([]);

function show(doc: InvoiceViewModel, field: Parameters<typeof isVisible>[1]) {
  return isVisible(doc.visibility, field);
}

/**
 * Quotes stay “Quote”. SARS tax invoices print “Tax Invoice”.
 * Everyone else gets a normal “Invoice”.
 */
function sheetTitle(doc: InvoiceViewModel) {
  if (isQuote(doc.kind)) return "Quote";
  return doc.sarsTaxInvoice ? "Tax Invoice" : "Invoice";
}


/** Issue / due lines — omitted when hidden or empty. */
function DateMeta({
  doc,
  accent,
  className = "",
  issuePrefix = "",
  duePrefix = "Due ",
  sep = " · ",
  stacked = false,
  issueClassName,
  dueClassName,
}: {
  doc: InvoiceViewModel;
  accent?: string;
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
      ? `${mapIssuePrefix(doc.kind, issuePrefix)}${formatDate(doc.issueDate)}`
      : null;
  const due =
    show(doc, "dueDate") && doc.dueDate
      ? `${mapDuePrefix(doc.kind, duePrefix)}${formatDate(doc.dueDate)}`
      : null;
  if (!issue && !due) return null;
  const body = stacked ? (
    <div className={accent ? undefined : className}>
      {issue ? <p className={issueClassName}>{issue}</p> : null}
      {due ? <p className={dueClassName}>{due}</p> : null}
    </div>
  ) : (
    <p className={accent ? undefined : className}>
      {[issue, due].filter(Boolean).join(sep)}
    </p>
  );
  if (!accent) return body;
  return (
    <EditableSection section="dates" accent={accent} className={className}>
      {body}
    </EditableSection>
  );
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

/** Top-right reference block (auto invoice number). */
function ReferenceBlock({
  doc,
  accent,
  className = "",
  numberClassName = "text-base",
  labelClassName = "",
}: {
  doc: InvoiceViewModel;
  accent: string;
  className?: string;
  numberClassName?: string;
  labelClassName?: string;
}) {
  const refAccent = useSectionAccent("reference", accent);
  if (!show(doc, "invoiceNumber") || !doc.number) return null;
  return (
    <EditableSection
      section="reference"
      accent={accent}
      className={`text-right ${className}`}
    >
      <Label className={labelClassName || "opacity-45"} color={refAccent}>
        Reference
      </Label>
      <p
        className={`mt-1 font-semibold tabular-nums tracking-tight text-[#1c1917] ${numberClassName}`}
      >
        {doc.number}
      </p>
    </EditableSection>
  );
}

function Gate({
  doc,
  field,
  children,
  accent,
}: {
  doc: InvoiceViewModel;
  field: Parameters<typeof isVisible>[1];
  children: ReactNode;
  accent?: string;
}) {
  if (!show(doc, field)) return null;
  if ((field === "from" || field === "billTo") && accent) {
    return (
      <EditableSection section={field} accent={accent}>
        {children}
      </EditableSection>
    );
  }
  return <>{children}</>;
}

/* ───────── primitives ───────── */

/**
 * Context: how to label a party's tax/VAT registration number.
 * Defaults to "Tax ID" (quotes, generic).
 * Set to "VAT No." at the InvoicePreview root for tax invoices.
 */
const VatLabelCtx = createContext("Tax ID");

function partyLines(p: PartySnapshot, phone?: string, vatLabel = "Tax ID") {
  return [
    p.name,
    p.address,
    [p.postalCode, p.city].filter(Boolean).join(" "),
    p.country,
    phone,
    p.email,
    companyNumberLine(p.companyNumber),
    p.taxId ? `${vatLabel} ${p.taxId}` : "",
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
  const vatLabel = useContext(VatLabelCtx);
  const lines = partyLines(p, phone, vatLabel);
  if (!lines.length) return null;
  return (
    <div className={`space-y-0.5 break-words text-[13px] leading-snug [overflow-wrap:anywhere] ${className}`}>
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

function HeaderEmail({
  doc,
  className = "",
}: {
  doc: InvoiceViewModel;
  className?: string;
}) {
  const decorations = useContext(SheetDecorCtx);
  if (
    decorations.some(isBusinessNameDecoration) ||
    decorations.some(isLogoDecoration)
  ) {
    return null;
  }
  if (!doc.business.email) return null;
  return (
    <p className={`break-words [overflow-wrap:anywhere] ${className}`}>
      {doc.business.email}
    </p>
  );
}

function HeaderBusinessName({
  doc,
  className = "",
  fallback = "Your business",
  as: Tag = "h1",
}: {
  doc: InvoiceViewModel;
  className?: string;
  fallback?: string;
  as?: "h1" | "p" | "span";
}) {
  const decorations = useContext(SheetDecorCtx);
  if (!show(doc, "businessName")) return null;
  if (decorations.some(isBusinessNameDecoration)) return null;
  return <Tag className={`break-words [overflow-wrap:anywhere] leading-tight ${className}`}>{doc.business.name || fallback}</Tag>;
}

function Logo({
  src,
  name,
  accent,
  className = "",
  invert,
  rounded = "rounded-xl",
  /** Wide logos keep height from the size control and grow horizontally. */
  wide = false,
  /** White chip behind the artwork — keeps multicolor logos readable on accent bands. */
  chip = false,
}: {
  src?: string;
  name: string;
  accent: string;
  className?: string;
  invert?: boolean;
  rounded?: string;
  wide?: boolean;
  chip?: boolean;
}) {
  const logoVisible = useContext(LogoVisibleCtx);
  const showInline = useContext(InlineLogoCtx);
  const size = useContext(LogoSizeCtx);
  if (!logoVisible || !showInline) return null;
  if (!src && !name) return null;

  const boxStyle: CSSProperties = wide
    ? {
        height: size,
        width: "auto",
        maxWidth: Math.round(size * 2.8),
      }
    : {
        width: size,
        height: size,
      };

  if (src) {
    if (chip) {
      return (
        <span
          className={`inline-flex shrink-0 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm ${className}`}
          style={{ height: size + 12, width: wide ? "auto" : size + 12 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            className="max-h-full max-w-full object-contain"
            style={wide ? { height: size, width: "auto" } : { width: size, height: size }}
          />
        </span>
      );
    }
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className={`shrink-0 ${rounded} object-contain ${invert ? "brightness-0 invert" : ""} ${className}`}
        style={boxStyle}
      />
    );
  }
  return (
    <div
      className={`flex shrink-0 items-center justify-center font-bold text-white ${rounded} ${className}`}
      style={{
        ...boxStyle,
        background: accent,
        fontSize: Math.max(18, Math.round(size * 0.42)),
      }}
    >
      {(name || "L").slice(0, 1).toUpperCase()}
    </div>
  );
}

/** Circular/square frame that tracks the logo size control. */
function LogoFrame({
  className = "",
  style,
  children,
}: {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const size = useContext(LogoSizeCtx);
  return (
    <div
      className={`flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size, ...style }}
    >
      {children}
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

/** Party heading that reads right for the document kind. */
function partyHeading(doc: InvoiceViewModel, invoiceText: string, quoteText: string) {
  return isQuote(doc.kind) ? quoteText : invoiceText;
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
  mode?: "soft" | "solid" | "dark" | "gold" | "lined" | "zebra";
}) {
  const tableAccent = useSectionAccent("lineItems", accent);
  const head =
    mode === "solid"
      ? { background: tableAccent, color: inkOn(tableAccent) }
      : mode === "dark"
        ? { background: "rgba(255,255,255,0.08)", color: "#e2e8f0" }
        : mode === "gold"
          ? { background: "transparent", color: tableAccent, borderBottom: `1px solid ${tableAccent}` }
          : mode === "lined"
            ? { background: "transparent", color: "#000", borderBottom: "2px solid #000" }
            : mode === "zebra"
              ? { background: "transparent", color: "#334155", borderBottom: "1px solid rgba(0,0,0,0.14)" }
              : { background: `${tableAccent}14`, color: "#334155" };

  // One coherent treatment per mode — no alternating border/tint mixes.
  const rowClass = (i: number) => {
    if (mode === "dark") return "border-b border-white/10";
    if (mode === "zebra") return i % 2 === 1 ? "bg-black/[0.035]" : "";
    if (mode === "gold") return "border-b border-black/[0.12]";
    if (mode === "lined") return "border-b border-black/[0.12]";
    if (mode === "solid") return "border-b border-black/[0.08]";
    return "border-b border-black/[0.08]";
  };

  const showVat = show(doc, "vat");
  const headers = showVat
    ? ["Description", "Qty", "Rate", "VAT", "Amount"]
    : ["Description", "Qty", "Rate", "Amount"];

  return (
    <EditableSection section="lineItems" accent={accent}>
    <table className="mt-6 w-full table-fixed border-collapse text-[13px]">
      <colgroup>
        <col className="w-auto" />
        <col className="w-[9%]" />
        <col className="w-[18%]" />
        {showVat ? <col className="w-[9%]" /> : null}
        <col className="w-[20%]" />
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
          <tr key={line.id} data-invoice-avoid-break className={rowClass(i)}>
            <td className="px-2 py-3.5 align-top whitespace-normal break-words leading-snug [overflow-wrap:anywhere]">
              {line.description || "—"}
              {line.discountPercent ? (
                <span className="ml-2 text-[11px] opacity-45">−{line.discountPercent}%</span>
              ) : null}
            </td>
            <td className="whitespace-nowrap px-1 py-3.5 text-right align-top tabular-nums">
              {line.quantity}
              {line.unit ? ` ${line.unit}` : ""}
            </td>
            <td className="whitespace-nowrap px-1 py-3.5 text-right align-top text-[12px] tabular-nums">
              {formatMoney(line.unitPrice, doc.currency)}
            </td>
            {showVat ? (
              <td className="whitespace-nowrap px-1 py-3.5 text-right align-top text-[12px] tabular-nums">{line.taxRate || 0}%</td>
            ) : null}
            <td className="whitespace-nowrap px-2 py-3.5 text-right align-top font-semibold tabular-nums">
              {formatMoney(lineAmt(doc, line), doc.currency)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </EditableSection>
  );
}

function DueCard({
  doc,
  accent,
  invert,
  shape = "pill",
}: {
  doc: InvoiceViewModel;
  accent: string;
  invert?: boolean;
  /** "pill" = rounded brand block; "box" = squared, serif-document friendly. */
  shape?: "pill" | "box";
}) {
  const totalsAccent = useSectionAccent("totals", accent);

  const isInvoice = !isQuote(doc.kind);
  const forceSarsTotals = isInvoice && Boolean(doc.sarsTaxInvoice);
  const showSub = forceSarsTotals || show(doc, "subtotal");
  const showVatRows = forceSarsTotals || show(doc, "vat");

  const vatRows =
    doc.totals.taxByRate.length > 0
      ? doc.totals.taxByRate
      : forceSarsTotals
        ? [{ rate: 0, taxable: doc.totals.subtotal, tax: 0 }]
        : [];

  const totalLabel = forceSarsTotals ? "Total incl VAT" : amountDueLabel(doc.kind);
  const blockInk = invert ? "#0f172a" : inkOn(totalsAccent);
  const blockMuted = invert ? "opacity-50" : undefined;
  const blockStyle = invert
    ? undefined
    : { background: totalsAccent, color: blockInk };
  const radius = shape === "box" ? "rounded-lg border border-black/15" : "rounded-2xl";

  return (
    <EditableSection section="totals" accent={accent} className="ml-auto mt-6 w-[15.5rem] space-y-2 text-[13px]">
      {showSub ? (
        <div className={`flex justify-between ${invert ? "text-white/70" : "opacity-65"}`}>
          <span>{forceSarsTotals ? "Subtotal excl VAT" : "Subtotal"}</span>
          <span className="tabular-nums">{formatMoney(doc.totals.subtotal, doc.currency)}</span>
        </div>
      ) : null}
      {showVatRows
        ? vatRows.map((b) => (
            <div
              key={b.rate}
              className={`flex justify-between ${invert ? "text-white/70" : "opacity-65"}`}
            >
              <span>VAT {b.rate > 0 ? `${b.rate}%` : "0%"}</span>
              <span className="tabular-nums">{formatMoney(b.tax, doc.currency)}</span>
            </div>
          ))
        : null}
      <div
        data-invoice-avoid-break
        className={`mt-2 px-5 py-4 ${radius} ${invert ? "bg-white text-slate-900" : ""}`}
        style={blockStyle}
      >
        <p
          className={`text-[10px] font-bold uppercase tracking-[0.2em] ${blockMuted ?? (blockInk === "#ffffff" ? "text-white/80" : "")}`}
          style={!invert && blockInk !== "#ffffff" ? { color: mutedInkOn(totalsAccent) } : undefined}
        >
          {totalLabel}
        </p>
        <p className="mt-1 text-[1.65rem] font-bold tabular-nums tracking-tight">
          {formatMoney(doc.totals.total, doc.currency)}
        </p>
      </div>
    </EditableSection>
  );
}

function Notes({
  doc,
  light,
  accent = "#0f766e",
}: {
  doc: InvoiceViewModel;
  light?: boolean;
  accent?: string;
}) {
  const notes = show(doc, "notes") ? doc.notes : "";
  const payment = show(doc, "payment") ? doc.paymentInstructions : "";
  if (!notes && !payment) return null;
  return (
    <div
      data-invoice-avoid-break
      className={`mt-10 grid gap-6 border-t pt-7 text-[13px] sm:grid-cols-2 ${light ? "border-white/15 text-white/90" : "border-black/10 text-[#1c1917]"}`}
    >
      {notes ? (
        <EditableSection section="notes" accent={accent}>
          <Label className={light ? "text-white/60" : "text-neutral-500"}>Notes</Label>
          <p className="mt-2 whitespace-pre-wrap break-words leading-relaxed [overflow-wrap:anywhere]">{notes}</p>
        </EditableSection>
      ) : null}
      {payment ? (
        <EditableSection section="payment" accent={accent}>
          <Label className={light ? "text-white/60" : "text-neutral-500"}>Payment</Label>
          <p className="mt-2 whitespace-pre-wrap break-words leading-relaxed [overflow-wrap:anywhere]">{payment}</p>
        </EditableSection>
      ) : null}
    </div>
  );
}

/** Totals + notes/payment — kept together on PDF page breaks. */
function InvoiceClosing({
  doc,
  accent,
  light,
  invert,
  totalsShape = "pill",
}: {
  doc: InvoiceViewModel;
  accent: string;
  light?: boolean;
  invert?: boolean;
  totalsShape?: "pill" | "box";
}) {
  return (
    <>
      <div data-invoice-avoid-break>
        <DueCard doc={doc} accent={accent} invert={invert} shape={totalsShape} />
      </div>
      <Notes doc={doc} light={light} accent={accent} />
      <QuoteAcceptance doc={doc} accent={accent} />
    </>
  );
}

/** Quotes read like proposals: a signature strip makes them accept-on-paper. */
function QuoteAcceptance({
  doc,
  accent,
}: {
  doc: InvoiceViewModel;
  accent: string;
}) {
  if (!isQuote(doc.kind)) return null;
  return (
    <div
      data-invoice-avoid-break
      className="mt-8 border-t border-black/15 pt-6"
    >
      <Label className="opacity-45">Acceptance</Label>
      <p className="mt-2 max-w-xl text-[12px] leading-relaxed opacity-70">
        Signing below accepts this quote as scoped. Pricing is held for the
        validity period shown above; work is scheduled once the signed copy is
        returned.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-10 text-[12px]">
        <div>
          <div className="h-8 border-b border-black/40" />
          <p className="mt-1.5 opacity-55">Accepted for the client — signature</p>
        </div>
        <div>
          <div className="h-8 border-b border-black/40" />
          <p className="mt-1.5 opacity-55">Date</p>
        </div>
      </div>
      <p className="mt-4 text-[10px] uppercase tracking-[0.2em]" style={{ color: accent }}>
        {doc.number}
      </p>
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
  const fontPair = useContext(FontPairCtx);
  const decorations = useContext(SheetDecorCtx);
  const sheetRef = useRef<HTMLElement>(null);
  // Honour “Behind invoice” for every decoration (logos, uploads, shapes).
  const back = decorations.filter((d) => d.behind);
  const front = decorations.filter((d) => !d.behind);
  return (
    <article
      ref={sheetRef}
      data-invoice-sheet="true"
      className={`invoice-sheet relative ${bleed ? "invoice-sheet-bleed" : ""} ${className}`}
      style={{ ...fontPairCssVars(fontPair), ...style, containerType: "inline-size" }}
    >
      {back.length > 0 ? (
        <DecorationLayer decorations={back} sheetRef={sheetRef} behind />
      ) : null}
      {/* Content and decorations both stay clickable — never disable sections for shapes. */}
      <div className="relative z-[1]" data-invoice-content>
        {children}
      </div>
      {front.length > 0 ? (
        <DecorationLayer decorations={front} sheetRef={sheetRef} />
      ) : null}
    </article>
  );
}

/* ───────── 14 Canva-grade templates ───────── */

/** Clean Warm — cream sheet, teal accents */
function Classic({ doc, accent, logo }: Ctx) {
  return (
    <Sheet className="bg-[#fffdf9] text-[#1c1917] font-[family-name:var(--font-body)]">
      <EditableSection
        section="header"
        accent={accent}
        className="relative flex min-w-0 items-start justify-between gap-6"
      >
        <div className="flex min-w-0 flex-1 items-center gap-5" data-invoice-avoid-break>
          <Logo src={logo} name={doc.business.name} accent={accent} />
          <div className="min-w-0">
            <HeaderBusinessName
              doc={doc}
              className="font-[family-name:var(--font-display)] text-[1.75rem] font-semibold tracking-tight"
              fallback="Your business"
            />
            <HeaderEmail doc={doc} className="mt-1 text-sm opacity-55" />
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p
            className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight"
            style={{ color: accent }}
          >
            {sheetTitle(doc)}
          </p>
          <ReferenceBlock
            doc={doc}
            accent={accent}
            numberClassName="text-sm"
            labelClassName="mt-1 opacity-45"
          />
          <DateMeta doc={doc} accent={accent} className="mt-3 text-xs opacity-55" />
        </div>
      </EditableSection>
      <div className="relative mt-10 grid grid-cols-2 gap-4">
        <Gate doc={doc} field="from" accent={accent}>
          <div className="rounded-2xl bg-[#f6f1ea] p-5">
            <Label className="opacity-45">From</Label>
            <Party p={doc.business} phone={doc.business.phone} className="mt-2" />
          </div>
        </Gate>
        <Gate doc={doc} field="billTo" accent={accent}>
          <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
            <Label className="opacity-45">{partyHeading(doc, 'Bill to', 'Prepared for')}</Label>
            <Party p={doc.client} className="mt-2" />
          </div>
        </Gate>
      </div>
      <FancyTable doc={doc} accent={accent} mode="soft" />
      <InvoiceClosing doc={doc} accent={accent} />
    </Sheet>
  );
}

/** Swiss White — hairline, massive whitespace */
function Minimal({ doc, accent, logo }: Ctx) {
  return (
    <Sheet className="bg-white text-[#111] font-[family-name:var(--font-body)]">
      <EditableSection
        section="header"
        accent={accent}
        className="flex items-end justify-between border-b border-neutral-200 pb-10"
      >
        <div>
          <Logo src={logo} name={doc.business.name} accent={accent} className="mb-8" rounded="rounded-none" wide />
          <HeaderBusinessName
            doc={doc}
            as="p"
            className="text-[11px] uppercase tracking-[0.4em] text-neutral-400"
            fallback="Studio"
          />
        </div>
        <EditableSection section="reference" accent={accent} className="text-right" tint={false}>
          <p className="text-[11px] uppercase tracking-[0.4em] text-neutral-400">{sheetTitle(doc)}</p>
          <p className="mt-3 text-3xl font-light tracking-tight">{doc.number}</p>
        </EditableSection>
      </EditableSection>
      <div className="mt-14 grid grid-cols-3 gap-10 text-[13px]">
        <Gate doc={doc} field="from" accent={accent}>
          <div>
            <Label className="text-neutral-400">From</Label>
            <Party p={doc.business} phone={doc.business.phone} className="mt-4" />
          </div>
        </Gate>
        <Gate doc={doc} field="billTo" accent={accent}>
          <div>
            <Label className="text-neutral-400">{partyHeading(doc, 'Bill to', 'Prepared for')}</Label>
            <Party p={doc.client} className="mt-4" />
          </div>
        </Gate>
        <div className="text-right">
          <Label className="text-neutral-400">Dates</Label>
          <DateMeta doc={doc} accent={accent} stacked className="mt-4" dueClassName="mt-1 text-neutral-400" />
        </div>
      </div>
      <FancyTable doc={doc} accent={accent} mode="lined" />
      <EditableSection
        section="totals"
        accent={accent}
        className="ml-auto mt-8 w-60 border border-neutral-900 p-4"
      >
        <div data-invoice-avoid-break className="space-y-2 text-[13px]">
          {/* Method 1 breakdown always shown for invoices (SARS §20/§20(5)) */}
          {!isQuote(doc.kind) || show(doc, "subtotal") ? (
            <div className="flex justify-between text-neutral-500">
              <span>{!isQuote(doc.kind) ? "Subtotal excl VAT" : "Subtotal"}</span>
              <span className="tabular-nums">{formatMoney(doc.totals.subtotal, doc.currency)}</span>
            </div>
          ) : null}
          {!isQuote(doc.kind) || show(doc, "vat") ? (
            (doc.totals.taxByRate.length > 0
              ? doc.totals.taxByRate
              : !isQuote(doc.kind)
                ? [{ rate: 0, taxable: doc.totals.subtotal, tax: 0 }]
                : []
            ).map((b) => (
              <div key={b.rate} className="flex justify-between text-neutral-500">
                <span>VAT {b.rate > 0 ? `${b.rate}%` : "0%"}</span>
                <span className="tabular-nums">{formatMoney(b.tax, doc.currency)}</span>
              </div>
            ))
          ) : null}
          <div className="border-t border-neutral-900 pt-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
              {!isQuote(doc.kind) ? "Total incl VAT" : amountDueLabel(doc.kind)}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {formatMoney(doc.totals.total, doc.currency)}
            </p>
          </div>
        </div>
      </EditableSection>
      <Notes doc={doc} accent={accent} />
    </Sheet>
  );
}

/** Color Block — left brand column */
function Bold({ doc, accent, logo }: Ctx) {
  return (
    <Sheet bleed className="bg-white text-[#0f172a] font-[family-name:var(--font-body)]">
      <div className="grid min-h-[297mm] grid-cols-[0.38fr_0.62fr]">
        <EditableSection
          section="header"
          accent={accent}
          tint={false}
          className="relative flex flex-col justify-between p-8 text-white"
        >
          <div className="absolute inset-0" style={{ background: accent }} aria-hidden />
          <div className="relative">
            <Logo src={logo} name={doc.business.name} accent="#fff" chip rounded="rounded-2xl" />
            <HeaderBusinessName
              doc={doc}
              className="mt-8 font-[family-name:var(--font-display)] text-3xl font-bold leading-tight"
              fallback="Studio"
            />
            <Gate doc={doc} field="from" accent={accent}>
              <div className="mt-8">
                <Label className="text-white/60">From</Label>
                <Party p={doc.business} phone={doc.business.phone} className="mt-2" light />
              </div>
            </Gate>
          </div>
          <EditableSection section="reference" accent={accent} tint={false} className="relative">
            <Label className="text-white/60">{sheetTitle(doc)}</Label>
            <p className="mt-2 text-2xl font-bold tabular-nums">{doc.number}</p>
            <DateMeta doc={doc} accent={accent} stacked className="mt-3 text-sm text-white/70" />
          </EditableSection>
        </EditableSection>
        <div className="invoice-pad flex flex-col">
          <Gate doc={doc} field="billTo" accent={accent}>
            <div>
              <Label className="opacity-40">{partyHeading(doc, 'Bill to', 'Prepared for')}</Label>
              <Party p={doc.client} className="mt-2 text-base" />
            </div>
          </Gate>
          <FancyTable doc={doc} accent={accent} mode="soft" />
          <InvoiceClosing doc={doc} accent={accent} />
        </div>
      </div>
    </Sheet>
  );
}

/** Serif Editorial — centered crest */
function Atelier({ doc, accent, logo }: Ctx) {
  return (
    <Sheet className="bg-[#faf6f0] text-[#2a211c] font-[family-name:var(--font-display)]">
      <EditableSection section="header" accent={accent} className="text-center">
        <LogoFrame className="mx-auto rounded-full ring-1 ring-black/10" style={{ background: `${accent}18` }}>
          <Logo src={logo} name={doc.business.name} accent={accent} rounded="rounded-full" />
        </LogoFrame>
        <HeaderBusinessName
          doc={doc}
          className="mt-5 text-3xl font-semibold tracking-tight"
          fallback="Atelier"
        />
        <EditableSection section="reference" accent={accent} className="mx-auto mt-5 flex items-center justify-center gap-3" tint={false}>
          <span className="h-px w-12 bg-current" style={{ color: accent }} />
          <span className="text-[11px] uppercase tracking-[0.35em]" style={{ color: accent }}>
            {sheetTitle(doc)} {doc.number}
          </span>
          <span className="h-px w-12 bg-current" style={{ color: accent }} />
        </EditableSection>
        <DateMeta doc={doc} accent={accent} className="mt-3 text-sm opacity-55" sep=" — " duePrefix="" />
      </EditableSection>
      <div className="mt-12 grid grid-cols-2 gap-12 text-sm">
        <EditableSection section="from" accent={accent}>
          <Label className="opacity-45">Studio</Label>
          <Party p={doc.business} phone={doc.business.phone} className="mt-3 font-[family-name:var(--font-body)]" />
        </EditableSection>
        <EditableSection section="billTo" accent={accent} className="text-right">
          <Label className="opacity-45">Client</Label>
          <Party p={doc.client} className="mt-3 font-[family-name:var(--font-body)]" />
        </EditableSection>
      </div>
      <FancyTable doc={doc} accent={accent} mode="soft" />
      <InvoiceClosing doc={doc} accent={accent} totalsShape="box" />
    </Sheet>
  );
}

/** Corporate Blue — stacked header bars */
function Nordic({ doc, accent, logo }: Ctx) {
  return (
    <Sheet bleed className="bg-white text-[#0f172a] font-[family-name:var(--font-body)]">
      <EditableSection
        section="header"
        accent={accent}
        tint={false}
        className="relative px-10 py-7 text-white"
      >
        <div className="absolute inset-0" style={{ background: accent }} aria-hidden />
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo src={logo} name={doc.business.name} accent="#fff" chip />
            <HeaderBusinessName
              doc={doc}
              className="text-2xl font-bold tracking-tight"
              fallback="Company"
            />
          </div>
          <EditableSection
            section="reference"
            accent={accent}
            tint={false}
            className="rounded-lg bg-white/15 px-4 py-2 text-right backdrop-blur"
          >
            <p className="text-[10px] uppercase tracking-[0.24em] text-white/70">{sheetTitle(doc)}</p>
            <p className="font-semibold tabular-nums">{doc.number}</p>
          </EditableSection>
        </div>
      </EditableSection>
      {(show(doc, "issueDate") && doc.issueDate) || (show(doc, "dueDate") && doc.dueDate) ? (
        <div
          className="relative px-10 py-3 text-sm text-white/90"
          style={{ background: `color-mix(in srgb, ${accent} 88%, black)` }}
        >
          <DateMeta doc={doc} accent={accent} issuePrefix="Issued " sep=" · " />
        </div>
      ) : null}
      <div className="invoice-pad">
        <div className="grid grid-cols-2 gap-8">
          <EditableSection section="billTo" accent={accent}>
            <Label className="text-slate-400">{partyHeading(doc, 'Bill to', 'Prepared for')}</Label>
            <Party p={doc.client} className="mt-2" />
          </EditableSection>
          <EditableSection section="from" accent={accent}>
            <Label className="text-slate-400">From</Label>
            <Party p={doc.business} phone={doc.business.phone} className="mt-2" />
          </EditableSection>
        </div>
        <FancyTable doc={doc} accent={accent} mode="zebra" />
        <InvoiceClosing doc={doc} accent={accent} />
      </div>
    </Sheet>
  );
}

/** Noir — dark creative */
function Midnight({ doc, accent, logo }: Ctx) {
  return (
    <Sheet className="bg-[#070b16] text-[#e8eefc] font-[family-name:var(--font-body)]">
      <EditableSection
        section="header"
        accent={accent}
        tint={false}
        className="relative flex items-start justify-between gap-6"
      >
        <div>
          <Logo src={logo} name={doc.business.name} accent={accent} wide />
          <HeaderBusinessName
            doc={doc}
            className="mt-6 font-[family-name:var(--font-display)] text-3xl font-semibold"
            fallback="Midnight"
          />
        </div>
        <EditableSection
          section="reference"
          accent={accent}
          tint={false}
          className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-right backdrop-blur-md"
        >
          <Label className="text-white/45">{sheetTitle(doc)}</Label>
          <p className="mt-2 text-xl font-semibold tabular-nums" style={{ color: accent }}>
            {doc.number}
          </p>
          <DateMeta doc={doc} accent={accent} className="mt-3 text-xs text-white/50" duePrefix="" />
        </EditableSection>
      </EditableSection>
      <div className="relative mt-10 grid grid-cols-2 gap-4">
        <EditableSection
          section="billTo"
          accent={accent}
          tint={false}
          className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
        >
          <Label className="text-white/40">{partyHeading(doc, 'Bill to', 'Prepared for')}</Label>
          <Party p={doc.client} className="mt-2" light />
        </EditableSection>
        <EditableSection
          section="from"
          accent={accent}
          tint={false}
          className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
        >
          <Label className="text-white/40">From</Label>
          <Party p={doc.business} phone={doc.business.phone} className="mt-2" light />
        </EditableSection>
      </div>
      <FancyTable doc={doc} accent={accent} mode="dark" />
      <InvoiceClosing doc={doc} accent={accent} light />
    </Sheet>
  );
}

/** Soft Pastel — rounded card */
function Coral({ doc, accent, logo }: Ctx) {
  return (
    <Sheet className="bg-[#fff5f7] text-[#1c1917] font-[family-name:var(--font-display)]">
      <div className="relative overflow-hidden rounded-[28px] bg-white shadow-[0_20px_50px_rgba(225,29,72,0.08)] ring-1 ring-rose-100">
        <EditableSection
          section="header"
          accent={accent}
          className="relative flex items-center justify-between gap-4 px-7 py-6"
        >
          <div className="flex items-center gap-3">
            <Logo src={logo} name={doc.business.name} accent={accent} rounded="rounded-2xl" />
            <div>
              <HeaderBusinessName
                doc={doc}
                className="text-xl font-semibold"
                fallback="Studio"
              />
              <HeaderEmail doc={doc} className="text-xs opacity-50" />
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <p className="text-[10px] uppercase tracking-[0.22em] opacity-50">{sheetTitle(doc)}</p>
            <EditableSection
              section="reference"
              accent={accent}
              tint={false}
              className="rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-sm"
              style={{ background: accent }}
            >
              {doc.number}
            </EditableSection>
          </div>
        </EditableSection>
        <div className="grid grid-cols-3 gap-4 px-7 py-6 text-sm font-[family-name:var(--font-body)]">
          <EditableSection section="billTo" accent={accent}>
            <Label className="opacity-40">{partyHeading(doc, 'Bill to', 'Prepared for')}</Label>
            <Party p={doc.client} className="mt-2" />
          </EditableSection>
          <EditableSection section="from" accent={accent}>
            <Label className="opacity-40">From</Label>
            <Party p={doc.business} phone={doc.business.phone} className="mt-2" />
          </EditableSection>
          <div>
            <Label className="opacity-40">Dates</Label>
            <DateMeta doc={doc} accent={accent} stacked className="mt-2" issueClassName="font-medium" dueClassName="opacity-55" />
          </div>
        </div>
        <div className="px-5 pb-7 font-[family-name:var(--font-body)]">
          <FancyTable doc={doc} accent={accent} mode="soft" />
          <InvoiceClosing doc={doc} accent={accent} />
        </div>
      </div>
    </Sheet>
  );
}

/** Consulting — left accent rail */
function Slate({ doc, accent, logo }: Ctx) {
  return (
    <Sheet bleed className="bg-white text-[#0f172a] font-[family-name:var(--font-body)]">
      <div className="relative grid min-h-[297mm] grid-cols-[72px_1fr]">
        <div className="relative" style={{ background: accent }} aria-hidden />
        <div className="invoice-pad">
          <EditableSection
            section="header"
            accent={accent}
            className="flex items-start justify-between gap-6"
          >
            <div className="flex gap-3">
              <Logo src={logo} name={doc.business.name} accent={accent} rounded="rounded-md" />
              <div>
                <HeaderBusinessName
                  doc={doc}
                  className="text-2xl font-bold tracking-tight"
                  fallback="Advisory"
                />
                <p className="mt-1 font-[family-name:var(--font-mono)] text-[11px] text-slate-500">
                  {[
                    companyNumberLine(doc.business.companyNumber),
                    doc.business.taxId || doc.business.email,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </div>
            <EditableSection
              section="reference"
              accent={accent}
              className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-right"
            >
              <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-slate-500">
                {sheetTitle(doc)}
              </p>
              <p className="mt-1 font-[family-name:var(--font-mono)] text-lg font-semibold">
                {doc.number}
              </p>
            </EditableSection>
          </EditableSection>
          <div className="mt-8 grid grid-cols-3 gap-6 border-y border-slate-200 py-6">
            <EditableSection section="billTo" accent={accent}>
              <Label className="text-slate-400">Client</Label>
              <Party p={doc.client} className="mt-2" />
            </EditableSection>
            <EditableSection section="from" accent={accent}>
              <Label className="text-slate-400">Supplier</Label>
              <Party p={doc.business} phone={doc.business.phone} className="mt-2" />
            </EditableSection>
            <div className="font-[family-name:var(--font-mono)] text-xs">
              <Label className="text-slate-400">Terms</Label>
              <DateMeta doc={doc} accent={accent} stacked className="mt-2" issuePrefix="Issue " />
            </div>
          </div>
          <FancyTable doc={doc} accent={accent} mode="zebra" />
          <InvoiceClosing doc={doc} accent={accent} />
        </div>
      </div>
    </Sheet>
  );
}

/** Black & Gold */
function Luxe({ doc, accent, logo }: Ctx) {
  return (
    <Sheet className="bg-[#0c0a09] text-[#f5efe6] font-[family-name:var(--font-display)]">
      <div className="relative px-7 py-9">
        <EditableSection section="header" accent={accent} tint={false} className="text-center">
          <LogoFrame className="mx-auto rounded-full" style={{ boxShadow: `0 0 0 1px ${accent}` }}>
            <Logo src={logo} name={doc.business.name} accent={accent} rounded="rounded-full" />
          </LogoFrame>
          <p className="mt-6 text-[11px] uppercase tracking-[0.5em]" style={{ color: accent }}>
            {sheetTitle(doc)}
          </p>
          <HeaderBusinessName
            doc={doc}
            className="mt-3 text-3xl font-semibold tracking-tight"
            fallback="Maison"
          />
          <EditableSection section="reference" accent={accent} tint={false}>
            <p className="mt-3 text-sm tabular-nums opacity-70">{doc.number}</p>
          </EditableSection>
          {show(doc, "from") ? (
            <p className="mx-auto mt-4 max-w-md text-center font-[family-name:var(--font-body)] text-[11px] leading-relaxed opacity-55">
              {[
                doc.business.address,
                [doc.business.postalCode, doc.business.city].filter(Boolean).join(" "),
                doc.business.country,
                companyNumberLine(doc.business.companyNumber),
                doc.business.taxId
                  ? `${isQuote(doc.kind) ? "Tax ID" : "VAT No."} ${doc.business.taxId}`
                  : "",
              ]
                .filter(Boolean)
                .join(" \u00b7 ")}
            </p>
          ) : null}
        </EditableSection>
        <div className="mt-10 grid grid-cols-2 gap-10 font-[family-name:var(--font-body)] text-sm">
          <EditableSection section="billTo" accent={accent} tint={false}>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: accent }}>
              Prepared for
            </p>
            <Party p={doc.client} className="mt-3" light />
          </EditableSection>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: accent }}>
              Dates
            </p>
            <DateMeta doc={doc} accent={accent} stacked className="mt-3" dueClassName="opacity-60" />
          </div>
        </div>
        <div className="font-[family-name:var(--font-body)]">
          <FancyTable doc={doc} accent={accent} mode="gold" />
          <InvoiceClosing doc={doc} accent={accent} light totalsShape="box" />
        </div>
      </div>
    </Sheet>
  );
}

/** Pastel Sage */
function Meadow({ doc, accent, logo }: Ctx) {
  return (
    <Sheet className="bg-[#eef5ea] text-[#1f2a22] font-[family-name:var(--font-display)]">
      <EditableSection
        section="header"
        accent={accent}
        className="relative flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <Logo src={logo} name={doc.business.name} accent={accent} rounded="rounded-full" />
          <div>
            <HeaderBusinessName
              doc={doc}
              className="text-2xl font-semibold"
              fallback="Meadow"
            />
            <HeaderEmail doc={doc} className="text-sm opacity-55" />
          </div>
        </div>
        <EditableSection section="reference" accent={accent} className="text-right">
          <Label className="opacity-45">{sheetTitle(doc)}</Label>
          <p className="mt-1 text-xl font-semibold" style={{ color: accent }}>
            {doc.number}
          </p>
        </EditableSection>
      </EditableSection>
      <div className="relative mt-10 grid grid-cols-2 gap-4 font-[family-name:var(--font-body)]">
        <EditableSection
          section="billTo"
          accent={accent}
          className="rounded-[28px] bg-white/90 p-5 shadow-sm ring-1 ring-black/5"
        >
          <Label className="opacity-40">{partyHeading(doc, 'Bill to', 'Prepared for')}</Label>
          <Party p={doc.client} className="mt-2" />
        </EditableSection>
        <EditableSection
          section="from"
          accent={accent}
          className="rounded-[28px] bg-white/55 p-5 ring-1 ring-black/5"
        >
          <Label className="opacity-40">Schedule</Label>
          <DateMeta doc={doc} accent={accent} stacked className="mt-2 text-sm" issueClassName="font-medium" dueClassName="opacity-60" />
          <Party p={doc.business} phone={doc.business.phone} className="mt-4 text-xs" strong={false} />
        </EditableSection>
      </div>
      <div className="font-[family-name:var(--font-body)]">
        <FancyTable doc={doc} accent={accent} mode="soft" />
        <InvoiceClosing doc={doc} accent={accent} />
      </div>
    </Sheet>
  );
}

/** Mono Punch */
function Ink({ doc, accent, logo }: Ctx) {
  return (
    <Sheet className="bg-white text-black font-[family-name:var(--font-display)]">
      <div className="relative">
        <EditableSection
          section="header"
          accent={accent}
          className="flex items-start justify-between gap-6"
        >
          <div>
            <Logo src={logo} name={doc.business.name} accent={accent} rounded="rounded-none" />
            <HeaderBusinessName
              doc={doc}
              className="mt-5 text-3xl font-black uppercase tracking-tight"
              fallback="Ink Co"
            />
          </div>
          <EditableSection section="reference" accent={accent} className="text-right">
            <p className="text-5xl font-black tracking-tighter">{sheetTitle(doc).toUpperCase()}</p>
            <p className="mt-2 font-[family-name:var(--font-mono)] text-sm">{doc.number}</p>
            <DateMeta
              doc={doc}
              accent={accent}
              className="mt-4 text-sm font-[family-name:var(--font-body)]"
              sep=" / "
              duePrefix=""
            />
          </EditableSection>
        </EditableSection>
        <div className="mt-10 grid grid-cols-2 gap-10 border-y-[3px] border-black py-6 font-[family-name:var(--font-body)] text-sm">
          <EditableSection section="billTo" accent={accent}>
            <Label>{partyHeading(doc, "Bill to", "Prepared for")}</Label>
            <Party p={doc.client} className="mt-3" />
          </EditableSection>
          <EditableSection section="from" accent={accent}>
            <Label>From</Label>
            <Party p={doc.business} phone={doc.business.phone} className="mt-3" />
          </EditableSection>
        </div>
        <div className="font-[family-name:var(--font-body)]">
          <FancyTable doc={doc} accent={accent} mode="solid" />
          <InvoiceClosing doc={doc} accent={accent} />
        </div>
      </div>
    </Sheet>
  );
}

/** Gradient Studio */
function Studio({ doc, accent, logo }: Ctx) {
  return (
    <Sheet bleed className="bg-[#fafaf9] text-[#1c1917] font-[family-name:var(--font-body)]">
      <EditableSection
        section="header"
        accent={accent}
        tint={false}
        className="relative overflow-hidden px-10 pb-14 pt-9 text-white"
      >
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${accent} 0%, ${accent} 48%, color-mix(in srgb, ${accent} 55%, #fb7185) 100%)`,
          }}
          aria-hidden
        />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <Logo src={logo} name={doc.business.name} accent="#fff" chip wide />
            <HeaderBusinessName
              doc={doc}
              className="mt-6 font-[family-name:var(--font-display)] text-4xl font-bold leading-none tracking-tight"
              fallback="Studio"
            />
          </div>
          <EditableSection
            section="reference"
            accent={accent}
            tint={false}
            className="rounded-2xl bg-white/20 px-4 py-3 text-right backdrop-blur"
          >
            <p className="text-[10px] uppercase tracking-[0.24em] text-white/80">{sheetTitle(doc)}</p>
            <p className="mt-1 text-lg font-bold tabular-nums">{doc.number}</p>
          </EditableSection>
        </div>
      </EditableSection>
      <div className="invoice-pad -mt-6">
        <div className="grid grid-cols-[1.2fr_0.8fr] gap-6">
          <EditableSection
            section="billTo"
            accent={accent}
            className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5"
          >
            <Label className="opacity-40">{partyHeading(doc, 'Bill to', 'Prepared for')}</Label>
            <Party p={doc.client} className="mt-2" />
          </EditableSection>
          <EditableSection
            section="from"
            accent={accent}
            className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5"
          >
            <Label className="opacity-40">Dates</Label>
            <DateMeta doc={doc} accent={accent} stacked className="mt-2" issueClassName="font-medium" dueClassName="opacity-55" />
            <Party p={doc.business} phone={doc.business.phone} className="mt-4 text-xs" strong={false} />
          </EditableSection>
        </div>
        <FancyTable doc={doc} accent={accent} mode="soft" />
        <InvoiceClosing doc={doc} accent={accent} />
      </div>
    </Sheet>
  );
}

/** Forma Navy */
function Harbor({ doc, accent, logo }: Ctx) {
  const brass = "#d4a84b";
  return (
    <Sheet bleed className="bg-[#f4f7fb] text-[#0b1220] font-[family-name:var(--font-body)]">
      <EditableSection
        section="header"
        accent={accent}
        tint={false}
        className="relative px-10 py-8 text-white"
      >
        <div className="absolute inset-0" style={{ background: accent }} aria-hidden />
        <div
          className="absolute bottom-0 left-0 right-0 h-1"
          style={{ background: brass }}
          aria-hidden
        />
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo src={logo} name={doc.business.name} accent={brass} chip />
            <div>
              <HeaderBusinessName
                doc={doc}
                className="text-2xl font-bold tracking-tight"
                fallback="Harbor"
              />
              <HeaderEmail doc={doc} className="text-xs text-white/65" />
            </div>
          </div>
          <EditableSection section="reference" accent={accent} tint={false} className="text-right">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/55">{sheetTitle(doc)}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color: brass }}>
              {doc.number}
            </p>
          </EditableSection>
        </div>
      </EditableSection>
      <div className="invoice-pad">
        <div className="grid grid-cols-3 gap-6">
          <EditableSection section="billTo" accent={accent}>
            <Label className="text-slate-400">{partyHeading(doc, 'Bill to', 'Prepared for')}</Label>
            <Party p={doc.client} className="mt-2" />
          </EditableSection>
          <EditableSection section="from" accent={accent}>
            <Label className="text-slate-400">From</Label>
            <Party p={doc.business} phone={doc.business.phone} className="mt-2" />
          </EditableSection>
          <div>
            <Label className="text-slate-400">Schedule</Label>
            <DateMeta doc={doc} accent={accent} stacked className="mt-2" issueClassName="font-medium" dueClassName="opacity-55" />
          </div>
        </div>
        <FancyTable doc={doc} accent={accent} mode="zebra" />
        <InvoiceClosing doc={doc} accent={accent} />
      </div>
    </Sheet>
  );
}

/** Heritage parchment */
function Parchment({ doc, accent, logo }: Ctx) {
  return (
    <Sheet className="bg-[#f2e6d0] text-[#3f2a1d] font-[family-name:var(--font-display)]">
      <div className="relative rounded-sm border border-[#7c2d12]/25 bg-[#fff8ea]/40 p-1">
        <div className="rounded-sm border border-[#7c2d12]/20 p-6 sm:p-8">
          <EditableSection
            section="header"
            accent={accent}
            className="flex items-start justify-between gap-6"
          >
            <div className="flex gap-3">
              <Logo src={logo} name={doc.business.name} accent={accent} rounded="rounded-sm" />
              <div>
                <HeaderBusinessName
                  doc={doc}
                  className="text-2xl font-semibold"
                  fallback="Parchment"
                />
                <Party
                  p={doc.business}
                  phone={doc.business.phone}
                  className="mt-2 font-[family-name:var(--font-body)] text-xs"
                  strong={false}
                />
              </div>
            </div>
            <EditableSection section="reference" accent={accent} className="text-right">
              <p className="text-sm uppercase tracking-[0.28em]" style={{ color: accent }}>
                {sheetTitle(doc)}
              </p>
              <p className="mt-2 text-lg font-semibold tabular-nums">{doc.number}</p>
              <DateMeta
                doc={doc}
                accent={accent}
                stacked
                className="mt-4 font-[family-name:var(--font-body)] text-sm"
                issuePrefix="Dated "
                duePrefix="Payable by "
                dueClassName="opacity-70"
              />
            </EditableSection>
          </EditableSection>
          <EditableSection
            section="billTo"
            accent={accent}
            className="mt-10 border border-[#7c2d12]/30 bg-[#fff8ea]/70 px-5 py-4 font-[family-name:var(--font-body)]"
          >
            <Label className="opacity-55">Rendered to</Label>
            <Party p={doc.client} className="mt-2" />
          </EditableSection>
          <div className="font-[family-name:var(--font-body)]">
            <FancyTable doc={doc} accent={accent} mode="soft" />
            <InvoiceClosing doc={doc} accent={accent} totalsShape="box" />
          </div>
        </div>
      </div>
    </Sheet>
  );
}

function CanvaCopy({ doc, accent, logo }: Ctx & { custom?: CustomTemplate | null }) {
  const custom = doc.customTemplate;
  const headerMm = custom?.contentTopMm ?? 45;
  const useAccent = custom?.accentColor || accent;

  return (
    <Sheet bleed className="bg-white text-[#1c1917] font-[family-name:var(--font-body)]">
      {custom?.backgroundDataUrl ? (
        <div
          className="relative w-full shrink-0 overflow-hidden border-b border-black/5"
          style={{ height: `${headerMm}mm` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={custom.backgroundDataUrl}
            alt=""
            className="h-full w-full object-cover object-top"
          />
        </div>
      ) : null}
      <div className="invoice-pad bg-white">
        <EditableSection
          section="header"
          accent={useAccent}
          className="mb-4 flex items-start justify-between gap-4"
        >
          <Logo
            src={logo}
            name={doc.business.name}
            accent={useAccent}
            wide
          />
          <div className="min-w-0 text-right">
            <ReferenceBlock doc={doc} accent={useAccent} numberClassName="text-lg" />
            <DateMeta
              doc={doc}
              accent={useAccent}
              stacked
              className="mt-2 text-sm text-neutral-700"
              issuePrefix="Issued "
            />
          </div>
        </EditableSection>
        <div className="grid grid-cols-2 gap-6 text-sm">
          <Gate doc={doc} field="from" accent={useAccent}>
            <div>
              <Label className="text-neutral-500">From</Label>
              <Party p={doc.business} phone={doc.business.phone} className="mt-1" />
            </div>
          </Gate>
          <Gate doc={doc} field="billTo" accent={useAccent}>
            <div>
              <Label className="text-neutral-500">{partyHeading(doc, 'Bill to', 'Prepared for')}</Label>
              <Party p={doc.client} className="mt-1" />
            </div>
          </Gate>
        </div>
        <FancyTable doc={doc} accent={useAccent} mode="soft" />
        <InvoiceClosing doc={doc} accent={useAccent} />
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
          companyNumber: visibility.companyNumber
            ? doc.business.companyNumber
            : "",
        }
      : {
          name: "",
          email: "",
          address: "",
          city: "",
          postalCode: "",
          country: "",
          taxId: "",
          companyNumber: "",
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
  const designCustom =
    view.customTemplate?.source === "design" ? view.customTemplate : null;
  const layoutId =
    designCustom?.baseTemplateId && isBuiltinTemplateId(designCustom.baseTemplateId)
      ? designCustom.baseTemplateId
      : view.templateId;
  const layoutMeta = isBuiltinTemplateId(layoutId)
    ? getBuiltinTemplate(layoutId)
    : meta;
  const accent =
    view.accentColor || layoutMeta?.defaultAccent || meta?.defaultAccent || "#0f766e";
  const logo = visibility.logo
    ? view.logoDataUrl || view.business.logoDataUrl
    : undefined;

  let decorations = view.decorations ?? [];
  if (!visibility.logo) {
    decorations = decorations.filter((d) => !isLogoDecoration(d));
  }
  if (!visibility.businessName) {
    decorations = decorations.filter((d) => !isBusinessNameDecoration(d));
  }
  decorations = fillLogoImages(
    decorations,
    visibility.logo ? logo : undefined,
  );

  const logoOnCanvas = decorations.some(isLogoDecoration);

  const useCanva =
    Boolean(view.customTemplate?.backgroundDataUrl) &&
    view.customTemplate?.source !== "design";

  const tree = useCanva ? (
    <CanvaCopy doc={view} accent={accent} logo={logo} />
  ) : (
    <>{(RENDERERS[layoutId] || Classic)({ doc: view, accent, logo })}</>
  );

  return (
    <LogoVisibleCtx.Provider value={visibility.logo}>
      {/* Identity lives on the canvas when a logo shape exists; otherwise the layout logo is used. */}
      <InlineLogoCtx.Provider value={!logoOnCanvas}>
        {/* SARS: use "VAT No." label for supplier/recipient taxId on invoices; quotes keep "Tax ID". */}
        <VatLabelCtx.Provider
          value={isQuote(view.kind) || !view.sarsTaxInvoice ? "Tax ID" : "VAT No."}
        >
        <DecorationMediaContext.Provider
          value={{
            logoSrc: logo,
            logoName: view.business.name || "",
            businessName: visibility.businessName ? view.business.name || "" : "",
            logoAccent: accent,
          }}
        >
          <FontPairCtx.Provider value={view.fontPair || DEFAULT_FONT_PAIR}>
            <LogoSizeCtx.Provider value={clampLogoSizePx(view.logoSizePx)}>
              <SectionAccentsCtx.Provider value={view.sectionAccents ?? {}}>
                <SheetDecorCtx.Provider value={decorations}>
                  {tree}
                </SheetDecorCtx.Provider>
              </SectionAccentsCtx.Provider>
            </LogoSizeCtx.Provider>
          </FontPairCtx.Provider>
        </DecorationMediaContext.Provider>
        </VatLabelCtx.Provider>
      </InlineLogoCtx.Provider>
    </LogoVisibleCtx.Provider>
  );
}

import type { InvoiceVisibility } from "@/lib/invoice-visibility";

export type DocKind = "invoice" | "quote";
export type InvoiceStatus =
  | "draft"
  | "issued"
  | "paid"
  | "void"
  | "accepted"
  | "declined";
export type TaxMode = "exclusive" | "inclusive";
export type FontPair = "editorial" | "modern" | "mono" | "classic";

/** Clickable regions on the invoice preview for per-section styling & editing. */
export type InvoiceSectionId =
  | "header"
  | "logo"
  | "reference"
  | "dates"
  | "from"
  | "billTo"
  | "lineItems"
  | "totals"
  | "notes"
  | "payment";

export type SectionAccents = Partial<Record<InvoiceSectionId, string>>;

/** Decorative shape/text overlay on the invoice canvas (percent coords on A4 sheet). */
export interface InvoiceDecoration {
  id: string;
  shapeId: string;
  /** Top-left X as % of sheet width (0–100) */
  x: number;
  /** Top-left Y as % of sheet height (0–100) */
  y: number;
  /** Width as % of sheet width */
  w: number;
  /** Height as % of sheet height */
  h: number;
  rotation: number;
  opacity: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  zIndex: number;
  locked?: boolean;
  /** Render behind invoice content (watermarks) */
  behind?: boolean;
  /** Optional CSS blur in px (soft glow orbs) */
  blur?: number;
  /** For shapeId === "text-block" */
  text?: string;
  fontSize?: number;
  fontWeight?: "normal" | "bold";
  /** For shapeId === "image" — uploaded image data URL */
  imageDataUrl?: string;
  /** How image/logo fills its box */
  objectFit?: "contain" | "cover";
}

export type { InvoiceVisibility };

/** Built-in template ids + `custom:{id}` for Canva/uploaded designs. */
export type BuiltinTemplateId =
  | "classic"
  | "minimal"
  | "bold"
  | "atelier"
  | "nordic"
  | "midnight"
  | "coral"
  | "slate"
  | "luxe"
  | "meadow"
  | "ink"
  | "studio"
  | "harbor"
  | "parchment";

export type TemplateId = BuiltinTemplateId | (string & {});

export interface CustomTemplate {
  id: string;
  name: string;
  source: "canva" | "upload" | "design";
  /** Full-page (or letterhead) design export from Canva / design tool */
  backgroundDataUrl?: string;
  accentColor: string;
  /** mm from top where invoice fields begin (leave room for Canva header art) */
  contentTopMm?: number;
  contentStyle?: "card" | "transparent" | "band";
  createdAt: string;
  /** Builtin layout to render when source is "design" */
  baseTemplateId?: BuiltinTemplateId;
  fontPair?: FontPair;
  sectionAccents?: SectionAccents;
  decorations?: InvoiceDecoration[];
  logoSizePx?: number;
  visibility?: InvoiceVisibility;
}

export function isDesignCustomTemplate(
  t: CustomTemplate | null | undefined,
): t is CustomTemplate & { source: "design"; baseTemplateId: BuiltinTemplateId } {
  return Boolean(
    t &&
      t.source === "design" &&
      t.baseTemplateId &&
      isBuiltinTemplateIdSafe(t.baseTemplateId),
  );
}

/** Local check — avoids circular import with catalog. */
function isBuiltinTemplateIdSafe(id: string): id is BuiltinTemplateId {
  return (
    id === "classic" ||
    id === "minimal" ||
    id === "bold" ||
    id === "atelier" ||
    id === "nordic" ||
    id === "midnight" ||
    id === "coral" ||
    id === "slate" ||
    id === "luxe" ||
    id === "meadow" ||
    id === "ink" ||
    id === "studio" ||
    id === "harbor" ||
    id === "parchment"
  );
}

export interface BusinessLogo {
  id: string;
  name: string;
  dataUrl: string;
  createdAt: string;
}

export interface Business {
  id: "default";
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  taxId: string;
  /** @deprecated prefer logos[]; kept in sync with default logo for older data */
  logoDataUrl?: string;
  logos?: BusinessLogo[];
  defaultLogoId?: string;
  accentColor: string;
  fontPair: FontPair;
  /** Default logo print size in px (48–240) */
  defaultLogoSizePx?: number;
  currency: string;
  defaultTaxRate: number;
  taxMode: TaxMode;
  paymentTerms: string;
  netDays: number;
  invoicePrefix: string;
  quotePrefix: string;
  payslipPrefix?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  taxId: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogItem {
  id: string;
  description: string;
  unitPrice: number;
  unit: string;
  taxRate: number;
  createdAt: string;
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  unit: string;
  taxRate: number;
  discountPercent: number;
}

export interface TaxBucket {
  rate: number;
  taxable: number;
  tax: number;
}

export interface InvoiceTotals {
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  taxByRate: TaxBucket[];
  total: number;
}

export interface PartySnapshot {
  name: string;
  email: string;
  phone?: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  taxId: string;
}

export interface IssuedSnapshot {
  number: string;
  issuedAt: string;
  business: PartySnapshot & {
    logoDataUrl?: string;
    accentColor: string;
    fontPair: FontPair;
  };
  client: PartySnapshot;
  currency: string;
  taxMode: TaxMode;
  templateId: TemplateId;
  /** Frozen Canva/custom background if used */
  customBackgroundDataUrl?: string;
  customContentTopMm?: number;
  customContentStyle?: CustomTemplate["contentStyle"];
  /** Frozen builtin layout for Design studio templates */
  designBaseTemplateId?: BuiltinTemplateId;
  issueDate: string;
  dueDate: string;
  notes: string;
  paymentInstructions: string;
  lineItems: LineItem[];
  totals: InvoiceTotals;
  /** Frozen print visibility at issue time */
  visibility?: InvoiceVisibility;
  /** Frozen logo size at issue time */
  logoSizePx?: number;
  /** Per-section accent overrides frozen at issue */
  sectionAccents?: SectionAccents;
  /** Decorative shapes frozen at issue */
  decorations?: InvoiceDecoration[];
}

export interface Invoice {
  id: string;
  /** Missing on older records — treat as invoice. */
  kind?: DocKind;
  status: InvoiceStatus;
  /** Draft: null/blank auto-assigns on issue. Issued documents keep this printed number. */
  number: string | null;
  /** Quote that this invoice was created from */
  sourceQuoteId?: string | null;
  /** Invoice created from this quote */
  convertedInvoiceId?: string | null;
  clientId: string | null;
  client: PartySnapshot;
  issueDate: string;
  dueDate: string;
  currency: string;
  taxMode: TaxMode;
  templateId: TemplateId;
  accentColor: string;
  /** Typography pair for this invoice; falls back to business default */
  fontPair?: FontPair;
  /** Logo print size in px (48–240); falls back to business default */
  logoSizePx?: number;
  /** Which saved business logo to print; null = none */
  logoId?: string | null;
  notes: string;
  paymentInstructions: string;
  lineItems: LineItem[];
  totals: InvoiceTotals;
  /** Toggle which blocks appear on preview / PDF */
  visibility?: InvoiceVisibility;
  /** Per-section accent colours (falls back to accentColor) */
  sectionAccents?: SectionAccents;
  /** Decorative shapes / text on the invoice canvas */
  decorations?: InvoiceDecoration[];
  snapshot?: IssuedSnapshot;
  lastSentAt?: string;
  lastSentTo?: string;
  createdAt: string;
  updatedAt: string;
}

export type PayslipStatus = "draft" | "issued" | "void";

export interface PayLine {
  id: string;
  label: string;
  amount: number;
}

export interface PayslipEmployee {
  name: string;
  email: string;
  taxId: string;
  employeeNumber: string;
  jobTitle: string;
  address: string;
}

export interface PayslipTotals {
  gross: number;
  deductionTotal: number;
  net: number;
}

export interface Payslip {
  id: string;
  status: PayslipStatus;
  number: string | null;
  clientId: string | null;
  employee: PayslipEmployee;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  currency: string;
  accentColor: string;
  fontPair: FontPair;
  logoId?: string | null;
  earnings: PayLine[];
  deductions: PayLine[];
  notes: string;
  totals: PayslipTotals;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  id: "default";
  nextSequence: number;
  sequenceYear: number;
  nextQuoteSequence?: number;
  quoteSequenceYear?: number;
  nextPayslipSequence?: number;
  payslipSequenceYear?: number;
  defaultTemplate: TemplateId;
  /** Silent snapshots in IndexedDB (default on). */
  autoBackupEnabled?: boolean;
  /** Keep the newest N auto-backups (default 10). */
  autoBackupKeep?: number;
  lastAutoBackupAt?: string;
}

/** Local auto-backup snapshot stored in IndexedDB. */
export interface AutoBackupRecord {
  id: string;
  createdAt: string;
  reason: string;
  invoiceCount: number;
  clientCount: number;
  payload: unknown;
}

export const EMPTY_PARTY: PartySnapshot = {
  name: "",
  email: "",
  address: "",
  city: "",
  postalCode: "",
  country: "",
  taxId: "",
};

export const DEFAULT_ACCENT = "#0f766e";

export function isCustomTemplateId(id: string): id is `custom:${string}` {
  return id.startsWith("custom:");
}

export function customTemplateKey(id: string): string {
  return id.startsWith("custom:") ? id.slice(7) : id;
}

export function toCustomTemplateId(id: string): TemplateId {
  return `custom:${id}`;
}

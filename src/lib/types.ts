export type InvoiceStatus = "draft" | "issued" | "paid" | "void";
export type TaxMode = "exclusive" | "inclusive";
export type FontPair = "editorial" | "modern" | "mono";

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
  source: "canva" | "upload";
  /** Full-page (or letterhead) design export from Canva / design tool */
  backgroundDataUrl: string;
  accentColor: string;
  /** mm from top where invoice fields begin (leave room for Canva header art) */
  contentTopMm: number;
  contentStyle: "card" | "transparent" | "band";
  createdAt: string;
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
  currency: string;
  defaultTaxRate: number;
  taxMode: TaxMode;
  paymentTerms: string;
  netDays: number;
  invoicePrefix: string;
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
  issueDate: string;
  dueDate: string;
  notes: string;
  paymentInstructions: string;
  lineItems: LineItem[];
  totals: InvoiceTotals;
}

export interface Invoice {
  id: string;
  status: InvoiceStatus;
  number: string | null;
  clientId: string | null;
  client: PartySnapshot;
  issueDate: string;
  dueDate: string;
  currency: string;
  taxMode: TaxMode;
  templateId: TemplateId;
  accentColor: string;
  /** Which saved business logo to print; null = none */
  logoId?: string | null;
  notes: string;
  paymentInstructions: string;
  lineItems: LineItem[];
  totals: InvoiceTotals;
  snapshot?: IssuedSnapshot;
  lastSentAt?: string;
  lastSentTo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  id: "default";
  nextSequence: number;
  sequenceYear: number;
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

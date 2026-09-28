import Dexie, { type EntityTable } from "dexie";
import {
  type AppSettings,
  type AutoBackupRecord,
  type Business,
  type CatalogItem,
  type Client,
  type CustomTemplate,
  type Expense,
  type Invoice,
  type Payslip,
  DEFAULT_ACCENT,
} from "./types";
import { normalizeBusinessLogos } from "./logos";
import { COMPANY_NUMBER_MAX_LENGTH } from "./format";
import { DEFAULT_FONT_PAIR } from "./fonts";

export class InvoiceDatabase extends Dexie {
  business!: EntityTable<Business, "id">;
  clients!: EntityTable<Client, "id">;
  items!: EntityTable<CatalogItem, "id">;
  invoices!: EntityTable<Invoice, "id">;
  payslips!: EntityTable<Payslip, "id">;
  expenses!: EntityTable<Expense, "id">;
  settings!: EntityTable<AppSettings, "id">;
  customTemplates!: EntityTable<CustomTemplate, "id">;
  autoBackups!: EntityTable<AutoBackupRecord, "id">;

  constructor() {
    super("invoice-maker");
    this.version(1).stores({
      business: "id",
      clients: "id, name, updatedAt",
      items: "id, description",
      invoices: "id, status, number, clientId, updatedAt, createdAt",
      settings: "id",
    });
    this.version(2).stores({
      business: "id",
      clients: "id, name, updatedAt",
      items: "id, description",
      invoices: "id, status, number, clientId, updatedAt, createdAt",
      settings: "id",
      customTemplates: "id, name, createdAt",
    });
    this.version(3).stores({
      business: "id",
      clients: "id, name, updatedAt",
      items: "id, description",
      invoices: "id, status, number, clientId, updatedAt, createdAt",
      settings: "id",
      customTemplates: "id, name, createdAt",
      autoBackups: "id, createdAt",
    });
    this.version(4).stores({
      business: "id",
      clients: "id, name, updatedAt",
      items: "id, description",
      invoices: "id, status, number, clientId, updatedAt, createdAt, kind",
      settings: "id",
      customTemplates: "id, name, createdAt",
      autoBackups: "id, createdAt",
    });
    this.version(5).stores({
      business: "id",
      clients: "id, name, updatedAt",
      items: "id, description",
      invoices: "id, status, number, clientId, updatedAt, createdAt, kind",
      payslips: "id, status, number, clientId, updatedAt, createdAt",
      settings: "id",
      customTemplates: "id, name, createdAt",
      autoBackups: "id, createdAt",
    });
    this.version(6).stores({
      business: "id",
      clients: "id, name, updatedAt",
      items: "id, description",
      invoices: "id, status, number, clientId, updatedAt, createdAt, kind",
      payslips: "id, status, number, clientId, updatedAt, createdAt",
      expenses: "id, date, category, updatedAt, createdAt",
      settings: "id",
      customTemplates: "id, name, createdAt",
      autoBackups: "id, createdAt",
    });
  }
}

export const db = new InvoiceDatabase();

export function defaultBusiness(): Business {
  const now = new Date().toISOString();
  return {
    id: "default",
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
    country: "South Africa",
    taxId: "",
    companyNumber: "",
    vatRegistered: false,
    logos: [],
    accentColor: DEFAULT_ACCENT,
    fontPair: DEFAULT_FONT_PAIR,
    currency: "ZAR",
    defaultTaxRate: 15,
    taxMode: "exclusive",
    paymentTerms: "",
    netDays: 14,
    invoicePrefix: "INV-",
    quotePrefix: "QUO-",
    payslipPrefix: "PAY-",
    createdAt: now,
    updatedAt: now,
  };
}

export function defaultSettings(): AppSettings {
  return {
    id: "default",
    nextSequence: 1,
    sequenceYear: new Date().getFullYear(),
    nextQuoteSequence: 1,
    quoteSequenceYear: new Date().getFullYear(),
    nextPayslipSequence: 1,
    payslipSequenceYear: new Date().getFullYear(),
    defaultTemplate: "classic",
    autoBackupEnabled: true,
    autoBackupKeep: 10,
  };
}

export async function ensureDefaults(): Promise<{
  business: Business;
  settings: AppSettings;
}> {
  let business = await db.business.get("default");
  if (!business) {
    business = defaultBusiness();
    await db.business.put(business);
  } else {
    let next = business;
    if (!next.quotePrefix) {
      next = {
        ...next,
        quotePrefix: "QUO-",
        updatedAt: new Date().toISOString(),
      };
    }
    if (!next.payslipPrefix) {
      next = {
        ...next,
        payslipPrefix: "PAY-",
        updatedAt: new Date().toISOString(),
      };
    }
    if (next.paymentTerms === "Payment due within 14 days of issue.") {
      next = {
        ...next,
        paymentTerms: "",
        updatedAt: new Date().toISOString(),
      };
    }
    if (next.vatRegistered === undefined) {
      next = {
        ...next,
        vatRegistered: false,
        updatedAt: new Date().toISOString(),
      };
    }
    if (!next.fontPair) {
      next = {
        ...next,
        fontPair: DEFAULT_FONT_PAIR,
        updatedAt: new Date().toISOString(),
      };
    }
    if (next !== business) {
      business = next;
      await db.business.put(business);
    }
  }
  let settings = await db.settings.get("default");
  if (!settings) {
    settings = defaultSettings();
    await db.settings.put(settings);
  } else {
    let next = settings;
    if (settings.autoBackupEnabled === undefined) {
      next = {
        ...next,
        autoBackupEnabled: true,
        autoBackupKeep: settings.autoBackupKeep ?? 10,
      };
    }
    if (next.nextQuoteSequence === undefined) {
      next = {
        ...next,
        nextQuoteSequence: 1,
        quoteSequenceYear: next.quoteSequenceYear ?? new Date().getFullYear(),
      };
    }
    if (next.nextPayslipSequence === undefined) {
      next = {
        ...next,
        nextPayslipSequence: 1,
        payslipSequenceYear: next.payslipSequenceYear ?? new Date().getFullYear(),
      };
    }
    if (!next.migratedEuFactoryDefaults) {
      // One-time: factory defaults were EUR/21% before the SA pivot. The flag
      // stops it from reverting a deliberate EUR/21% configuration forever.
      next = { ...next, migratedEuFactoryDefaults: true };
      if (business.currency === "EUR" && business.defaultTaxRate === 21) {
        business = {
          ...business,
          currency: "ZAR",
          defaultTaxRate: 15,
          country: business.country || "South Africa",
          updatedAt: new Date().toISOString(),
        };
        await db.business.put(business);
      }
    }
    if (next !== settings) {
      settings = next;
      await db.settings.put(settings);
    }
  }
  if (!settings.migratedDefaultFontPair) {
    if (business.fontPair === "editorial") {
      business = {
        ...business,
        fontPair: DEFAULT_FONT_PAIR,
        updatedAt: new Date().toISOString(),
      };
      await db.business.put(business);
    }
    settings = { ...settings, migratedDefaultFontPair: true };
    await db.settings.put(settings);
  }
  return { business, settings };
}

export async function getBusiness(): Promise<Business> {
  const { business } = await ensureDefaults();
  const normalized = normalizeBusinessLogos(business);
  if (
    normalized.logos?.length !== (business.logos?.length ?? 0) ||
    normalized.defaultLogoId !== business.defaultLogoId ||
    normalized.logoDataUrl !== business.logoDataUrl
  ) {
    // Persist the migration (e.g. legacy logoDataUrl → logos[]) so stored
    // logoId references stay resolvable across sessions.
    try {
      await db.business.put({ ...normalized, updatedAt: business.updatedAt });
    } catch {
      /* read paths still use the normalized value */
    }
  }
  return normalized;
}

export async function saveBusiness(
  patch: Partial<Business>,
): Promise<Business> {
  const current = await getBusiness();
  const next = normalizeBusinessLogos({
    ...current,
    ...patch,
    id: "default",
    updatedAt: new Date().toISOString(),
  });
  if (typeof next.companyNumber === "string") {
    next.companyNumber = next.companyNumber.trim().slice(0, COMPANY_NUMBER_MAX_LENGTH);
  }
  await db.business.put(next);
  return next;
}

export async function getSettings(): Promise<AppSettings> {
  const { settings } = await ensureDefaults();
  return settings;
}

/**
 * Patch settings using only the `settings` object store.
 * Must not call ensureDefaults() — that also reads `business` and throws
 * NotFoundError inside Dexie transactions that omit that store (issueInvoice).
 */
export async function saveSettings(
  patch: Partial<AppSettings>,
): Promise<AppSettings> {
  const stored = await db.settings.get("default");
  const current: AppSettings = stored
    ? { ...defaultSettings(), ...stored }
    : defaultSettings();
  const next: AppSettings = { ...current, ...patch, id: "default" };
  await db.settings.put(next);
  return next;
}

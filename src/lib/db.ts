import Dexie, { type EntityTable } from "dexie";
import {
  type AppSettings,
  type AutoBackupRecord,
  type Business,
  type CatalogItem,
  type Client,
  type CustomTemplate,
  type Invoice,
  type Payslip,
  DEFAULT_ACCENT,
} from "./types";
import { normalizeBusinessLogos } from "./logos";

export class InvoiceDatabase extends Dexie {
  business!: EntityTable<Business, "id">;
  clients!: EntityTable<Client, "id">;
  items!: EntityTable<CatalogItem, "id">;
  invoices!: EntityTable<Invoice, "id">;
  payslips!: EntityTable<Payslip, "id">;
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
    logos: [],
    accentColor: DEFAULT_ACCENT,
    fontPair: "editorial",
    currency: "ZAR",
    defaultTaxRate: 15,
    taxMode: "exclusive",
    paymentTerms: "Payment due within 14 days of issue.",
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
    if (next.currency === "EUR" && next.defaultTaxRate === 21) {
      // Migrate previous EU factory defaults → SA (ZAR + 15% VAT)
      next = {
        ...next,
        currency: "ZAR",
        defaultTaxRate: 15,
        country: next.country || "South Africa",
        updatedAt: new Date().toISOString(),
      };
    }
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
    if (next !== settings) {
      settings = next;
      await db.settings.put(settings);
    }
  }
  return { business, settings };
}

export async function getBusiness(): Promise<Business> {
  const { business } = await ensureDefaults();
  return normalizeBusinessLogos(business);
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
  await db.business.put(next);
  return next;
}

export async function getSettings(): Promise<AppSettings> {
  const { settings } = await ensureDefaults();
  return settings;
}

export async function saveSettings(
  patch: Partial<AppSettings>,
): Promise<AppSettings> {
  const current = await getSettings();
  const next: AppSettings = { ...current, ...patch, id: "default" };
  await db.settings.put(next);
  return next;
}

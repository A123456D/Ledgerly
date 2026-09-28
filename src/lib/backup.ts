import { db, defaultBusiness, defaultSettings } from "./db";
import type {
  AppSettings,
  Business,
  CatalogItem,
  Client,
  CustomTemplate,
  Expense,
  Invoice,
  Payslip,
} from "./types";

export interface BackupPayload {
  version: 1;
  exportedAt: string;
  business: Business | null;
  settings: AppSettings | null;
  clients: Client[];
  items: CatalogItem[];
  invoices: Invoice[];
  customTemplates?: CustomTemplate[];
  payslips?: Payslip[];
  expenses?: Expense[];
}

export async function exportBackup(): Promise<BackupPayload> {
  const [business, settings, clients, items, invoices, customTemplates, payslips, expenses] =
    await Promise.all([
      db.business.get("default"),
      db.settings.get("default"),
      db.clients.toArray(),
      db.items.toArray(),
      db.invoices.toArray(),
      db.customTemplates.toArray(),
      db.payslips.toArray(),
      db.expenses.toArray(),
    ]);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    business: business ?? null,
    settings: settings ?? null,
    clients,
    items,
    invoices,
    customTemplates,
    payslips,
    expenses,
  };
}

export async function importBackup(
  payload: BackupPayload,
  mode: "replace" | "merge" = "replace",
): Promise<void> {
  if (!payload || payload.version !== 1) {
    throw new Error("Unsupported backup format");
  }

  await db.transaction(
    "rw",
    [
      db.business,
      db.settings,
      db.clients,
      db.items,
      db.invoices,
      db.customTemplates,
      db.payslips,
      db.expenses,
    ],
    async () => {
      if (mode === "replace") {
        await Promise.all([
          db.clients.clear(),
          db.items.clear(),
          db.invoices.clear(),
          db.customTemplates.clear(),
          db.payslips.clear(),
          db.expenses.clear(),
        ]);
      }

      await db.business.put(payload.business ?? defaultBusiness());
      await db.settings.put(payload.settings ?? defaultSettings());

      if (payload.clients?.length) await db.clients.bulkPut(payload.clients);
      if (payload.items?.length) await db.items.bulkPut(payload.items);
      if (payload.invoices?.length)
        await db.invoices.bulkPut(payload.invoices);
      if (payload.customTemplates?.length)
        await db.customTemplates.bulkPut(payload.customTemplates);
      if (payload.payslips?.length) await db.payslips.bulkPut(payload.payslips);
      if (payload.expenses?.length) await db.expenses.bulkPut(payload.expenses);
    },
  );
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db, defaultSettings, ensureDefaults, getSettings, saveSettings } from "./db";
import {
  createDraftInvoice,
  issueInvoice,
  recordPartialPayment,
  saveInvoice,
  updateIssuedDocumentNumber,
} from "./invoice-service";
import type { Invoice } from "./types";

async function resetDb() {
  await db.delete();
  await db.open();
}

beforeEach(async () => {
  await resetDb();
});

afterEach(async () => {
  // Join the fire-and-forget auto-backup from issueInvoice so it cannot
  // race db.delete() and surface an unhandled IndexedDB error.
  const { createAutoBackup } = await import("./auto-backup");
  await createAutoBackup("test-drain", { force: true }).catch(() => null);
  await db.delete();
});

async function draftWithLine(patch?: Partial<Invoice>): Promise<Invoice> {
  const draft = await createDraftInvoice();
  const line = draft.lineItems[0];
  return saveInvoice({
    ...draft,
    client: { ...draft.client, name: "Acme" },
    lineItems: [
      {
        ...line,
        description: "Design work",
        quantity: 1,
        unitPrice: 1000,
        taxRate: 0,
      },
    ],
    ...patch,
  });
}

describe("Dexie settings writes inside a narrow transaction", () => {
  it("saveSettings does not require the business object store", async () => {
    await ensureDefaults();
    await db.transaction("rw", db.settings, async () => {
      await saveSettings({ nextSequence: 9 });
    });
    const settings = await db.settings.get("default");
    expect(settings?.nextSequence).toBe(9);
  });

  it("reading business via getSettings inside the old issue transaction throws NotFoundError", async () => {
    await ensureDefaults();
    await expect(
      db.transaction("rw", db.invoices, db.settings, db.clients, async () => {
        await getSettings();
      }),
    ).rejects.toMatchObject({ name: "NotFoundError" });
  });

  it("latest schema still has every store issueInvoice may read before the tx", async () => {
    await db.open();
    const names = db.tables.map((table) => table.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "business",
        "clients",
        "invoices",
        "settings",
        "customTemplates",
        "autoBackups",
        "payslips",
        "items",
      ]),
    );
  });
});

describe("issueInvoice IndexedDB path", () => {
  it("promotes a draft to issued (Sent) after a clean database", async () => {
    const saved = await draftWithLine();
    const issued = await issueInvoice(saved.id);

    expect(issued.status).toBe("issued");
    expect(issued.number).toMatch(/^INV-\d{4}-\d{4}$/);
    expect(issued.snapshot?.number).toBe(issued.number);

    const stored = await db.invoices.get(saved.id);
    expect(stored?.status).toBe("issued");

    const settings = await db.settings.get("default");
    expect(settings?.nextSequence).toBeGreaterThan(
      defaultSettings().nextSequence,
    );
  });

  it("allows partial payment once Issue has succeeded", async () => {
    const saved = await draftWithLine();
    const issued = await issueInvoice(saved.id);
    const partial = await recordPartialPayment(issued.id, 250, "2026-09-01");

    expect(partial.status).toBe("partial");
    expect(partial.amountPaid).toBe(250);
    expect(partial.paidAt).toBe("2026-09-01");
  });

  it("can retarget an issued number without touching other object stores", async () => {
    const saved = await draftWithLine();
    const issued = await issueInvoice(saved.id);
    const renamed = await updateIssuedDocumentNumber(issued.id, "INV-CUSTOM-1");
    expect(renamed.number).toBe("INV-CUSTOM-1");
    expect(renamed.snapshot?.number).toBe("INV-CUSTOM-1");
  });
});

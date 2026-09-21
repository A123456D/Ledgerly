import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "./db";
import type { InvoiceViewModel } from "@/templates/InvoicePreview";
import {
  createShareLink,
  disableShareLink,
  getEnabledShareForInvoice,
  refreshShareLink,
  unpublishShareForInvoice,
  updateShareLink,
} from "./share-link-store";
import { isShareStale, isShareToken } from "./share-link";

function doc(patch?: Partial<InvoiceViewModel>): InvoiceViewModel {
  return {
    kind: "invoice",
    number: "INV-2026-0001",
    business: {
      name: "Studio",
      email: "studio@example.com",
      address: "1 Loop St",
      city: "Cape Town",
      postalCode: "8001",
      country: "South Africa",
      taxId: "4123456789",
    },
    client: {
      name: "Acme",
      email: "a@b.c",
      address: "",
      city: "",
      postalCode: "",
      country: "",
      taxId: "",
    },
    currency: "ZAR",
    taxMode: "exclusive",
    templateId: "classic",
    accentColor: "#0f766e",
    issueDate: "2026-09-01",
    dueDate: "2026-09-15",
    notes: "",
    paymentInstructions: "",
    lineItems: [
      {
        id: "l1",
        description: "Design",
        quantity: 1,
        unitPrice: 1000,
        unit: "",
        taxRate: 15,
        discountPercent: 0,
      },
    ],
    totals: {
      subtotal: 1000,
      discountTotal: 0,
      taxTotal: 150,
      taxByRate: [{ rate: 15, taxable: 1000, tax: 150 }],
      total: 1150,
    },
    status: "issued",
    ...patch,
  };
}

beforeEach(async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })),
  );
  await db.delete();
  await db.open();
});

afterEach(async () => {
  vi.unstubAllGlobals();
  await db.delete();
});

describe("share-link store", () => {
  it("creates a hosted snapshot and reuses the same token", async () => {
    const first = await createShareLink("inv1", doc(), "issued");
    expect(isShareToken(first.record.token)).toBe(true);
    expect(first.url).toContain(`/v/${first.record.token}`);
    const again = await createShareLink("inv1", doc(), "issued");
    expect(again.record.token).toBe(first.record.token);
  });

  it("refreshes with a new token and kills the old row", async () => {
    const first = await createShareLink("inv1", doc(), "issued");
    const next = await refreshShareLink("inv1", doc(), "issued");
    expect(next.record.token).not.toBe(first.record.token);
    const old = await db.shareLinks.get(first.record.token);
    expect(old?.enabled).toBe(false);
    const live = await getEnabledShareForInvoice("inv1");
    expect(live?.token).toBe(next.record.token);
  });

  it("update keeps the URL and refreshes the fingerprint", async () => {
    const first = await createShareLink("inv1", doc(), "issued");
    const edited = doc({ number: "INV-2026-0099" });
    expect(isShareStale(first.record.fingerprint, edited, "issued")).toBe(true);
    const updated = await updateShareLink("inv1", edited, "issued");
    expect(updated.record.token).toBe(first.record.token);
    expect(isShareStale(updated.record.fingerprint, edited, "issued")).toBe(false);
  });

  it("disable unpublishes; draft cannot publish", async () => {
    const created = await createShareLink("inv1", doc(), "issued");
    await disableShareLink(created.record.token);
    expect((await getEnabledShareForInvoice("inv1"))).toBeUndefined();
    await expect(createShareLink("inv2", doc(), "draft")).rejects.toThrow(
      "Issue the invoice before creating a share link.",
    );
  });

  it("voiding unpublishes every token for that invoice", async () => {
    await createShareLink("inv1", doc(), "issued");
    await unpublishShareForInvoice("inv1");
    expect(await getEnabledShareForInvoice("inv1")).toBeUndefined();
  });

  it("does not force Tax Invoice wording when blocking a quote draft", async () => {
    await expect(
      createShareLink("q1", doc({ kind: "quote", number: "QUO-1" }), "draft"),
    ).rejects.toThrow("Send the quote before creating a share link.");
  });
});

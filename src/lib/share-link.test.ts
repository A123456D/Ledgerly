import { describe, expect, it } from "vitest";
import type { InvoiceViewModel } from "@/templates/InvoicePreview";
import {
  COPY,
  canPublishShareLink,
  createShareToken,
  ensureViewOnlineMessage,
  isShareStale,
  isShareToken,
  publicSharePath,
  publicStatusChip,
  publishBlockedReason,
  shareFingerprint,
  SHARE_TOKEN_LENGTH,
  stripViewOnlineMessage,
  truncateMiddle,
  viewOnlineBlock,
  whatsappShareText,
} from "./share-link";

function doc(patch?: Partial<InvoiceViewModel>): InvoiceViewModel {
  return {
    kind: "invoice",
    number: "INV-2026-0001",
    business: {
      name: "Studio",
      email: "studio@example.com",
      phone: "011 000 0000",
      address: "1 Loop St",
      city: "Cape Town",
      postalCode: "8001",
      country: "South Africa",
      taxId: "4123456789",
    },
    client: {
      name: "Acme",
      email: "a@b.c",
      address: "2 Main",
      city: "JHB",
      postalCode: "2000",
      country: "South Africa",
      taxId: "",
    },
    currency: "ZAR",
    taxMode: "exclusive",
    templateId: "classic",
    accentColor: "#0f766e",
    issueDate: "2026-09-01",
    dueDate: "2026-09-15",
    notes: "",
    paymentInstructions: "EFT",
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

describe("share tokens", () => {
  it("creates opaque 128-bit tokens", () => {
    const token = createShareToken();
    expect(token).toHaveLength(SHARE_TOKEN_LENGTH);
    expect(isShareToken(token)).toBe(true);
    expect(createShareToken()).not.toBe(token);
  });

  it("rejects short or guessable ids", () => {
    expect(isShareToken("abc")).toBe(false);
    expect(isShareToken("../secret")).toBe(false);
    expect(isShareToken("inv-1")).toBe(false);
  });
});

describe("publish rules", () => {
  it("blocks drafts and void; allows issued/partial/paid invoices", () => {
    expect(canPublishShareLink("draft", "invoice")).toBe(false);
    expect(canPublishShareLink("void", "invoice")).toBe(false);
    expect(canPublishShareLink("issued", "invoice")).toBe(true);
    expect(canPublishShareLink("partial", "invoice")).toBe(true);
    expect(canPublishShareLink("paid", "invoice")).toBe(true);
    expect(publishBlockedReason("draft", "invoice")).toBe(COPY.draftInvoice);
  });

  it("blocks quote drafts; allows sent/accepted/declined", () => {
    expect(canPublishShareLink("draft", "quote")).toBe(false);
    expect(canPublishShareLink("issued", "quote")).toBe(true);
    expect(canPublishShareLink("accepted", "quote")).toBe(true);
    expect(canPublishShareLink("declined", "quote")).toBe(true);
    expect(publishBlockedReason("draft", "quote")).toBe(COPY.draftQuote);
    expect(publishBlockedReason("draft", "quote")).not.toMatch(/invoice/i);
  });
});

describe("view-online email + WhatsApp", () => {
  it("appends View online when missing", () => {
    const next = ensureViewOnlineMessage("Hi there", "https://app.example/v/tok");
    expect(next).toContain("View online:\nhttps://app.example/v/tok");
  });

  it("replaces a stale View online block and does not duplicate", () => {
    const withOld = ensureViewOnlineMessage(
      "Hi\n\nView online:\nhttps://old/v/aaa",
      "https://app.example/v/bbb",
    );
    expect(withOld).toBe("Hi\nView online:\nhttps://app.example/v/bbb");
    expect(ensureViewOnlineMessage(withOld, "https://app.example/v/bbb")).toBe(withOld);
  });


  it("puts the URL after the message and before the attach-PDF note", () => {
    const text = whatsappShareText({
      subject: "Invoice INV-1 from Studio",
      message: "Please find invoice attached.",
      url: "https://app.example/v/tok",
      pdfName: "INV-1.pdf",
    });
    expect(text).toBe(
      [
        "Invoice INV-1 from Studio",
        "",
        "Please find invoice attached.",
        "",
        "View online: https://app.example/v/tok",
        "",
        "(Attach the PDF “INV-1.pdf” if it isn’t included.)",
      ].join("\n"),
    );
  });

  it("builds the exact email block", () => {
    expect(viewOnlineBlock("https://x/v/t")).toBe("View online:\nhttps://x/v/t");
    expect(
      stripViewOnlineMessage("Hi\n\nView online:\nhttps://x/v/t\n"),
    ).toBe("Hi");
  });
});

describe("snapshot fingerprint", () => {
  it("changes when totals change and stays stable otherwise", () => {
    const a = shareFingerprint(doc(), "issued");
    const b = shareFingerprint(doc(), "issued");
    expect(a).toBe(b);
    const c = shareFingerprint(doc({ totals: { ...doc().totals, total: 2000 } }), "issued");
    expect(c).not.toBe(a);
    expect(isShareStale(a, doc(), "paid")).toBe(true);
  });
});

describe("public URL + chips", () => {
  it("uses /v/{token} without a SKITZ base path", () => {
    expect(publicSharePath("abcdefghijabcdefghijab")).toBe("/v/abcdefghijabcdefghijab");
  });

  it("shows Paid/Accepted chips only", () => {
    expect(publicStatusChip("paid")).toBe("Paid");
    expect(publicStatusChip("accepted")).toBe("Accepted");
    expect(publicStatusChip("issued")).toBeNull();
    expect(publicStatusChip("partial")).toBeNull();
    expect(publicStatusChip("void")).toBeNull();
  });

  it("truncates the middle of long URLs", () => {
    const url = "https://example.com/v/abcdefghijklmnopqrstuvwxyz";
    const clipped = truncateMiddle(url, 20);
    expect(clipped.startsWith("https")).toBe(true);
    expect(clipped).toContain("…");
    expect(clipped.endsWith("xyz")).toBe(true);
    expect(clipped.length).toBe(20);
  });
});

import { describe, expect, it } from "vitest";
import { displayDocument } from "./invoice-service";
import type { Invoice } from "./types";

function issuedStudioInvoice(): Invoice {
  return {
    id: "inv1",
    status: "issued",
    number: "INV-2026-0001",
    clientId: null,
    client: {
      name: "Acme",
      email: "",
      address: "",
      city: "",
      postalCode: "",
      country: "",
      taxId: "",
    },
    issueDate: "2026-09-01",
    dueDate: "2026-09-15",
    currency: "ZAR",
    taxMode: "exclusive",
    templateId: "custom:tmpl1",
    accentColor: "#0f766e",
    notes: "",
    paymentInstructions: "",
    lineItems: [],
    totals: {
      subtotal: 0,
      discountTotal: 0,
      taxTotal: 0,
      taxByRate: [],
      total: 0,
    },
    createdAt: "2026-09-01",
    updatedAt: "2026-09-01",
    snapshot: {
      number: "INV-2026-0001",
      issuedAt: "2026-09-01",
      business: {
        name: "Studio",
        email: "a@b.c",
        address: "",
        city: "",
        postalCode: "",
        country: "",
        taxId: "",
        accentColor: "#0f766e",
        fontPair: "editorial",
        logoDataUrl: "data:image/png;base64,aaa",
      },
      client: {
        name: "Acme",
        email: "",
        address: "",
        city: "",
        postalCode: "",
        country: "",
        taxId: "",
      },
      currency: "ZAR",
      taxMode: "exclusive",
      templateId: "custom:tmpl1",
      designBaseTemplateId: "harbor",
      issueDate: "2026-09-01",
      dueDate: "2026-09-15",
      notes: "",
      paymentInstructions: "",
      lineItems: [],
      totals: {
        subtotal: 0,
        discountTotal: 0,
        taxTotal: 0,
        taxByRate: [],
        total: 0,
      },
      decorations: [
        {
          id: "logo1",
          shapeId: "logo",
          x: 6,
          y: 4,
          w: 14,
          h: 9,
          rotation: 0,
          opacity: 1,
          fill: "#0f766e",
          stroke: "transparent",
          strokeWidth: 0,
          zIndex: 60,
        },
      ],
    },
  };
}

describe("displayDocument", () => {
  it("keeps a studio template layout after issue", () => {
    const doc = displayDocument(issuedStudioInvoice());
    expect(doc.customTemplate?.source).toBe("design");
    expect(doc.customTemplate?.baseTemplateId).toBe("harbor");
    expect(doc.decorations?.[0].imageDataUrl).toBe("data:image/png;base64,aaa");
  });
});

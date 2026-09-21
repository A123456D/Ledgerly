import { describe, expect, it } from "vitest";
import {
  documentKind,
  documentListTitle,
  documentNoun,
  statusDisplay,
} from "./document-kind";

describe("documentKind", () => {
  it("treats missing kind as invoice", () => {
    expect(documentKind(undefined)).toBe("invoice");
    expect(documentNoun(undefined)).toBe("Invoice");
    expect(documentNoun("quote")).toBe("Quote");
  });

  it("shows Sent for issued documents (invoices and quotes)", () => {
    expect(statusDisplay("issued")).toBe("Sent");
  });

  it("shows Partial for partial invoices", () => {
    expect(statusDisplay("partial")).toBe("Partial");
  });

  it("titles untitled drafts clearly so they can be opened from the list", () => {
    expect(documentListTitle({ number: null, partyName: "" })).toBe("Untitled draft");
    expect(documentListTitle({ number: "", partyName: "Acme" })).toBe("Acme");
    expect(documentListTitle({ number: "INV-1", partyName: "Acme" })).toBe("INV-1");
  });
});

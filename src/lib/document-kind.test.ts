import { describe, expect, it } from "vitest";
import {
  documentKind,
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
});

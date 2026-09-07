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

  it("shows sent for issued quotes", () => {
    expect(statusDisplay("issued", "quote")).toBe("Sent");
    expect(statusDisplay("issued", "invoice")).toBe("issued");
  });
});

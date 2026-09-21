import { describe, expect, it } from "vitest";
import {
  DEFAULT_INVOICE_VISIBILITY,
  resolveVisibility,
} from "./invoice-visibility";

describe("companyNumber visibility", () => {
  it("defaults on so a filled Company No. prints unless the user hides it", () => {
    expect(resolveVisibility(undefined).companyNumber).toBe(true);
    expect(DEFAULT_INVOICE_VISIBILITY.companyNumber).toBe(true);
  });

  it("lets an invoice hide Company No. without dropping other From lines", () => {
    const vis = resolveVisibility({ companyNumber: false });
    expect(vis.companyNumber).toBe(false);
    expect(vis.from).toBe(true);
    expect(vis.vat).toBe(true);
  });
});

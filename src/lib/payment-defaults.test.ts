import { describe, expect, it } from "vitest";
import { defaultBusiness } from "./db";

describe("optional payment defaults", () => {
  it("does not seed Payment due copy onto new businesses", () => {
    const biz = defaultBusiness();
    expect(biz.paymentTerms).toBe("");
    expect(biz.vatRegistered).toBe(false);
    expect(biz.fontPair).toBe("modern");
  });
});

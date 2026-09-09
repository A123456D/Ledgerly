import { describe, expect, it } from "vitest";
import { parseNonNegativeDecimal } from "./decimal-input";

describe("parseNonNegativeDecimal", () => {
  it("accepts empty and lone decimal as 0", () => {
    expect(parseNonNegativeDecimal("")).toEqual({ ok: true, value: 0, draft: "" });
    expect(parseNonNegativeDecimal(".")).toEqual({ ok: true, value: 0, draft: "." });
  });

  it("accepts ordinary quantities", () => {
    expect(parseNonNegativeDecimal("8")).toEqual({ ok: true, value: 8, draft: "8" });
    expect(parseNonNegativeDecimal("12.5")).toEqual({
      ok: true,
      value: 12.5,
      draft: "12.5",
    });
    expect(parseNonNegativeDecimal("1,5")).toEqual({
      ok: true,
      value: 1.5,
      draft: "1.5",
    });
  });

  it("rejects letters with an inline error", () => {
    expect(parseNonNegativeDecimal("abc")).toEqual({
      ok: false,
      error: "Enter a number",
      draft: "abc",
    });
  });

  it("rejects negatives with an inline error", () => {
    expect(parseNonNegativeDecimal("-1")).toEqual({
      ok: false,
      error: "Must be 0 or more",
      draft: "-1",
    });
  });
});

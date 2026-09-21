import { describe, expect, it } from "vitest";
import {
  DEFAULT_FONT_PAIR,
  FONT_PAIR_OPTIONS,
  fontPairCssVars,
  resolveFontPair,
} from "./fonts";

describe("default font pair", () => {
  it("is modern geometric sans", () => {
    expect(DEFAULT_FONT_PAIR).toBe("modern");
    expect(FONT_PAIR_OPTIONS[0]?.id).toBe("modern");
  });

  it("maps modern to Outfit variables", () => {
    expect(fontPairCssVars()).toEqual({
      ["--font-display"]: "var(--font-modern)",
      ["--font-body"]: "var(--font-modern)",
    });
  });

  it("fills missing pairs with the product default", () => {
    expect(resolveFontPair(undefined)).toBe("modern");
    expect(resolveFontPair("classic")).toBe("classic");
  });
});

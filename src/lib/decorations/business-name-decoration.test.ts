import { describe, expect, it } from "vitest";
import { createLogoDecoration } from "./logo-decoration";
import {
  createBusinessNameDecoration,
  isBusinessNameDecoration,
  syncBusinessNameDecoration,
} from "./business-name-decoration";

describe("business-name decoration", () => {
  it("places a new name layer to the right of the logo", () => {
    const logo = createLogoDecoration("#0f766e", { x: 6, y: 4, w: 14, h: 9 });
    const next = syncBusinessNameDecoration([logo], {
      visible: true,
      fill: "#111",
    });
    const name = next.find(isBusinessNameDecoration);
    expect(name).toBeTruthy();
    expect(name!.x).toBeGreaterThan(logo.x + logo.w);
    expect(name!.text).toBeUndefined();
  });

  it("does not move an existing name layer", () => {
    const existing = createBusinessNameDecoration({ x: 70, y: 80, w: 20, h: 6 });
    const next = syncBusinessNameDecoration([existing], { visible: true });
    expect(next).toHaveLength(1);
    expect(next[0].x).toBe(70);
    expect(next[0].y).toBe(80);
  });

  it("removes the name layer when hidden", () => {
    const existing = createBusinessNameDecoration();
    const next = syncBusinessNameDecoration([existing], { visible: false });
    expect(next.some(isBusinessNameDecoration)).toBe(false);
  });
});

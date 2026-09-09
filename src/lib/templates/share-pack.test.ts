import { describe, expect, it } from "vitest";
import { createLogoDecoration } from "@/lib/decorations/logo-decoration";
import { createBusinessNameDecoration } from "@/lib/decorations/business-name-decoration";
import {
  buildSharePack,
  parseSharePack,
  SHARE_PACK_KIND,
  sanitizeDecorationForShare,
} from "./share-pack";
import type { CustomTemplate } from "@/lib/types";

function designTemplate(): CustomTemplate {
  return {
    id: "design-1",
    name: "Studio look",
    source: "design",
    accentColor: "#0f766e",
    baseTemplateId: "classic",
    createdAt: "2026-09-01T00:00:00.000Z",
    decorations: [
      {
        ...createLogoDecoration("#0f766e"),
        imageDataUrl: "data:image/png;base64,AAA",
      },
      {
        ...createBusinessNameDecoration(),
        text: "Secret Pty Ltd",
      },
      {
        id: "img1",
        shapeId: "image",
        x: 10,
        y: 10,
        w: 20,
        h: 20,
        rotation: 0,
        opacity: 1,
        fill: "#000",
        stroke: "transparent",
        strokeWidth: 0,
        zIndex: 1,
        imageDataUrl: "data:image/jpeg;base64,BBB",
      },
    ],
  };
}

describe("template share pack", () => {
  it("strips logos, photos, and business-name text", () => {
    const pack = buildSharePack(designTemplate());
    expect(pack.kind).toBe(SHARE_PACK_KIND);
    expect(pack.design.decorations.every((d) => !d.imageDataUrl)).toBe(true);
    expect(
      pack.design.decorations
        .filter((d) => d.shapeId === "business-name")
        .every((d) => !d.text),
    ).toBe(true);
    expect(JSON.stringify(pack)).not.toContain("Secret Pty Ltd");
    expect(JSON.stringify(pack)).not.toContain("data:image");
  });

  it("rejects Canva letterheads that can contain identity art", () => {
    expect(() =>
      buildSharePack({
        id: "c1",
        name: "Canva",
        source: "canva",
        accentColor: "#000",
        createdAt: "2026-09-01T00:00:00.000Z",
        backgroundDataUrl: "data:image/png;base64,CCC",
      }),
    ).toThrow(/Canva/i);
  });

  it("rejects unknown files", () => {
    expect(() => parseSharePack({ kind: "other" })).toThrow(/not an Easy Ledger/i);
    expect(() => parseSharePack("not-json")).toThrow(/valid/i);
  });

  it("round-trips a sanitized pack", () => {
    const pack = buildSharePack(designTemplate());
    const parsed = parseSharePack(JSON.stringify(pack));
    expect(parsed.design.baseTemplateId).toBe("classic");
    expect(parsed.design.decorations).toHaveLength(3);
  });

  it("drops image data even if a file tries to sneak it back in", () => {
    const dirty = sanitizeDecorationForShare({
      ...createLogoDecoration("#123456"),
      imageDataUrl: "data:image/png;base64,sneaky",
    });
    expect(dirty.imageDataUrl).toBeUndefined();
  });
});

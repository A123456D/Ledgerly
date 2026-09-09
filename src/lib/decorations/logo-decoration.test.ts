import { describe, expect, it } from "vitest";
import {
  createLogoDecoration,
  fillLogoImages,
  isLogoDecoration,
} from "./logo-decoration";
import { syncIdentityDecorations } from "./identity-layers";
import { designTemplateToInvoicePatch } from "@/lib/custom-templates";
import { buildTemplateDecorations } from "@/lib/templates/decoration-presets";
import { BUILTIN_TEMPLATES } from "@/lib/templates/catalog";

const LOGO = "data:image/png;base64,aaa";

describe("fillLogoImages", () => {
  it("fills logo shapes that have no image", () => {
    const empty = createLogoDecoration("#0f766e");
    const baked = createLogoDecoration("#0f766e", { imageDataUrl: "keep-me" });
    const next = fillLogoImages([empty, baked], LOGO);
    expect(next[0].imageDataUrl).toBe(LOGO);
    expect(next[1].imageDataUrl).toBe("keep-me");
  });

  it("leaves shapes alone when there is no library logo", () => {
    const empty = createLogoDecoration("#0f766e");
    expect(fillLogoImages([empty], undefined)[0].imageDataUrl).toBeUndefined();
  });
});

describe("syncIdentityDecorations", () => {
  it("bakes the library logo onto the identity logo layer", () => {
    const next = syncIdentityDecorations([], {
      accent: "#0f766e",
      logoVisible: true,
      nameVisible: true,
      imageDataUrl: LOGO,
    });
    const logo = next.find(isLogoDecoration);
    expect(logo?.imageDataUrl).toBe(LOGO);
  });
});

describe("built-in templates", () => {
  it("only start with a logo + business-name layer", () => {
    for (const meta of BUILTIN_TEMPLATES) {
      const decorations = buildTemplateDecorations(meta.id);
      expect(decorations).toHaveLength(2);
      expect(decorations.some(isLogoDecoration)).toBe(true);
      expect(decorations.some((d) => d.shapeId === "business-name")).toBe(true);
    }
  });
});

describe("designTemplateToInvoicePatch", () => {
  it("applies studio decorations and fills missing logos", () => {
    const logo = createLogoDecoration("#123456");
    const patch = designTemplateToInvoicePatch(
      {
        id: "tmpl1",
        name: "Mine",
        source: "design",
        accentColor: "#123456",
        baseTemplateId: "classic",
        createdAt: "2026-01-01",
        decorations: [logo],
      },
      { logoDataUrl: LOGO },
    );
    expect(patch).toBeTruthy();
    expect(patch!.templateId).toBe("custom:tmpl1");
    expect(patch!.decorations).toHaveLength(1);
    expect(patch!.decorations![0].imageDataUrl).toBe(LOGO);
    expect(patch!.decorations![0].id).not.toBe(logo.id);
  });
});

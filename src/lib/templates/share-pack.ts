import { isBuiltinTemplateId } from "./catalog";
import {
  isBusinessNameDecoration,
} from "@/lib/decorations/business-name-decoration";
import {
  isImageDecoration,
  isLogoDecoration,
} from "@/lib/decorations/logo-decoration";
import {
  isDesignCustomTemplate,
  type BuiltinTemplateId,
  type CustomTemplate,
  type FontPair,
  type InvoiceDecoration,
  type SectionAccents,
} from "@/lib/types";
import type { InvoiceVisibility } from "@/lib/invoice-visibility";

export const SHARE_PACK_KIND = "easyledger-template";
export const SHARE_PACK_VERSION = 1;
export const SHARE_PACK_MAX_CHARS = 250_000;
export const SHARE_PACK_MAX_DECORATIONS = 80;

export interface SharedTemplateDesign {
  baseTemplateId: BuiltinTemplateId;
  accentColor: string;
  fontPair?: FontPair;
  sectionAccents?: SectionAccents;
  logoSizePx?: number;
  visibility?: InvoiceVisibility;
  decorations: InvoiceDecoration[];
}

export interface SharedTemplatePack {
  kind: typeof SHARE_PACK_KIND;
  version: typeof SHARE_PACK_VERSION;
  name: string;
  exportedAt: string;
  design: SharedTemplateDesign;
}

const FONT_PAIRS: FontPair[] = ["editorial", "modern", "mono", "classic"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clampNum(n: unknown, fallback: number, min: number, max: number): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function sanitizeColor(value: unknown, fallback = "#0f766e"): string {
  if (typeof value !== "string") return fallback;
  const t = value.trim();
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(t)) return t;
  if (t === "transparent") return t;
  return fallback;
}

/** Layout only — no logos, photos, letterheads, or typed identity text. */
export function sanitizeDecorationForShare(
  decoration: InvoiceDecoration,
): InvoiceDecoration {
  const next: InvoiceDecoration = {
    id: decoration.id,
    shapeId: String(decoration.shapeId || "rect").slice(0, 64),
    x: clampNum(decoration.x, 0, -80, 120),
    y: clampNum(decoration.y, 0, -80, 120),
    w: clampNum(decoration.w, 10, 1, 200),
    h: clampNum(decoration.h, 8, 1, 200),
    rotation: clampNum(decoration.rotation, 0, -360, 360),
    opacity: clampNum(decoration.opacity, 1, 0, 1),
    fill: sanitizeColor(decoration.fill, "#1c1917"),
    stroke: sanitizeColor(decoration.stroke, "transparent"),
    strokeWidth: clampNum(decoration.strokeWidth, 0, 0, 40),
    zIndex: clampNum(decoration.zIndex, 1, 0, 9999),
    locked: Boolean(decoration.locked),
    behind: Boolean(decoration.behind),
    blur:
      typeof decoration.blur === "number" && Number.isFinite(decoration.blur)
        ? Math.min(80, Math.max(0, decoration.blur))
        : undefined,
    fontSize:
      typeof decoration.fontSize === "number" && Number.isFinite(decoration.fontSize)
        ? Math.min(24, Math.max(1, decoration.fontSize))
        : undefined,
    fontWeight: decoration.fontWeight === "bold" ? "bold" : decoration.fontWeight === "normal" ? "normal" : undefined,
    objectFit: decoration.objectFit === "cover" ? "cover" : decoration.objectFit === "contain" ? "contain" : undefined,
  };

  if (isLogoDecoration(next) || isImageDecoration(next) || isBusinessNameDecoration(next)) {
    delete next.imageDataUrl;
    delete next.text;
  } else if (decoration.shapeId === "text-block") {
    next.text = "Text";
  }

  return next;
}

export function sanitizeDecorationsForShare(
  decorations: InvoiceDecoration[] | undefined,
): InvoiceDecoration[] {
  return (decorations ?? [])
    .slice(0, SHARE_PACK_MAX_DECORATIONS)
    .map(sanitizeDecorationForShare);
}

export function buildSharePack(template: CustomTemplate): SharedTemplatePack {
  if (!isDesignCustomTemplate(template)) {
    throw new Error("Only saved designs can be shared — not Canva letterheads");
  }
  return {
    kind: SHARE_PACK_KIND,
    version: SHARE_PACK_VERSION,
    name: (template.name || "Shared design").slice(0, 80),
    exportedAt: new Date().toISOString(),
    design: {
      baseTemplateId: template.baseTemplateId,
      accentColor: sanitizeColor(template.accentColor),
      fontPair: template.fontPair,
      sectionAccents: template.sectionAccents
        ? { ...template.sectionAccents }
        : undefined,
      logoSizePx: template.logoSizePx,
      visibility: template.visibility ? { ...template.visibility } : undefined,
      decorations: sanitizeDecorationsForShare(template.decorations),
    },
  };
}

export function parseSharePack(raw: unknown): SharedTemplatePack {
  if (typeof raw === "string") {
    if (raw.length > SHARE_PACK_MAX_CHARS) {
      throw new Error("Template file is too large");
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("Not a valid Easy Ledger template file");
    }
    return parseSharePack(parsed);
  }

  if (!isRecord(raw)) throw new Error("Not a valid Easy Ledger template file");
  if (raw.kind !== SHARE_PACK_KIND) {
    throw new Error("This file is not an Easy Ledger template");
  }
  if (raw.version !== SHARE_PACK_VERSION) {
    throw new Error("This template was made in a newer app version");
  }
  if (!isRecord(raw.design)) throw new Error("Template is missing its design");

  const baseTemplateId = raw.design.baseTemplateId;
  if (typeof baseTemplateId !== "string" || !isBuiltinTemplateId(baseTemplateId)) {
    throw new Error("Template layout is not recognised");
  }

  const name =
    typeof raw.name === "string" && raw.name.trim()
      ? raw.name.trim().slice(0, 80)
      : "Shared design";

  const decorationsRaw = Array.isArray(raw.design.decorations)
    ? raw.design.decorations
    : [];
  if (decorationsRaw.length > SHARE_PACK_MAX_DECORATIONS) {
    throw new Error("Template has too many layers");
  }

  const fontPair = FONT_PAIRS.includes(raw.design.fontPair as FontPair)
    ? (raw.design.fontPair as FontPair)
    : undefined;

  const decorations = sanitizeDecorationsForShare(
    decorationsRaw as InvoiceDecoration[],
  );

  return {
    kind: SHARE_PACK_KIND,
    version: SHARE_PACK_VERSION,
    name,
    exportedAt:
      typeof raw.exportedAt === "string" ? raw.exportedAt : new Date().toISOString(),
    design: {
      baseTemplateId,
      accentColor: sanitizeColor(raw.design.accentColor),
      fontPair,
      sectionAccents: isRecord(raw.design.sectionAccents)
        ? (raw.design.sectionAccents as SectionAccents)
        : undefined,
      logoSizePx:
        typeof raw.design.logoSizePx === "number" && Number.isFinite(raw.design.logoSizePx)
          ? raw.design.logoSizePx
          : undefined,
      visibility: isRecord(raw.design.visibility)
        ? (raw.design.visibility as InvoiceVisibility)
        : undefined,
      decorations,
    },
  };
}

export function packToCustomTemplate(
  pack: SharedTemplatePack,
  id: string,
): CustomTemplate {
  return {
    id,
    name: pack.name,
    source: "design",
    accentColor: pack.design.accentColor,
    baseTemplateId: pack.design.baseTemplateId,
    fontPair: pack.design.fontPair,
    sectionAccents: pack.design.sectionAccents
      ? { ...pack.design.sectionAccents }
      : undefined,
    decorations: pack.design.decorations.map((d) => ({ ...d })),
    logoSizePx: pack.design.logoSizePx,
    visibility: pack.design.visibility ? { ...pack.design.visibility } : undefined,
    createdAt: new Date().toISOString(),
  };
}

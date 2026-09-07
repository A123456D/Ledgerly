import type { BuiltinTemplateId, InvoiceDecoration } from "@/lib/types";
import { uid } from "@/lib/format";

export const LOGO_SHAPE_ID = "logo";
export const IMAGE_SHAPE_ID = "image";

export function isLogoDecoration(d: InvoiceDecoration) {
  return d.shapeId === LOGO_SHAPE_ID;
}

export function isImageDecoration(d: InvoiceDecoration) {
  return d.shapeId === IMAGE_SHAPE_ID;
}

/** Starting slot only — after that the logo is a free shape. */
export function createLogoDecoration(
  accent: string,
  options?: {
    id?: string;
    imageDataUrl?: string;
    x?: number;
    y?: number;
    w?: number;
    h?: number;
    zIndex?: number;
  },
): InvoiceDecoration {
  return {
    id: options?.id ?? uid("deco"),
    shapeId: LOGO_SHAPE_ID,
    x: options?.x ?? 6,
    y: options?.y ?? 4,
    w: options?.w ?? 14,
    h: options?.h ?? 9,
    rotation: 0,
    opacity: 1,
    fill: accent,
    stroke: "transparent",
    strokeWidth: 0,
    zIndex: options?.zIndex ?? 60,
    behind: false,
    objectFit: "contain",
    imageDataUrl: options?.imageDataUrl,
  };
}

export function findLogoDecoration(
  decorations?: InvoiceDecoration[],
): InvoiceDecoration | undefined {
  return decorations?.find(isLogoDecoration);
}

export function findLogoDecorations(
  decorations?: InvoiceDecoration[],
): InvoiceDecoration[] {
  return (decorations ?? []).filter(isLogoDecoration);
}

/** @deprecated Prefer createLogoDecoration — kept for template id callers. */
export function logoPlacementForTemplate(
  _templateId: BuiltinTemplateId,
): Pick<InvoiceDecoration, "x" | "y" | "w" | "h"> {
  return { x: 6, y: 4, w: 14, h: 9 };
}

/**
 * Ensure at least one logo layer when visibility is on; never reset positions.
 * Supports multiple logos — does not collapse them to one.
 */
export function syncLogoDecoration(
  decorations: InvoiceDecoration[] | undefined,
  options: {
    accent: string;
    logoVisible: boolean;
    imageDataUrl?: string;
  },
): InvoiceDecoration[] {
  const list = decorations ?? [];
  const logos = list.filter(isLogoDecoration);
  const others = list.filter((d) => !isLogoDecoration(d));

  if (!options.logoVisible) {
    return others;
  }

  if (logos.length) {
    // Optionally refresh image on logos that have no baked image yet
    if (options.imageDataUrl) {
      return [
        ...others,
        ...logos.map((l) =>
          l.imageDataUrl ? l : { ...l, imageDataUrl: options.imageDataUrl },
        ),
      ];
    }
    return list;
  }

  return [
    ...others,
    createLogoDecoration(options.accent, {
      imageDataUrl: options.imageDataUrl,
    }),
  ];
}

export function defaultImageDecoration(
  accent: string,
  zIndex: number,
  imageDataUrl: string,
): Omit<InvoiceDecoration, "id"> {
  return {
    shapeId: IMAGE_SHAPE_ID,
    x: 30,
    y: 30,
    w: 28,
    h: 22,
    rotation: 0,
    opacity: 1,
    fill: accent,
    stroke: "transparent",
    strokeWidth: 0,
    zIndex,
    behind: false,
    imageDataUrl,
    objectFit: "contain",
  };
}

export function defaultLogoDecoration(
  accent: string,
  zIndex: number,
  imageDataUrl?: string,
): Omit<InvoiceDecoration, "id"> {
  return {
    shapeId: LOGO_SHAPE_ID,
    x: 20,
    y: 20,
    w: 16,
    h: 10,
    rotation: 0,
    opacity: 1,
    fill: accent,
    stroke: "transparent",
    strokeWidth: 0,
    zIndex,
    behind: false,
    objectFit: "contain",
    imageDataUrl,
  };
}

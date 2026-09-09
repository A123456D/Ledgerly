import type { BuiltinTemplateId, InvoiceDecoration } from "@/lib/types";
import { uid } from "@/lib/format";
import { getBuiltinTemplate } from "@/lib/templates/catalog";
import { findLogoDecoration } from "./logo-decoration";

export const BUSINESS_NAME_SHAPE_ID = "business-name";

export function isBusinessNameDecoration(d: InvoiceDecoration) {
  return d.shapeId === BUSINESS_NAME_SHAPE_ID;
}

export function findBusinessNameDecorations(
  decorations?: InvoiceDecoration[],
): InvoiceDecoration[] {
  return (decorations ?? []).filter(isBusinessNameDecoration);
}

export function defaultBusinessNameFill(templateId?: BuiltinTemplateId): string {
  if (!templateId) return "#1c1917";
  const meta = getBuiltinTemplate(templateId);
  const header = meta?.shell.header;
  if (header === "band" || header === "dark-band" || header === "frame") {
    return "#ffffff";
  }
  return meta?.ink ?? "#1c1917";
}

export function createBusinessNameDecoration(options?: {
  id?: string;
  fill?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  zIndex?: number;
}): InvoiceDecoration {
  return {
    id: options?.id ?? uid("deco"),
    shapeId: BUSINESS_NAME_SHAPE_ID,
    x: options?.x ?? 22,
    y: options?.y ?? 3.6,
    w: options?.w ?? 50,
    h: options?.h ?? 12,
    rotation: 0,
    opacity: 1,
    fill: options?.fill ?? "#1c1917",
    stroke: "transparent",
    strokeWidth: 0,
    zIndex: options?.zIndex ?? 65,
    behind: false,
    fontWeight: "bold",
    fontSize: 5,
  };
}

/**
 * Keep at most one movable business-name layer. Never overwrite its position.
 * Text is not stored — the live business name is rendered at display time.
 */
export function syncBusinessNameDecoration(
  decorations: InvoiceDecoration[] | undefined,
  options: {
    visible: boolean;
    fill?: string;
  },
): InvoiceDecoration[] {
  const list = decorations ?? [];
  const names = list.filter(isBusinessNameDecoration);
  const others = list.filter((d) => !isBusinessNameDecoration(d));

  if (!options.visible) {
    return others;
  }

  if (names.length) {
    return list;
  }

  const logo = findLogoDecoration(list);
  const x = logo ? Math.min(68, logo.x + logo.w + 1.5) : 22;
  const y = logo ? logo.y : 4.2;

  return [
    ...others,
    createBusinessNameDecoration({
      x,
      y,
      fill: options.fill,
    }),
  ];
}

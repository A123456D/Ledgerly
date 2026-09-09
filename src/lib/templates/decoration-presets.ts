import type { BuiltinTemplateId, InvoiceDecoration } from "@/lib/types";
import { uid } from "@/lib/format";
import { getBuiltinTemplate } from "@/lib/templates/catalog";
import { createLogoDecoration } from "@/lib/decorations/logo-decoration";
import {
  createBusinessNameDecoration,
  defaultBusinessNameFill,
} from "@/lib/decorations/business-name-decoration";

/**
 * Built-in templates own their layout in CSS.
 * Presets add a movable logo and business-name layer — no random blobs/frames.
 * Users can still add shapes/images from Design studio.
 */
export interface TemplateDesignPackage {
  accentColor: string;
  decorations: InvoiceDecoration[];
}

/** Fresh decoration ids for an invoice (logo layer only as a free starting shape). */
export function buildTemplateDecorations(
  templateId: BuiltinTemplateId,
  accent?: string,
): InvoiceDecoration[] {
  const meta = getBuiltinTemplate(templateId);
  const color = accent ?? meta?.defaultAccent ?? "#0f766e";
  return [
    createLogoDecoration(color),
    createBusinessNameDecoration({
      fill: defaultBusinessNameFill(templateId),
    }),
  ];
}

export function getTemplateDesignPackage(
  templateId: BuiltinTemplateId,
  accent?: string,
): TemplateDesignPackage {
  const meta = getBuiltinTemplate(templateId);
  const accentColor = accent ?? meta?.defaultAccent ?? "#0f766e";
  return {
    accentColor,
    decorations: buildTemplateDecorations(templateId, accentColor),
  };
}

export function isBuiltinTemplateIdForDesign(
  id: string,
): id is BuiltinTemplateId {
  return Boolean(getBuiltinTemplate(id as BuiltinTemplateId));
}

/** Re-id decorations (e.g. when duplicating an invoice). */
export function remintDecorationIds(
  decorations: InvoiceDecoration[],
): InvoiceDecoration[] {
  return decorations.map((d) => ({ ...d, id: uid("deco") }));
}

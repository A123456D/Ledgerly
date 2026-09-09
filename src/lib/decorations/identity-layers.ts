import type { InvoiceDecoration } from "@/lib/types";
import { syncLogoDecoration } from "./logo-decoration";
import { syncBusinessNameDecoration } from "./business-name-decoration";

export function syncIdentityDecorations(
  decorations: InvoiceDecoration[] | undefined,
  options: {
    accent: string;
    logoVisible: boolean;
    nameVisible: boolean;
    imageDataUrl?: string;
    nameFill?: string;
  },
): InvoiceDecoration[] {
  const withLogos = syncLogoDecoration(decorations, {
    accent: options.accent,
    logoVisible: options.logoVisible,
    imageDataUrl: options.imageDataUrl,
  });
  return syncBusinessNameDecoration(withLogos, {
    visible: options.nameVisible,
    fill: options.nameFill,
  });
}

export function identityDecorationsUnchanged(
  before: InvoiceDecoration[] | undefined,
  after: InvoiceDecoration[],
): boolean {
  const prev = before ?? [];
  if (prev.length !== after.length) return false;
  return prev.every((d, i) => d.id === after[i]?.id && d.shapeId === after[i]?.shapeId);
}

import { db } from "./db";
import { extractAccentColor, fileToDataUrl } from "./image";
import { uid } from "./format";
import { getBuiltinTemplate, isBuiltinTemplateId } from "./templates/catalog";
import {
  isDesignCustomTemplate,
  toCustomTemplateId,
  type BuiltinTemplateId,
  type CustomTemplate,
  type Invoice,
  type TemplateId,
} from "./types";

export async function importCanvaTemplate(
  file: File,
  name?: string,
): Promise<{ template: CustomTemplate; templateId: TemplateId }> {
  const backgroundDataUrl = await fileToDataUrl(file, {
    maxEdge: 2000,
    quality: 0.88,
    maxBytes: 2_400_000,
  });
  const accentColor = await extractAccentColor(backgroundDataUrl);
  const template: CustomTemplate = {
    id: uid("tmpl"),
    name: name?.trim() || file.name.replace(/\.[^.]+$/, "") || "Canva template",
    source: "canva",
    backgroundDataUrl,
    accentColor,
    contentTopMm: 45,
    contentStyle: "transparent",
    createdAt: new Date().toISOString(),
  };
  await db.customTemplates.put(template);
  return { template, templateId: toCustomTemplateId(template.id) };
}

export async function updateCustomTemplate(
  id: string,
  patch: Partial<
    Pick<
      CustomTemplate,
      "name" | "accentColor" | "contentTopMm" | "contentStyle"
    >
  >,
): Promise<CustomTemplate> {
  const existing = await db.customTemplates.get(id);
  if (!existing) throw new Error("Template not found");
  const next = { ...existing, ...patch };
  await db.customTemplates.put(next);
  return next;
}

export async function deleteCustomTemplate(id: string): Promise<void> {
  await db.customTemplates.delete(id);
}

export async function getCustomTemplate(
  templateId: string,
): Promise<CustomTemplate | undefined> {
  const key = templateId.startsWith("custom:")
    ? templateId.slice(7)
    : templateId;
  return db.customTemplates.get(key);
}

/** Stable gallery id so re-saving the same invoice updates one card. */
export function designTemplateIdForInvoice(invoiceId: string): string {
  return `design-${invoiceId}`;
}

async function resolveBaseTemplateId(
  invoice: Invoice,
): Promise<BuiltinTemplateId> {
  if (isBuiltinTemplateId(invoice.templateId)) {
    return invoice.templateId;
  }
  const existing = await getCustomTemplate(invoice.templateId);
  if (isDesignCustomTemplate(existing)) {
    return existing.baseTemplateId;
  }
  return "classic";
}

/**
 * Upsert this invoice’s design (not content) into the template gallery.
 */
export async function saveInvoiceDesignTemplate(
  invoice: Invoice,
): Promise<CustomTemplate> {
  const id = designTemplateIdForInvoice(invoice.id);
  const baseTemplateId = await resolveBaseTemplateId(invoice);
  const meta = getBuiltinTemplate(baseTemplateId);
  const existing = await db.customTemplates.get(id);
  const stamp = new Date().toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const template: CustomTemplate = {
    id,
    name:
      existing?.name ??
      `Saved · ${meta?.name ?? baseTemplateId} · ${stamp}`,
    source: "design",
    accentColor: invoice.accentColor,
    baseTemplateId,
    fontPair: invoice.fontPair,
    sectionAccents: invoice.sectionAccents
      ? { ...invoice.sectionAccents }
      : undefined,
    decorations: invoice.decorations?.map((d) => ({ ...d })),
    logoSizePx: invoice.logoSizePx,
    visibility: invoice.visibility ? { ...invoice.visibility } : undefined,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };

  await db.customTemplates.put(template);
  return template;
}

/** Patch fields to apply a saved design template onto an invoice. */
export function designTemplateToInvoicePatch(
  template: CustomTemplate,
): Partial<Invoice> | null {
  if (!isDesignCustomTemplate(template)) return null;
  return {
    templateId: toCustomTemplateId(template.id),
    accentColor: template.accentColor,
    fontPair: template.fontPair,
    sectionAccents: template.sectionAccents
      ? { ...template.sectionAccents }
      : undefined,
    decorations: template.decorations?.map((d) => ({
      ...d,
      id: uid("deco"),
    })),
    logoSizePx: template.logoSizePx,
    visibility: template.visibility ? { ...template.visibility } : undefined,
  };
}

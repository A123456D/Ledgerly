import { db } from "./db";
import { extractAccentColor, fileToDataUrl } from "./image";
import { uid } from "./format";
import {
  toCustomTemplateId,
  type CustomTemplate,
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

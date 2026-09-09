import { customTemplateKey, toCustomTemplateId } from "@/lib/types";
import { getBuiltinTemplate } from "@/lib/templates/catalog";

/** Human-readable name for a gallery default (id `classic` → "Clean Warm"). */
export function templateDisplayName(
  templateId: string | undefined,
  customs: { id: string; name: string }[] = [],
): string {
  const id = templateId || "classic";
  const builtin = getBuiltinTemplate(id);
  if (builtin) return builtin.name;
  const saved = customs.find(
    (t) => t.id === customTemplateKey(id) || toCustomTemplateId(t.id) === id,
  );
  return saved?.name ?? id;
}

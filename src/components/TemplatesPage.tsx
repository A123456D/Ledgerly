"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { PageHeader } from "@/components/ui";
import { db, saveSettings } from "@/lib/db";
import { deleteCustomTemplate } from "@/lib/custom-templates";
import { BUILTIN_TEMPLATES } from "@/lib/templates/catalog";
import {
  GallerySavedDesignCard,
  GalleryTemplateCard,
} from "@/components/TemplatePreview";
import {
  isDesignCustomTemplate,
  toCustomTemplateId,
} from "@/lib/types";

export function TemplatesPage() {
  const settings = useLiveQuery(() => db.settings.get("default"), []);
  const customs = useLiveQuery(
    () => db.customTemplates.orderBy("createdAt").reverse().toArray(),
    [],
  );
  const savedDesigns = (customs ?? []).filter(isDesignCustomTemplate);

  return (
    <div>
      <PageHeader
        title="Templates"
        subtitle="Built-in looks plus designs you save from an invoice. Press Save on a draft to add it here."
      />

      {savedDesigns.length ? (
        <section className="mb-10">
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2 className="font-[family-name:var(--font-display)] text-xl">
              Your saved designs
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {savedDesigns.map((t) => (
              <GallerySavedDesignCard
                key={t.id}
                template={t}
                defaultLabel={settings?.defaultTemplate}
                onSetDefault={() =>
                  void saveSettings({ defaultTemplate: toCustomTemplateId(t.id) })
                }
                onDelete={() => void deleteCustomTemplate(t.id)}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="font-[family-name:var(--font-display)] text-xl">
            Template gallery
          </h2>
          <p className="text-xs text-[var(--muted)]">
            Default: {settings?.defaultTemplate || "classic"}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {BUILTIN_TEMPLATES.map((t) => (
            <GalleryTemplateCard
              key={t.id}
              meta={t}
              defaultLabel={settings?.defaultTemplate}
              onSetDefault={() => void saveSettings({ defaultTemplate: t.id })}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

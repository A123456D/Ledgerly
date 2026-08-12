"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { PageHeader } from "@/components/ui";
import { db, saveSettings } from "@/lib/db";
import { BUILTIN_TEMPLATES } from "@/lib/templates/catalog";
import { GalleryTemplateCard } from "@/components/TemplatePreview";

export function TemplatesPage() {
  const settings = useLiveQuery(() => db.settings.get("default"), []);

  return (
    <div>
      <PageHeader
        title="Templates"
        subtitle="Choose a built-in invoice look. Upload your logo under Settings or on each invoice."
      />

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

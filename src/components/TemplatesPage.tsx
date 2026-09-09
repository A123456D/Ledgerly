"use client";

import { useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Button, PageHeader } from "@/components/ui";
import { db, saveSettings } from "@/lib/db";
import {
  deleteCustomTemplate,
  importSharedTemplate,
} from "@/lib/custom-templates";
import { BUILTIN_TEMPLATES } from "@/lib/templates/catalog";
import {
  GallerySavedDesignCard,
  GalleryTemplateCard,
} from "@/components/TemplatePreview";
import {
  isDesignCustomTemplate,
  toCustomTemplateId,
} from "@/lib/types";
import { readSharedTemplateFile } from "@/lib/templates/share-template";

export function TemplatesPage() {
  const settings = useLiveQuery(() => db.settings.get("default"), []);
  const customs = useLiveQuery(
    () => db.customTemplates.orderBy("createdAt").reverse().toArray(),
    [],
  );
  const savedDesigns = (customs ?? []).filter(isDesignCustomTemplate);
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onImportFile(file: File) {
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const template = await readSharedTemplateFile(file);
      await importSharedTemplate(template);
      setStatus(
        `Imported “${template.name}” — layout only. Your business details stay yours.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not import template");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Templates"
        subtitle="Save a look from an invoice, then share the file. Shared templates are layout only — no name, logo, client, or line items."
      />

      <div className="mb-8 flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json,.easyledger.json"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void onImportFile(file);
          }}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          Import template
        </Button>
        <p className="text-xs text-[var(--muted)]">
          Accepts an Easy Ledger `.json` share file
        </p>
      </div>

      {(status || error) && (
        <p className={`mb-6 text-sm ${error ? "text-red-700" : "text-teal-800"}`}>
          {error || status}
        </p>
      )}

      {savedDesigns.length ? (
        <section className="mb-10">
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
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
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
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

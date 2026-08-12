"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useRef, useState } from "react";
import { Button, Field, PageHeader, inputClass } from "@/components/ui";
import { db, saveSettings } from "@/lib/db";
import {
  deleteCustomTemplate,
  importCanvaTemplate,
  updateCustomTemplate,
} from "@/lib/custom-templates";
import { BUILTIN_TEMPLATES } from "@/lib/templates/catalog";
import { GalleryTemplateCard } from "@/components/TemplatePreview";

export function TemplatesPage() {
  const customs = useLiveQuery(() => db.customTemplates.toArray(), []);
  const settings = useLiveQuery(() => db.settings.get("default"), []);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  async function onImport(file: File | null) {
    if (!file) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { template, templateId } = await importCanvaTemplate(file);
      await saveSettings({ defaultTemplate: templateId });
      setMessage(
        `Imported “${template.name}”. Adjust header height if the banner is clipped.`,
      );
      setEditingId(template.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const editing = customs?.find((c) => c.id === editingId);

  return (
    <div>
      <PageHeader
        title="Templates"
        subtitle="Pick a look, or upload a Canva export and we’ll copy it as your letterhead."
      />

      <section className="mb-10 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
        <h2 className="font-[family-name:var(--font-display)] text-xl">
          Import from Canva
        </h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-[var(--muted)]">
          <li>In Canva, design your invoice letterhead (A4).</li>
          <li>Download as PNG or JPG (PDF pages work after exporting as image).</li>
          <li>Upload here — we sample your colors and lay invoice fields on top.</li>
        </ol>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button type="button" disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? "Importing…" : "Upload Canva template"}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => void onImport(e.target.files?.[0] ?? null)}
          />
          <p className="text-xs text-[var(--muted)]">
            Tip: leave the middle of the page mostly empty for line items.
          </p>
        </div>
        {message ? <p className="mt-3 text-sm text-teal-800">{message}</p> : null}
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      </section>

      {editing ? (
        <section className="mb-10 grid gap-6 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 lg:grid-cols-2">
          <div className="space-y-3">
            <h2 className="font-[family-name:var(--font-display)] text-xl">
              Tune “{editing.name}”
            </h2>
            <Field label="Name">
              <input
                className={inputClass}
                value={editing.name}
                onChange={(e) =>
                  void updateCustomTemplate(editing.id, { name: e.target.value })
                }
              />
            </Field>
            <Field
              label="Content top offset (mm)"
              hint="Height of the Canva header banner shown at the top."
            >
              <input
                className={inputClass}
                type="range"
                min={20}
                max={120}
                value={editing.contentTopMm}
                onChange={(e) =>
                  void updateCustomTemplate(editing.id, {
                    contentTopMm: Number(e.target.value),
                  })
                }
              />
              <span className="text-xs text-[var(--muted)]">{editing.contentTopMm}mm</span>
            </Field>
            <Field label="Content panel">
              <select
                className={inputClass}
                value={editing.contentStyle}
                onChange={(e) =>
                  void updateCustomTemplate(editing.id, {
                    contentStyle: e.target.value as "card" | "transparent" | "band",
                  })
                }
              >
                <option value="card">Frosted card</option>
                <option value="band">Full-width band</option>
                <option value="transparent">Transparent (design shows through)</option>
              </select>
            </Field>
            <Field label="Accent (sampled from design)">
              <input
                className={inputClass}
                type="color"
                value={editing.accentColor}
                onChange={(e) =>
                  void updateCustomTemplate(editing.id, {
                    accentColor: e.target.value,
                  })
                }
              />
            </Field>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  void saveSettings({ defaultTemplate: `custom:${editing.id}` })
                }
              >
                Set as default
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={async () => {
                  if (!confirm("Delete this template?")) return;
                  await deleteCustomTemplate(editing.id);
                  setEditingId(null);
                }}
              >
                Delete
              </Button>
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--wash)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={editing.backgroundDataUrl}
              alt={editing.name}
              className="max-h-[420px] w-full object-contain object-top"
            />
          </div>
        </section>
      ) : null}

      {customs && customs.length > 0 ? (
        <section className="mb-10">
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl">
            Your uploads
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {customs.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setEditingId(c.id)}
                className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)] text-left hover:border-[var(--accent)]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.backgroundDataUrl}
                  alt=""
                  className="h-36 w-full object-cover object-top"
                />
                <div className="px-3 py-2">
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-[var(--muted)]">Canva copy · tap to tune</p>
                </div>
              </button>
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

"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useRef, useState } from "react";
import { db } from "@/lib/db";
import { importCanvaTemplate } from "@/lib/custom-templates";
import { BUILTIN_TEMPLATES } from "@/lib/templates/catalog";
import { isCustomTemplateId, type TemplateId } from "@/lib/types";
import { LiveTemplateThumb } from "@/components/TemplatePreview";

export function TemplatePicker({
  value,
  onChange,
  onAccentSuggest,
}: {
  value: TemplateId;
  onChange: (id: TemplateId) => void;
  onAccentSuggest?: (accent: string) => void;
}) {
  const customs = useLiveQuery(() => db.customTemplates.toArray(), []);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onUpload(file: File | null) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const { template, templateId } = await importCanvaTemplate(file);
      onChange(templateId);
      onAccentSuggest?.(template.accentColor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="rounded-md border border-dashed border-[var(--accent)] bg-teal-50/60 px-3 py-2 text-xs font-medium text-teal-900 transition hover:bg-teal-50 disabled:opacity-50"
        >
          {busy ? "Uploading…" : "Upload Canva template"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => void onUpload(e.target.files?.[0] ?? null)}
        />
        <p className="text-[11px] text-[var(--muted)]">
          PNG/JPG letterhead — applied to this invoice
        </p>
      </div>
      {error ? <p className="text-xs text-red-700">{error}</p> : null}

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
          Template gallery
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {BUILTIN_TEMPLATES.map((t) => {
            const active = value === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  onChange(t.id);
                  onAccentSuggest?.(t.defaultAccent);
                }}
                className={`overflow-hidden rounded-lg border text-left transition ${
                  active
                    ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/30"
                    : "border-[var(--line)] hover:border-[var(--muted)]"
                }`}
              >
                <LiveTemplateThumb meta={t} size="sm" />
                <div className="bg-[var(--panel)] px-2 py-1.5">
                  <p className="text-xs font-medium text-[var(--ink)]">{t.name}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
          Your Canva / uploads
        </p>
        {!customs?.length ? (
          <p className="rounded-lg border border-dashed border-[var(--line)] px-3 py-4 text-xs text-[var(--muted)]">
            No uploads yet — use Upload Canva template above.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {customs.map((c) => {
              const id = `custom:${c.id}` as TemplateId;
              const active =
                value === id || (isCustomTemplateId(value) && value === id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onChange(id);
                    onAccentSuggest?.(c.accentColor);
                  }}
                  className={`overflow-hidden rounded-lg border text-left ${
                    active
                      ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/30"
                      : "border-[var(--line)]"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.backgroundDataUrl}
                    alt=""
                    className="h-16 w-full object-cover object-top"
                  />
                  <div className="bg-[var(--panel)] px-2 py-1.5">
                    <p className="truncate text-xs font-medium">{c.name}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

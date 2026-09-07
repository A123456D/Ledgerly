"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { BUILTIN_TEMPLATES } from "@/lib/templates/catalog";
import {
  isDesignCustomTemplate,
  toCustomTemplateId,
  type TemplateId,
} from "@/lib/types";
import {
  LiveTemplateThumb,
  SavedDesignThumb,
} from "@/components/TemplatePreview";

export function TemplatePicker({
  value,
  onChange,
  onAccentSuggest,
}: {
  value: TemplateId;
  onChange: (id: TemplateId) => void;
  onAccentSuggest?: (accent: string) => void;
}) {
  const customs = useLiveQuery(
    () => db.customTemplates.orderBy("createdAt").reverse().toArray(),
    [],
  );
  const savedDesigns = (customs ?? []).filter(isDesignCustomTemplate);

  return (
    <div className="space-y-4">
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

      {savedDesigns.length ? (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
            Your saved designs
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {savedDesigns.map((t) => {
              const tid = toCustomTemplateId(t.id);
              const active = value === tid;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    onChange(tid);
                    onAccentSuggest?.(t.accentColor);
                  }}
                  className={`overflow-hidden rounded-lg border text-left transition ${
                    active
                      ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/30"
                      : "border-[var(--line)] hover:border-[var(--muted)]"
                  }`}
                >
                  <SavedDesignThumb template={t} size="sm" />
                  <div className="bg-[var(--panel)] px-2 py-1.5">
                    <p className="truncate text-xs font-medium text-[var(--ink)]">
                      {t.name}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

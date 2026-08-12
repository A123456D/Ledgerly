"use client";

import { BUILTIN_TEMPLATES } from "@/lib/templates/catalog";
import type { TemplateId } from "@/lib/types";
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
  return (
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
  );
}

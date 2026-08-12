"use client";

import { Field, inputClass } from "@/components/ui";
import {
  ACCENT_PRESETS,
  FONT_PAIR_OPTIONS,
  fontPairCssVars,
} from "@/lib/fonts";
import type { FontPair } from "@/lib/types";

export function BrandLookControls({
  accentColor,
  fontPair,
  onAccentChange,
  onFontChange,
}: {
  accentColor: string;
  fontPair: FontPair;
  onAccentChange: (color: string) => void;
  onFontChange: (pair: FontPair) => void;
}) {
  const normalized = accentColor?.toLowerCase() || "#0f766e";

  return (
    <div className="space-y-4 rounded-xl border border-[var(--line)] bg-[var(--wash)]/40 p-3 sm:p-4">
      <div>
        <p className="text-sm font-medium text-[var(--ink)]">Template colour</p>
        <p className="mt-0.5 text-xs text-[var(--muted)]">
          Changes headers, accents, and due cards on the live preview.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {ACCENT_PRESETS.map((c) => {
            const active = normalized === c.toLowerCase();
            return (
              <button
                key={c}
                type="button"
                title={c}
                aria-label={`Colour ${c}`}
                onClick={() => onAccentChange(c)}
                className={`h-9 w-9 rounded-full border-2 transition ${
                  active
                    ? "border-[var(--ink)] ring-2 ring-[var(--ink)]/20"
                    : "border-white/80 hover:scale-105"
                }`}
                style={{ background: c }}
              />
            );
          })}
          <label className="relative flex h-9 w-9 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-[var(--line)] bg-[var(--panel)]">
            <span className="pointer-events-none text-lg leading-none text-[var(--muted)]">
              +
            </span>
            <input
              type="color"
              value={normalized}
              onChange={(e) => onAccentChange(e.target.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label="Custom colour"
            />
          </label>
        </div>
        <p className="mt-2 font-[family-name:var(--font-mono)] text-[11px] text-[var(--muted)]">
          {normalized}
        </p>
      </div>

      <Field label="Font">
        <div className="grid gap-2 sm:grid-cols-2">
          {FONT_PAIR_OPTIONS.map((opt) => {
            const active = fontPair === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onFontChange(opt.id)}
                className={`rounded-lg border px-3 py-2.5 text-left transition ${
                  active
                    ? "border-[var(--accent)] bg-teal-50/60 ring-2 ring-[var(--accent)]/20"
                    : "border-[var(--line)] bg-[var(--panel)] hover:border-[var(--muted)]"
                }`}
                style={fontPairCssVars(opt.id)}
              >
                <p className="font-[family-name:var(--font-display)] text-lg leading-tight">
                  Invoice Aa
                </p>
                <p className="mt-0.5 font-[family-name:var(--font-body)] text-xs text-[var(--muted)]">
                  {opt.label} · {opt.blurb}
                </p>
              </button>
            );
          })}
        </div>
        <select
          className={inputClass + " mt-2 hidden"}
          value={fontPair}
          onChange={(e) => onFontChange(e.target.value as FontPair)}
          aria-hidden
          tabIndex={-1}
        >
          {FONT_PAIR_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
}

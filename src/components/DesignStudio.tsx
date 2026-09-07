"use client";

import { useMemo, useState } from "react";
import { Field, inputClass } from "@/components/ui";
import { ACCENT_PRESETS } from "@/lib/fonts";
import {
  defaultImageDecoration,
  defaultLogoDecoration,
  IMAGE_SHAPE_ID,
  isImageDecoration,
  isLogoDecoration,
  LOGO_SHAPE_ID,
} from "@/lib/decorations/logo-decoration";
import { fileToDataUrl } from "@/lib/image";
import {
  SHAPE_CATALOG,
  SHAPE_CATEGORIES,
  defaultDecoration,
  type ShapeCategory,
} from "@/lib/shapes/catalog";
import { ShapeThumb } from "@/lib/shapes/render";
import type { InvoiceDecoration } from "@/lib/types";
import { uid } from "@/lib/format";

export function DesignStudio({
  decorations,
  accentColor,
  selectedId,
  designMode,
  onToggleMode,
  onSelect,
  onAdd,
  onUpdate,
  onRemove,
  onDuplicate,
  onReorder,
  onClearAll,
  logoSrc,
}: {
  decorations: InvoiceDecoration[];
  accentColor: string;
  selectedId: string | null;
  designMode: boolean;
  onToggleMode: (on: boolean) => void;
  onSelect: (id: string | null) => void;
  onAdd: (decoration: InvoiceDecoration) => void;
  onUpdate: (id: string, patch: Partial<InvoiceDecoration>) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onReorder: (id: string, dir: "up" | "down" | "top" | "bottom") => void;
  onClearAll: () => void;
  /** Current library logo image for “Add logo” */
  logoSrc?: string;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ShapeCategory | "all" | "uploads">(
    "all",
  );
  const [uploadBusy, setUploadBusy] = useState(false);

  const shapeCatalog = useMemo(
    () => SHAPE_CATALOG.filter((s) => s.id !== LOGO_SHAPE_ID && s.id !== IMAGE_SHAPE_ID),
    [],
  );

  const uploadedImages = useMemo(
    () => decorations.filter(isImageDecoration),
    [decorations],
  );

  const logoLayers = useMemo(
    () => decorations.filter(isLogoDecoration),
    [decorations],
  );

  const selected = decorations.find((d) => d.id === selectedId);
  const isMedia = selected && (isLogoDecoration(selected) || isImageDecoration(selected));

  const filtered = useMemo(() => {
    if (category === "uploads") return [];
    const q = query.trim().toLowerCase();
    return shapeCatalog.filter((s) => {
      if (category !== "all" && s.category !== category) return false;
      if (q && !s.name.toLowerCase().includes(q) && !s.id.includes(q))
        return false;
      return true;
    });
  }, [query, category, shapeCatalog]);

  function layerLabel(d: InvoiceDecoration) {
    if (isLogoDecoration(d)) return "Logo";
    if (isImageDecoration(d)) return "Image";
    return d.shapeId;
  }

  async function uploadImage(file: File) {
    setUploadBusy(true);
    try {
      const dataUrl = await fileToDataUrl(file, { preferPng: true });
      const maxZ = decorations.reduce((m, d) => Math.max(m, d.zIndex), 0);
      const id = uid("deco");
      onAdd({
        id,
        ...defaultImageDecoration(accentColor, maxZ + 1, dataUrl),
        behind: false,
      });
      onSelect(id);
      onToggleMode(true);
      setCategory("uploads");
    } finally {
      setUploadBusy(false);
    }
  }

  function addShape(shapeId: string) {
    const maxZ = decorations.reduce((m, d) => Math.max(m, d.zIndex), 0);
    onAdd({
      id: uid("deco"),
      ...defaultDecoration(shapeId, accentColor, maxZ + 1),
    });
    onToggleMode(true);
  }

  return (
    <div className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--wash)]/40 p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-[var(--ink)]">Design studio</p>
        <p className="mt-0.5 text-xs text-[var(--muted)]">
          Upload images or add shapes — drag them on the preview. Templates stay clean; you decorate.
        </p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs" title="Marks when you're working on shapes — sections stay clickable">
          <input
            type="checkbox"
            className="h-4 w-4 rounded accent-[var(--accent)]"
            checked={designMode}
            onChange={(e) => onToggleMode(e.target.checked)}
          />
          Design mode
        </label>
      </div>

      {/* Logos section */}
      <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-[var(--ink)]">Logos</p>
            <p className="text-[11px] text-[var(--muted)]">
              Click a logo here or on the preview to move and resize it
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              const maxZ = decorations.reduce((m, d) => Math.max(m, d.zIndex), 0);
              const id = uid("deco");
              onAdd({
                id,
                ...defaultLogoDecoration(accentColor, maxZ + 1, logoSrc),
                behind: false,
              });
              onSelect(id);
              onToggleMode(true);
            }}
            className="rounded-lg border border-[var(--line)] bg-[var(--wash)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--ink)] hover:bg-[var(--wash)]/80"
          >
            + Add logo
          </button>
        </div>
        {logoLayers.length ? (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
            {logoLayers.map((logo, i) => (
              <div
                key={logo.id}
                className={`relative aspect-square overflow-hidden rounded-lg border-2 bg-[var(--wash)] ${
                  selectedId === logo.id
                    ? "border-teal-700 ring-2 ring-teal-700/20"
                    : "border-transparent"
                }`}
              >
                <button
                  type="button"
                  title={`Logo ${i + 1}`}
                  onClick={() => {
                    onSelect(logo.id);
                    onToggleMode(true);
                  }}
                  className="absolute inset-0 hover:bg-black/5"
                >
                  {logo.imageDataUrl || logoSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logo.imageDataUrl || logoSrc}
                      alt=""
                      className="h-full w-full object-contain p-1"
                    />
                  ) : (
                    <span
                      className="flex h-full items-center justify-center text-lg font-bold text-white"
                      style={{ background: logo.fill || accentColor }}
                    >
                      L
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  title="Delete logo"
                  aria-label={`Delete logo ${i + 1}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(logo.id);
                  }}
                  className="absolute right-0.5 top-0.5 z-10 flex h-5 w-5 items-center justify-center rounded bg-red-700 text-[11px] font-bold leading-none text-white shadow hover:bg-red-800"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-3 text-center text-[11px] text-[var(--muted)]">
            No logo layers — add one to place it on the invoice
          </p>
        )}
      </div>

      {/* Uploads section */}
      <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-[var(--ink)]">Uploads</p>
            <p className="text-[11px] text-[var(--muted)]">
              Your images — click to select, then drag on the preview
            </p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--wash)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--ink)] hover:bg-[var(--wash)]/80">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              disabled={uploadBusy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void uploadImage(file);
              }}
            />
            {uploadBusy ? "Uploading…" : "+ Upload image"}
          </label>
        </div>
        {uploadedImages.length ? (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
            {uploadedImages.map((img, i) => (
              <button
                key={img.id}
                type="button"
                title={`Image ${i + 1}`}
                onClick={() => {
                  onSelect(img.id);
                  onToggleMode(true);
                }}
                className={`relative aspect-square overflow-hidden rounded-lg border-2 bg-[var(--wash)] ${
                  selectedId === img.id
                    ? "border-teal-700 ring-2 ring-teal-700/20"
                    : "border-transparent hover:border-[var(--line)]"
                }`}
              >
                {img.imageDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img.imageDataUrl}
                    alt=""
                    className="h-full w-full object-contain p-1"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center text-[10px] text-[var(--muted)]">
                    Image
                  </span>
                )}
              </button>
            ))}
          </div>
        ) : (
          <p className="py-3 text-center text-[11px] text-[var(--muted)]">
            No uploads yet — add a PNG, JPG, or WebP
          </p>
        )}
      </div>

      <input
        className={inputClass}
        placeholder="Search shapes…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setCategory("uploads")}
          className={`rounded-full px-2.5 py-1 text-[11px] transition ${
            category === "uploads"
              ? "bg-teal-800 text-white"
              : "bg-[var(--panel)] text-[var(--muted)] hover:bg-[var(--wash)]"
          }`}
        >
          Uploads{uploadedImages.length ? ` (${uploadedImages.length})` : ""}
        </button>
        {SHAPE_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategory(c.id)}
            className={`rounded-full px-2.5 py-1 text-[11px] transition ${
              category === c.id
                ? "bg-teal-800 text-white"
                : "bg-[var(--panel)] text-[var(--muted)] hover:bg-[var(--wash)]"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="max-h-52 overflow-y-auto rounded-lg border border-[var(--line)] bg-[var(--panel)] p-2">
        {category === "uploads" ? (
          uploadedImages.length ? (
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
              {uploadedImages.map((img, i) => (
                <button
                  key={img.id}
                  type="button"
                  title={`Image ${i + 1}`}
                  onClick={() => {
                    onSelect(img.id);
                    onToggleMode(true);
                  }}
                  className={`flex flex-col items-center gap-1 rounded-lg border p-1.5 transition ${
                    selectedId === img.id
                      ? "border-teal-700 bg-teal-50"
                      : "border-transparent hover:border-[var(--line)] hover:bg-[var(--wash)]"
                  }`}
                >
                  <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded bg-[var(--wash)]">
                    {img.imageDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img.imageDataUrl}
                        alt=""
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : null}
                  </div>
                  <span className="line-clamp-2 text-center text-[9px] leading-tight text-[var(--muted)]">
                    Image {i + 1}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-xs text-[var(--muted)]">
              Upload an image to see it here.
            </p>
          )
        ) : (
          <>
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
              {filtered.map((shape) => (
                <button
                  key={shape.id}
                  type="button"
                  title={shape.name}
                  onClick={() => addShape(shape.id)}
                  className="flex flex-col items-center gap-1 rounded-lg border border-transparent p-1.5 transition hover:border-[var(--line)] hover:bg-[var(--wash)]"
                >
                  <ShapeThumb shapeId={shape.id} accent={accentColor} size={32} />
                  <span className="line-clamp-2 text-center text-[9px] leading-tight text-[var(--muted)]">
                    {shape.name}
                  </span>
                </button>
              ))}
            </div>
            {!filtered.length ? (
              <p className="py-6 text-center text-xs text-[var(--muted)]">
                No shapes match your search.
              </p>
            ) : null}
          </>
        )}
      </div>

      {decorations.length ? (
        <div className="flex flex-wrap gap-2">
          <p className="w-full text-xs font-medium text-[var(--ink)]">
            Layers ({decorations.length})
          </p>
          {[...decorations]
            .sort((a, b) => b.zIndex - a.zIndex)
            .map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  onSelect(d.id);
                  onToggleMode(true);
                }}
                className={`rounded-lg border px-2 py-1 text-[11px] ${
                  selectedId === d.id
                    ? "border-teal-700 bg-teal-50 text-teal-900"
                    : "border-[var(--line)] bg-[var(--panel)] text-[var(--muted)]"
                }`}
              >
                {layerLabel(d)}
                {d.locked ? " 🔒" : ""}
              </button>
            ))}
          <button
            type="button"
            className="text-[11px] text-red-700 underline"
            onClick={() => {
              if (confirm("Reset shapes to just the logo for this template?")) onClearAll();
            }}
          >
            Reset shapes
          </button>
        </div>
      ) : null}

      {selected ? (
        <div className="space-y-3 rounded-lg border border-teal-700/20 bg-teal-50/40 p-3">
          <p className="text-xs font-semibold text-[var(--ink)]">
            Selected: {layerLabel(selected)}
          </p>

          {isLogoDecoration(selected) ? (
            <p className="text-[11px] text-[var(--muted)]">
              Drag on the preview to move. Use width/height or corner handles to resize.
              Pick a logo in the library above to change this layer’s image — or Duplicate for another.
            </p>
          ) : null}

          {isImageDecoration(selected) ? (
            <>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1.5 text-[11px] font-medium">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  disabled={uploadBusy}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    setUploadBusy(true);
                    void fileToDataUrl(file, { preferPng: true })
                      .then((dataUrl) =>
                        onUpdate(selected.id, { imageDataUrl: dataUrl }),
                      )
                      .finally(() => setUploadBusy(false));
                  }}
                />
                Replace image
              </label>
              {selected.imageDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selected.imageDataUrl}
                  alt=""
                  className="max-h-20 rounded border border-[var(--line)] object-contain"
                />
              ) : null}
            </>
          ) : null}

          {isMedia ? (
            <Field label="Image fit">
              <select
                className={inputClass}
                value={selected.objectFit ?? "contain"}
                onChange={(e) =>
                  onUpdate(selected.id, {
                    objectFit: e.target.value as "contain" | "cover",
                  })
                }
              >
                <option value="contain">Contain (full image visible)</option>
                <option value="cover">Cover (fill frame)</option>
              </select>
            </Field>
          ) : null}

          {selected.shapeId === "text-block" ? (
            <>
              <Field label="Text">
                <input
                  className={inputClass}
                  value={selected.text ?? ""}
                  onChange={(e) =>
                    onUpdate(selected.id, { text: e.target.value })
                  }
                />
              </Field>
              <Field label={`Font size (${selected.fontSize ?? 4}%)`}>
                <input
                  type="range"
                  min={2}
                  max={12}
                  step={0.5}
                  value={selected.fontSize ?? 4}
                  onChange={(e) =>
                    onUpdate(selected.id, {
                      fontSize: Number(e.target.value),
                    })
                  }
                  className="w-full accent-[var(--accent)]"
                />
              </Field>
            </>
          ) : null}

          <Field label={`Width (${Math.round(selected.w)}%)`}>
            <input
              type="range"
              min={1}
              max={200}
              step={1}
              value={Math.min(200, Math.max(1, selected.w))}
              onChange={(e) =>
                onUpdate(selected.id, { w: Number(e.target.value) })
              }
              className="w-full accent-[var(--accent)]"
            />
          </Field>

          <Field label={`Height (${Math.round(selected.h)}%)`}>
            <input
              type="range"
              min={1}
              max={200}
              step={1}
              value={Math.min(200, Math.max(1, selected.h))}
              onChange={(e) =>
                onUpdate(selected.id, { h: Number(e.target.value) })
              }
              className="w-full accent-[var(--accent)]"
            />
          </Field>

          <Field label={`Opacity (${Math.round(selected.opacity * 100)}%)`}>
            <input
              type="range"
              min={0.05}
              max={1}
              step={0.05}
              value={selected.opacity}
              onChange={(e) =>
                onUpdate(selected.id, { opacity: Number(e.target.value) })
              }
              className="w-full accent-[var(--accent)]"
            />
          </Field>

          <Field label={`Rotation (${selected.rotation}°)`}>
            <input
              type="range"
              min={-180}
              max={180}
              step={1}
              value={selected.rotation}
              onChange={(e) =>
                onUpdate(selected.id, { rotation: Number(e.target.value) })
              }
              className="w-full accent-[var(--accent)]"
            />
          </Field>

          {!isMedia ? (
          <>
          <div>
            <p className="mb-1.5 text-xs font-medium">Fill colour</p>
            <div className="flex flex-wrap gap-1.5">
              {ACCENT_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={c}
                  onClick={() => onUpdate(selected.id, { fill: c })}
                  className="h-6 w-6 rounded-full border border-white/80"
                  style={{ background: c }}
                />
              ))}
              <input
                type="color"
                value={selected.fill.startsWith("#") ? selected.fill : accentColor}
                onChange={(e) => onUpdate(selected.id, { fill: e.target.value })}
                className="h-6 w-8 cursor-pointer rounded border border-[var(--line)]"
                aria-label="Custom fill"
              />
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium">Stroke colour</p>
            <div className="flex flex-wrap gap-1.5">
              {ACCENT_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={c}
                  onClick={() => onUpdate(selected.id, { stroke: c })}
                  className="h-6 w-6 rounded-full border border-white/80"
                  style={{ background: c }}
                />
              ))}
              <input
                type="color"
                value={
                  selected.stroke.startsWith("#") ? selected.stroke : accentColor
                }
                onChange={(e) =>
                  onUpdate(selected.id, { stroke: e.target.value })
                }
                className="h-6 w-8 cursor-pointer rounded border border-[var(--line)]"
                aria-label="Custom stroke"
              />
            </div>
          </div>

          <Field label="Stroke width">
            <input
              type="range"
              min={0}
              max={8}
              step={0.5}
              value={selected.strokeWidth}
              onChange={(e) =>
                onUpdate(selected.id, { strokeWidth: Number(e.target.value) })
              }
              className="w-full accent-[var(--accent)]"
            />
          </Field>
          </>
          ) : null}

          {isLogoDecoration(selected) ? (
          <div>
            <p className="mb-1.5 text-xs font-medium">Monogram colour</p>
            <div className="flex flex-wrap gap-1.5">
              {ACCENT_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={c}
                  onClick={() => onUpdate(selected.id, { fill: c })}
                  className="h-6 w-6 rounded-full border border-white/80"
                  style={{ background: c }}
                />
              ))}
              <input
                type="color"
                value={selected.fill.startsWith("#") ? selected.fill : accentColor}
                onChange={(e) => onUpdate(selected.id, { fill: e.target.value })}
                className="h-6 w-8 cursor-pointer rounded border border-[var(--line)]"
                aria-label="Monogram colour"
              />
            </div>
            <p className="mt-1 text-[10px] text-[var(--muted)]">
              Used when no logo image is selected
            </p>
          </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2 py-1 text-[11px]"
              onClick={() =>
                onUpdate(selected.id, { behind: !selected.behind })
              }
            >
              {selected.behind ? "In front" : "Behind invoice"}
            </button>
            <button
              type="button"
              className="rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2 py-1 text-[11px]"
              onClick={() => onDuplicate(selected.id)}
            >
              Duplicate
            </button>
            <button
              type="button"
              className="rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2 py-1 text-[11px]"
              onClick={() => onReorder(selected.id, "up")}
            >
              ↑ Layer
            </button>
            <button
              type="button"
              className="rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2 py-1 text-[11px]"
              onClick={() => onReorder(selected.id, "down")}
            >
              ↓ Layer
            </button>
            <button
              type="button"
              className="rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2 py-1 text-[11px]"
              onClick={() =>
                onUpdate(selected.id, { locked: !selected.locked })
              }
            >
              {selected.locked ? "Unlock" : "Lock"}
            </button>
            <button
              type="button"
              className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-800"
              onClick={() => onRemove(selected.id)}
            >
              Delete
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

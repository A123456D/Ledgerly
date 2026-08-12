"use client";

import { useCallback, useRef, useState } from "react";
import { fileToDataUrl, removeImageBackground } from "@/lib/image";
import {
  addBusinessLogo,
  normalizeBusinessLogos,
  removeBusinessLogo,
  renameBusinessLogo,
  replaceBusinessLogoDataUrl,
  setDefaultBusinessLogo,
} from "@/lib/logos";
import type { Business } from "@/lib/types";
import { Button, inputClass } from "@/components/ui";
import {
  clampLogoSizePx,
  DEFAULT_LOGO_SIZE_PX,
  MAX_LOGO_SIZE_PX,
  MIN_LOGO_SIZE_PX,
} from "@/lib/logo-size";

export function LogoLibrary({
  business,
  onChange,
  label = "Logos",
  selectedLogoId,
  onSelectLogo,
  allowNone = false,
  logoSizePx,
  onLogoSizeChange,
}: {
  business: Business;
  onChange: (next: Business) => void;
  label?: string;
  /** When set, shows which logo is active for the current invoice */
  selectedLogoId?: string | null;
  onSelectLogo?: (logoId: string | null) => void;
  allowNone?: boolean;
  /** When set, shows a size slider for the invoice preview */
  logoSizePx?: number;
  onLogoSizeChange?: (px: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tolerance, setTolerance] = useState(42);
  const normalized = normalizeBusinessLogos(business);
  const logos = normalized.logos ?? [];

  const handleFiles = useCallback(
    async (fileList: FileList | File[] | null) => {
      if (!fileList || fileList.length === 0) return;
      setError("");
      try {
        let next = normalizeBusinessLogos(business);
        const files = Array.from(fileList);
        for (const file of files) {
          const dataUrl = await fileToDataUrl(file, {
            maxEdge: 800,
            quality: 0.9,
            maxBytes: 900_000,
            preferPng: true,
          });
          const name = file.name.replace(/\.[^.]+$/, "");
          next = addBusinessLogo(next, dataUrl, name);
        }
        onChange(next);
        if (onSelectLogo && next.defaultLogoId) {
          onSelectLogo(next.defaultLogoId);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      }
    },
    [business, onChange, onSelectLogo],
  );

  async function onRemoveBackground(logoId: string) {
    const logo = logos.find((l) => l.id === logoId);
    if (!logo) return;
    setBusyId(logoId);
    setError("");
    try {
      const cleaned = await removeImageBackground(logo.dataUrl, {
        tolerance,
        maxEdge: 1000,
      });
      onChange(replaceBusinessLogoDataUrl(business, logoId, cleaned));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Background remove failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <p className="mb-1 text-sm text-[var(--muted)]">{label}</p>
      <div
        className={`rounded-xl border border-dashed p-4 transition ${
          dragging
            ? "border-[var(--accent)] bg-teal-50/50"
            : "border-[var(--line)] bg-[var(--wash)]/40"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFiles(e.dataTransfer.files);
        }}
      >
        {logos.length > 0 ? (
          <div className="mb-3 grid gap-2 sm:grid-cols-2">
            {logos.map((logo) => {
              const isDefault = normalized.defaultLogoId === logo.id;
              const isSelected =
                selectedLogoId === undefined
                  ? isDefault
                  : selectedLogoId === logo.id;
              return (
                <div
                  key={logo.id}
                  className={`flex gap-3 rounded-lg border bg-[repeating-conic-gradient(#e7e5e4_0%_25%,#fff_0%_50%)_0_0/12px_12px] p-2 ${
                    isSelected
                      ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/20"
                      : "border-[var(--line)]"
                  }`}
                >
                  <button
                    type="button"
                    className="shrink-0"
                    title="Use this logo"
                    onClick={() => onSelectLogo?.(logo.id)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logo.dataUrl}
                      alt={logo.name}
                      className="h-14 w-14 rounded-md border border-[var(--line)] bg-white/80 object-contain p-1"
                    />
                  </button>
                  <div className="min-w-0 flex-1 space-y-1">
                    <input
                      className={inputClass + " py-1 text-xs"}
                      value={logo.name}
                      onChange={(e) =>
                        onChange(
                          renameBusinessLogo(business, logo.id, e.target.value),
                        )
                      }
                    />
                    <div className="flex flex-wrap gap-1">
                      {onSelectLogo ? (
                        <Button
                          type="button"
                          variant={isSelected ? "primary" : "ghost"}
                          className="px-2 py-1 text-xs"
                          onClick={() => onSelectLogo(logo.id)}
                        >
                          {isSelected ? "On invoice" : "Use"}
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        className="px-2 py-1 text-xs"
                        onClick={() =>
                          onChange(setDefaultBusinessLogo(business, logo.id))
                        }
                      >
                        {isDefault ? "Default" : "Make default"}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="px-2 py-1 text-xs"
                        disabled={busyId === logo.id}
                        onClick={() => void onRemoveBackground(logo.id)}
                      >
                        {busyId === logo.id ? "Removing…" : "Remove BG"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="px-2 py-1 text-xs text-red-700"
                        onClick={() => {
                          const next = removeBusinessLogo(business, logo.id);
                          onChange(next);
                          if (selectedLogoId === logo.id) {
                            onSelectLogo?.(next.defaultLogoId ?? null);
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mb-3 text-sm text-[var(--muted)]">No logos yet.</p>
        )}

        {onLogoSizeChange ? (
          <div className="mb-3 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2">
            <label className="flex items-center justify-between gap-3 text-xs text-[var(--muted)]">
              <span>Logo size on invoice</span>
              <span className="tabular-nums text-[var(--ink)]">
                {clampLogoSizePx(logoSizePx ?? DEFAULT_LOGO_SIZE_PX)}px
              </span>
            </label>
            <input
              type="range"
              min={MIN_LOGO_SIZE_PX}
              max={MAX_LOGO_SIZE_PX}
              step={4}
              value={clampLogoSizePx(logoSizePx ?? DEFAULT_LOGO_SIZE_PX)}
              onChange={(e) => onLogoSizeChange(Number(e.target.value))}
              className="mt-1 w-full accent-[var(--accent)]"
            />
            <div className="mt-1 flex justify-between text-[11px] text-[var(--muted)]">
              <span>Small</span>
              <span>Large</span>
            </div>
          </div>
        ) : null}

        {logos.length > 0 ? (
          <div className="mb-3 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2">
            <label className="flex items-center justify-between gap-3 text-xs text-[var(--muted)]">
              <span>BG remove strength</span>
              <span className="tabular-nums text-[var(--ink)]">{tolerance}</span>
            </label>
            <input
              type="range"
              min={15}
              max={90}
              value={tolerance}
              onChange={(e) => setTolerance(Number(e.target.value))}
              className="mt-1 w-full accent-[var(--accent)]"
            />
            <p className="mt-1 text-[11px] text-[var(--muted)]">
              Offline — clears solid white/colored backdrops. Raise strength if
              more background remains.
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => inputRef.current?.click()}
          >
            Upload logo{logos.length > 0 ? "s" : ""}
          </Button>
          {allowNone && onSelectLogo ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => onSelectLogo(null)}
            >
              No logo on this invoice
            </Button>
          ) : null}
          <p className="text-xs text-[var(--muted)]">
            Drop PNG/JPG — then use Remove BG for white/solid backgrounds.
          </p>
        </div>
        {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="hidden"
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

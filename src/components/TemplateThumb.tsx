"use client";

import type { TemplateMeta } from "@/lib/templates/catalog";

/** Compact A4-ish mock so gallery cards look like real invoices. */
export function TemplateThumb({
  meta,
  size = "md",
}: {
  meta: TemplateMeta;
  size?: "sm" | "md";
}) {
  const h = size === "sm" ? "h-[4.5rem]" : "h-36";
  const pad = size === "sm" ? "p-1.5" : "p-3";
  const header = meta.shell.header;
  const accent = meta.defaultAccent;
  const ink = meta.ink;
  const paper = meta.paper;

  return (
    <div
      className={`relative w-full overflow-hidden ${h} ${pad}`}
      style={{ background: paper, color: ink }}
    >
      {header === "frame" ? (
        <div
          className="pointer-events-none absolute inset-1 rounded-[2px] border"
          style={{ borderColor: accent }}
        />
      ) : null}
      {header === "left-bar" ? (
        <div
          className="absolute bottom-0 left-0 top-0 w-1"
          style={{ background: accent }}
        />
      ) : null}

      {(header === "band" || header === "dark-band") && (
        <div
          className={`-mx-3 -mt-3 mb-1.5 flex items-end justify-between px-2 py-1.5 ${size === "sm" ? "-mx-1.5 -mt-1.5" : ""}`}
          style={{
            background: header === "dark-band" ? "#111827" : accent,
            color: "#fff",
          }}
        >
          <div>
            <div className={`rounded-sm bg-white/90 ${size === "sm" ? "h-1.5 w-6" : "h-2.5 w-10"}`} />
            <div className={`mt-1 rounded-full bg-white/50 ${size === "sm" ? "h-0.5 w-10" : "h-1 w-16"}`} />
          </div>
          <div className="text-right">
            <div className={`ml-auto rounded-full bg-white/40 ${size === "sm" ? "h-0.5 w-6" : "h-1 w-10"}`} />
            <div className={`mt-1 ml-auto rounded-full bg-white/70 ${size === "sm" ? "h-1 w-8" : "h-1.5 w-12"}`} />
          </div>
        </div>
      )}

      {header === "centered" && (
        <div className="mb-1.5 flex flex-col items-center gap-0.5">
          <div
            className={`rounded-sm ${size === "sm" ? "h-1.5 w-5" : "h-2.5 w-8"}`}
            style={{ background: accent }}
          />
          <div
            className={`rounded-full opacity-70 ${size === "sm" ? "h-0.5 w-12" : "h-1 w-20"}`}
            style={{ background: ink }}
          />
          <div
            className={`rounded-full opacity-40 ${size === "sm" ? "h-0.5 w-8" : "h-1 w-14"}`}
            style={{ background: accent }}
          />
        </div>
      )}

      {(header === "split" ||
        header === "top-rule" ||
        header === "frame" ||
        header === "left-bar") && (
          <div
            className={`mb-1.5 flex justify-between gap-2 ${header === "top-rule" ? "border-b pb-1" : ""}`}
            style={header === "top-rule" ? { borderColor: `${accent}66` } : undefined}
          >
            <div className={header === "left-bar" ? "pl-1.5" : ""}>
              <div className="flex items-center gap-1">
                <div
                  className={`rounded-sm ${size === "sm" ? "h-2 w-2" : "h-3.5 w-3.5"}`}
                  style={{ background: accent }}
                />
                <div
                  className={`rounded-full opacity-80 ${size === "sm" ? "h-1 w-8" : "h-1.5 w-14"}`}
                  style={{ background: ink }}
                />
              </div>
              <div
                className={`mt-1 rounded-full opacity-30 ${size === "sm" ? "h-0.5 w-10" : "h-1 w-16"}`}
                style={{ background: ink }}
              />
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <div
                className={`rounded-full ${size === "sm" ? "h-1 w-6" : "h-1.5 w-10"}`}
                style={{ background: accent }}
              />
              <div
                className={`rounded-full opacity-40 ${size === "sm" ? "h-0.5 w-5" : "h-1 w-8"}`}
                style={{ background: ink }}
              />
            </div>
          </div>
        )}

      {/* parties + table sketch */}
      <div className={`grid grid-cols-2 gap-2 ${header === "left-bar" ? "pl-1.5" : ""}`}>
        <div className="space-y-0.5">
          <div
            className={`rounded-full opacity-35 ${size === "sm" ? "h-0.5 w-6" : "h-1 w-8"}`}
            style={{ background: ink }}
          />
          <div
            className={`rounded-full opacity-20 ${size === "sm" ? "h-0.5 w-10" : "h-1 w-14"}`}
            style={{ background: ink }}
          />
        </div>
        <div className="space-y-0.5">
          <div
            className={`ml-auto rounded-full opacity-35 ${size === "sm" ? "h-0.5 w-6" : "h-1 w-8"}`}
            style={{ background: ink }}
          />
          <div
            className={`ml-auto rounded-full opacity-20 ${size === "sm" ? "h-0.5 w-8" : "h-1 w-12"}`}
            style={{ background: ink }}
          />
        </div>
      </div>

      <div className={`mt-2 ${header === "left-bar" ? "pl-1.5" : ""}`}>
        <div
          className={`mb-1 flex ${size === "sm" ? "h-1.5" : "h-2.5"} items-center px-0.5`}
          style={
            meta.shell.table === "filled"
              ? { background: accent }
              : { borderBottom: `1.5px solid ${accent}` }
          }
        >
          {[40, 12, 16, 18].map((w, i) => (
            <div
              key={i}
              className="mx-0.5 rounded-full"
              style={{
                width: `${w}%`,
                height: size === "sm" ? 2 : 3,
                background:
                  meta.shell.table === "filled" ? "rgba(255,255,255,0.85)" : `${ink}55`,
              }}
            />
          ))}
        </div>
        {[0, 1, 2].map((row) => (
          <div
            key={row}
            className={`mb-0.5 flex items-center ${size === "sm" ? "h-1.5" : "h-2"}`}
            style={
              meta.shell.table === "zebra" && row % 2 === 1
                ? { background: `${ink}08` }
                : undefined
            }
          >
            {[40, 12, 16, 18].map((w, i) => (
              <div
                key={i}
                className="mx-0.5 rounded-full opacity-25"
                style={{
                  width: `${w}%`,
                  height: size === "sm" ? 2 : 3,
                  background: ink,
                }}
              />
            ))}
          </div>
        ))}
        <div className="mt-1 flex justify-end">
          <div
            className={`rounded ${size === "sm" ? "h-2.5 w-10" : "h-4 w-14"}`}
            style={{ background: accent }}
          />
        </div>
      </div>
    </div>
  );
}

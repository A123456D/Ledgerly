"use client";

import type { TemplateMeta } from "@/lib/templates/catalog";
import { InvoicePreview } from "@/templates/InvoicePreview";
import { sampleInvoiceView } from "@/templates/sample-doc";

/** WYSIWYG thumbnail: a real, scaled render of the actual template. */
export function TemplateThumb({
  meta,
  size = "md",
}: {
  meta: TemplateMeta;
  size?: "sm" | "md";
}) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-md bg-white"
      style={{ height: size === "sm" ? "4.5rem" : "9.5rem" }}
    >
      <div style={{ zoom: size === "sm" ? 0.24 : 0.34 } as React.CSSProperties}>
        <InvoicePreview doc={sampleInvoiceView(meta.id, meta.defaultAccent)} />
      </div>
    </div>
  );
}

import { Suspense } from "react";
import { TemplateGallery } from "@/components/TemplateGallery";

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading…</p>}>
      <TemplateGallery />
    </Suspense>
  );
}

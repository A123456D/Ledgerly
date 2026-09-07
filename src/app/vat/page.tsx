import { Suspense } from "react";
import { CalculatorsPage } from "@/components/CalculatorsPage";

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading…</p>}>
      <CalculatorsPage defaultTool="vat" />
    </Suspense>
  );
}

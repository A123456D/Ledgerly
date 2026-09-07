"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { InvoiceEditor } from "@/components/InvoiceEditor";

function QuoteEditorFromQuery() {
  const params = useSearchParams();
  const id = useMemo(() => params.get("id")?.trim() || "", [params]);

  if (!id) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Missing quote id.{" "}
        <a href="/quotes" className="underline">
          Back to quotes
        </a>
      </p>
    );
  }

  return <InvoiceEditor id={id} />;
}

export default function QuotePage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading quote…</p>}>
      <QuoteEditorFromQuery />
    </Suspense>
  );
}

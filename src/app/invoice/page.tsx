"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { InvoiceEditor } from "@/components/InvoiceEditor";

function InvoiceEditorFromQuery() {
  const params = useSearchParams();
  const id = useMemo(() => params.get("id")?.trim() || "", [params]);

  if (!id) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Missing invoice id.{" "}
        <a href="/" className="underline">
          Back to invoices
        </a>
      </p>
    );
  }

  return <InvoiceEditor id={id} />;
}

export default function InvoicePage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading invoice…</p>}>
      <InvoiceEditorFromQuery />
    </Suspense>
  );
}

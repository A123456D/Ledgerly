"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { PayslipEditor } from "@/components/PayslipEditor";

function PayslipFromQuery() {
  const params = useSearchParams();
  const id = useMemo(() => params.get("id")?.trim() || "", [params]);

  if (!id) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Missing payslip id.{" "}
        <a href="/payslips" className="underline">
          Back to payslips
        </a>
      </p>
    );
  }

  return <PayslipEditor id={id} />;
}

export default function PayslipPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading payslip…</p>}>
      <PayslipFromQuery />
    </Suspense>
  );
}

import { Suspense } from "react";
import { ExpensesPage } from "@/components/ExpensesPage";

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading…</p>}>
      <ExpensesPage />
    </Suspense>
  );
}

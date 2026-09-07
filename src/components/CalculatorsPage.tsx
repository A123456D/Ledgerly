"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { VatTool } from "./calculators/VatTool";
import {
  BreakEvenTool,
  DiscountTool,
  FxTool,
  InterestTool,
  MarginTool,
  RunwayTool,
  SalaryTool,
} from "./calculators/tools";

export const CALCULATOR_TOOLS = [
  {
    id: "vat",
    label: "VAT",
    title: "VAT",
    subtitle: "Add VAT, strip it from a price, or back out the net from a VAT amount.",
  },
  {
    id: "discount",
    label: "Discount",
    title: "Invoice discount",
    subtitle: "Apply a percent or flat discount, then optional VAT on the reduced amount.",
  },
  {
    id: "margin",
    label: "Margin",
    title: "Profit margin & markup",
    subtitle: "Price from a margin, markup, selling price, or net profit after tax on profit.",
  },
  {
    id: "interest",
    label: "Late interest",
    title: "Late payment interest",
    subtitle: "Interest on overdue invoices from a due date and an annual rate you set.",
  },
  {
    id: "salary",
    label: "Net / gross",
    title: "Net-to-gross pay",
    subtitle: "Estimated take-home or required gross from tax and deduction percentages.",
  },
  {
    id: "fx",
    label: "Currency",
    title: "Currency converter",
    subtitle: "Convert foreign invoices and expenses with a live ECB rate or your own.",
  },
  {
    id: "runway",
    label: "Runway",
    title: "Cash flow runway",
    subtitle: "How many months cash lasts at your average monthly burn.",
  },
  {
    id: "breakeven",
    label: "Break-even",
    title: "Break-even",
    subtitle: "Units or revenue needed to cover fixed and variable costs.",
  },
] as const;

export type CalculatorId = (typeof CALCULATOR_TOOLS)[number]["id"];

function isTool(id: string | null): id is CalculatorId {
  return CALCULATOR_TOOLS.some((t) => t.id === id);
}

export function CalculatorsPage({ defaultTool = "vat" }: { defaultTool?: CalculatorId }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const raw = params.get("tool");
  const tool = isTool(raw) ? raw : defaultTool;
  const meta = CALCULATOR_TOOLS.find((t) => t.id === tool) ?? CALCULATOR_TOOLS[0];

  const select = useCallback(
    (id: CalculatorId) => {
      const next = new URLSearchParams(params.toString());
      next.set("tool", id);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );

  return (
    <div className="min-w-0">
      <PageHeader title="Calculator" subtitle={meta.subtitle} />
      <nav className="mb-5 flex flex-wrap gap-1">
        {CALCULATOR_TOOLS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => select(item.id)}
            className={`inline-flex min-h-11 shrink-0 items-center rounded-md px-3 py-2 text-sm whitespace-nowrap transition sm:min-h-0 sm:py-1.5 ${
              tool === item.id
                ? "bg-[var(--ink)] text-[var(--paper)]"
                : "bg-[var(--wash)] text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <h2 className="mb-4 font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
        {meta.title}
      </h2>
      {tool === "vat" ? <VatTool /> : null}
      {tool === "discount" ? <DiscountTool /> : null}
      {tool === "margin" ? <MarginTool /> : null}
      {tool === "interest" ? <InterestTool /> : null}
      {tool === "salary" ? <SalaryTool /> : null}
      {tool === "fx" ? <FxTool /> : null}
      {tool === "runway" ? <RunwayTool /> : null}
      {tool === "breakeven" ? <BreakEvenTool /> : null}
    </div>
  );
}

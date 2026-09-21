import { describe, expect, it } from "vitest";
import { COMPANY_NUMBER_MAX_LENGTH, companyNumberLine } from "./format";

describe("companyNumberLine", () => {
  it("returns empty when missing or whitespace", () => {
    expect(companyNumberLine(undefined)).toBe("");
    expect(companyNumberLine(null)).toBe("");
    expect(companyNumberLine("")).toBe("");
    expect(companyNumberLine("   ")).toBe("");
  });

  it("labels a CIPC registration number", () => {
    expect(companyNumberLine("2020/123456/07")).toBe(
      "Company No. 2020/123456/07",
    );
  });

  it("trims and caps length so a huge paste cannot blow the sheet", () => {
    const huge = `  ${"9".repeat(80)}  `;
    const line = companyNumberLine(huge);
    expect(line.startsWith("Company No. ")).toBe(true);
    expect(line.slice("Company No. ".length).length).toBe(
      COMPANY_NUMBER_MAX_LENGTH,
    );
  });
});

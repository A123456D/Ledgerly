import { describe, expect, it } from "vitest";
import { addDaysISO, formatDate, todayISO } from "./format";

describe("formatDate", () => {
  it("renders a date-only ISO string as that same calendar day", () => {
    // Date-only strings must not shift a day when read as UTC instants
    // (the pre-fix behavior on UTC-negative timezones).
    const out = formatDate("2026-09-28");
    expect(out).toContain("2026");
    expect(out).toContain("28");
  });

  it("keeps the day stable across the whole sample range", () => {
    for (const iso of [
      "2026-01-01",
      "2026-03-15",
      "2026-07-31",
      "2026-12-31",
    ]) {
      expect(formatDate(iso)).toContain(iso.slice(8, 10));
      expect(formatDate(iso)).toContain(iso.slice(0, 4));
    }
  });

  it("handles full timestamps and junk gracefully", () => {
    expect(formatDate("")).toBe("");
    expect(formatDate("not-a-date")).toBe("not-a-date");
    expect(formatDate("2026-09-28T10:30:00Z")).toContain("2026");
  });
});

describe("todayISO", () => {
  it("returns the local calendar date, not the UTC date", () => {
    const n = new Date();
    const expected = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(
      n.getDate(),
    ).padStart(2, "0")}`;
    expect(todayISO()).toBe(expected);
  });

  it("is a date-only ISO string", () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("addDaysISO", () => {
  it("rolls over month and year boundaries", () => {
    expect(addDaysISO("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDaysISO("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDaysISO("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("handles leap years", () => {
    expect(addDaysISO("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDaysISO("2026-02-28", 1)).toBe("2026-03-01");
  });

  it("is the identity at zero days", () => {
    expect(addDaysISO("2026-09-28", 0)).toBe("2026-09-28");
  });
});

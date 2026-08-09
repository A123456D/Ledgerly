import { describe, expect, it } from "vitest";
import {
  allocateNumber,
  formatInvoiceNumber,
  previewNextNumber,
} from "./numbering";

describe("formatInvoiceNumber", () => {
  it("pads sequence and normalizes prefix", () => {
    expect(formatInvoiceNumber("INV-", 2026, 1)).toBe("INV-2026-0001");
    expect(formatInvoiceNumber("INV", 2026, 42)).toBe("INV-2026-0042");
  });
});

describe("allocateNumber", () => {
  it("consumes the next sequence on issue", () => {
    const first = allocateNumber(
      { nextSequence: 1, sequenceYear: 2026 },
      "INV-",
      2026,
    );
    expect(first.number).toBe("INV-2026-0001");
    expect(first.nextState).toEqual({
      nextSequence: 2,
      sequenceYear: 2026,
    });

    const second = allocateNumber(first.nextState, "INV-", 2026);
    expect(second.number).toBe("INV-2026-0002");
  });

  it("resets sequence on year change without freeing old numbers", () => {
    const result = allocateNumber(
      { nextSequence: 99, sequenceYear: 2025 },
      "INV-",
      2026,
    );
    expect(result.number).toBe("INV-2026-0001");
    expect(result.nextState.nextSequence).toBe(2);
    expect(result.nextState.sequenceYear).toBe(2026);
  });
});

describe("previewNextNumber", () => {
  it("does not mutate state (draft peek)", () => {
    const state = { nextSequence: 5, sequenceYear: 2026 };
    expect(previewNextNumber(state, "INV-", 2026)).toBe("INV-2026-0005");
    expect(previewNextNumber(state, "INV-", 2026)).toBe("INV-2026-0005");
  });
});

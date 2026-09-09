import { describe, expect, it } from "vitest";
import {
  allocateNumber,
  allocateUnusedNumber,
  bumpSequenceForUsedNumber,
  formatInvoiceNumber,
  parseDocumentNumberInput,
  planIssueNumber,
  previewNextNumber,
} from "./numbering";

describe("formatInvoiceNumber", () => {
  it("pads sequence and normalizes prefix", () => {
    expect(formatInvoiceNumber("INV-", 2026, 1)).toBe("INV-2026-0001");
    expect(formatInvoiceNumber("QUO-", 2026, 1)).toBe("QUO-2026-0001");
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

describe("parseDocumentNumberInput", () => {
  it("allows empty drafts and rejects empty issued numbers", () => {
    expect(parseDocumentNumberInput("  ", { allowEmpty: true })).toEqual({
      ok: true,
      value: null,
    });
    expect(parseDocumentNumberInput("  ", { allowEmpty: false }).ok).toBe(false);
  });

  it("strips control characters and collapses spaces", () => {
    expect(parseDocumentNumberInput("QUO  12\n", { allowEmpty: false })).toEqual({
      ok: true,
      value: "QUO 12",
    });
  });
});

describe("planIssueNumber", () => {
  const state = { nextSequence: 1, sequenceYear: 2026 };

  it("uses a custom number and bumps the sequence when it matches the pattern", () => {
    const result = planIssueNumber({
      reservedNumber: "QUO-2026-0042",
      state,
      prefix: "QUO-",
      year: 2026,
      takenNumbers: [],
    });
    expect(result).toEqual({
      ok: true,
      number: "QUO-2026-0042",
      nextState: { nextSequence: 43, sequenceYear: 2026 },
    });
  });

  it("does not consume the auto sequence for a free-form number", () => {
    const result = planIssueNumber({
      reservedNumber: "Quote A",
      state,
      prefix: "QUO-",
      year: 2026,
      takenNumbers: [],
    });
    expect(result).toEqual({
      ok: true,
      number: "Quote A",
      nextState: { nextSequence: 1, sequenceYear: 2026 },
    });
  });

  it("rejects a number already used", () => {
    const result = planIssueNumber({
      reservedNumber: "inv-2026-0001",
      state,
      prefix: "INV-",
      year: 2026,
      takenNumbers: ["INV-2026-0001"],
    });
    expect(result.ok).toBe(false);
  });

  it("skips taken auto numbers", () => {
    const result = planIssueNumber({
      reservedNumber: "",
      state,
      prefix: "INV-",
      year: 2026,
      takenNumbers: ["INV-2026-0001"],
    });
    expect(result).toMatchObject({
      ok: true,
      number: "INV-2026-0002",
      nextState: { nextSequence: 3, sequenceYear: 2026 },
    });
  });
});

describe("bumpSequenceForUsedNumber", () => {
  it("never decreases the next sequence", () => {
    expect(
      bumpSequenceForUsedNumber(
        { nextSequence: 9, sequenceYear: 2026 },
        "INV-",
        2026,
        "INV-2026-0003",
      ),
    ).toEqual({ nextSequence: 9, sequenceYear: 2026 });
  });
});

describe("allocateUnusedNumber", () => {
  it("walks forward until a number is free", () => {
    const result = allocateUnusedNumber(
      { nextSequence: 1, sequenceYear: 2026 },
      "INV-",
      2026,
      ["INV-2026-0001", "INV-2026-0002"],
    );
    expect(result.number).toBe("INV-2026-0003");
    expect(result.nextState.nextSequence).toBe(4);
  });
});

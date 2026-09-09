export type DecimalParseResult =
  | { ok: true; value: number; draft: string }
  | { ok: false; error: string; draft: string };

/**
 * Parse qty/money/percent draft text. Empty and "." count as 0 while typing.
 * Letters and negatives are invalid — callers should show `error` inline.
 */
export function parseNonNegativeDecimal(raw: string): DecimalParseResult {
  const draft = raw.replace(",", ".");
  if (draft === "" || draft === ".") {
    return { ok: true, value: 0, draft };
  }
  if (draft.startsWith("-")) {
    return { ok: false, error: "Must be 0 or more", draft };
  }
  if (!/^\d*\.?\d*$/.test(draft)) {
    return { ok: false, error: "Enter a number", draft };
  }
  const value = parseFloat(draft);
  if (Number.isNaN(value)) {
    return { ok: false, error: "Enter a number", draft };
  }
  return { ok: true, value, draft };
}

export const DOCUMENT_NUMBER_MAX_LEN = 64;

export function formatInvoiceNumber(
  prefix: string,
  year: number,
  sequence: number,
  pad = 4,
): string {
  const cleanPrefix = (prefix || "INV-").trim();
  const normalized = cleanPrefix.endsWith("-")
    ? cleanPrefix
    : `${cleanPrefix}-`;
  return `${normalized}${year}-${String(sequence).padStart(pad, "0")}`;
}

export interface SequenceState {
  nextSequence: number;
  sequenceYear: number;
}

function dashedPrefix(prefix: string): string {
  const cleanPrefix = (prefix || "INV-").trim();
  return cleanPrefix.endsWith("-") ? cleanPrefix : `${cleanPrefix}-`;
}

export function parseDocumentNumberInput(
  raw: string,
  options: { allowEmpty: boolean },
): { ok: true; value: string | null } | { ok: false; error: string } {
  const stripped = raw
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (stripped.length > DOCUMENT_NUMBER_MAX_LEN) {
    return {
      ok: false,
      error: `Keep the number to ${DOCUMENT_NUMBER_MAX_LEN} characters or fewer`,
    };
  }
  if (!stripped) {
    if (options.allowEmpty) return { ok: true, value: null };
    return { ok: false, error: "Enter a number" };
  }
  return { ok: true, value: stripped };
}

/** Trim, strip control chars, collapse spaces. Empty string if nothing remains. */
export function normalizeDocumentNumber(raw: string): string {
  return raw
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, DOCUMENT_NUMBER_MAX_LEN);
}

export function documentNumbersMatch(a: string, b: string): boolean {
  return (
    normalizeDocumentNumber(a).toLowerCase() ===
    normalizeDocumentNumber(b).toLowerCase()
  );
}

/**
 * Parse PREFIX-YEAR-NNNN from a custom number. Null if it is not that pattern
 * for this prefix and calendar year.
 */
export function parseYearSequence(
  number: string,
  prefix: string,
  year: number,
): number | null {
  const normalized = normalizeDocumentNumber(number);
  if (!normalized) return null;
  const head = dashedPrefix(prefix).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = normalized.match(new RegExp(`^${head}${year}-(\\d+)$`, "i"));
  if (!match) return null;
  const sequence = Number(match[1]);
  if (!Number.isInteger(sequence) || sequence < 1) return null;
  return sequence;
}

export function bumpSequenceForUsedNumber(
  state: SequenceState,
  prefix: string,
  year: number,
  usedNumber: string,
): SequenceState {
  let nextSequence = state.nextSequence;
  let sequenceYear = state.sequenceYear;
  if (year !== sequenceYear) {
    sequenceYear = year;
    nextSequence = 1;
  }
  const sequence = parseYearSequence(usedNumber, prefix, year);
  if (sequence !== null && sequence >= nextSequence) {
    nextSequence = sequence + 1;
  }
  return { nextSequence, sequenceYear };
}

/**
 * Allocate the next invoice number for the given calendar year.
 * Does not free numbers on void. Resets sequence when the year changes.
 */
export function allocateNumber(
  state: SequenceState,
  prefix: string,
  year: number,
): { number: string; nextState: SequenceState } {
  let nextSequence = state.nextSequence;
  let sequenceYear = state.sequenceYear;

  if (year !== sequenceYear) {
    sequenceYear = year;
    nextSequence = 1;
  }

  const number = formatInvoiceNumber(prefix, year, nextSequence);
  return {
    number,
    nextState: {
      nextSequence: nextSequence + 1,
      sequenceYear,
    },
  };
}

/** Drafts must not consume sequence — issuing is the only consumer. */
export function previewNextNumber(
  state: SequenceState,
  prefix: string,
  year: number,
): string {
  const seq =
    year !== state.sequenceYear ? 1 : state.nextSequence;
  return formatInvoiceNumber(prefix, year, seq);
}

export function numberIsTaken(candidate: string, taken: string[]): boolean {
  return taken.some((existing) => documentNumbersMatch(existing, candidate));
}

export function allocateUnusedNumber(
  state: SequenceState,
  prefix: string,
  year: number,
  taken: string[],
): { number: string; nextState: SequenceState } {
  let current = allocateNumber(state, prefix, year);
  for (let i = 0; i < 10_000; i++) {
    if (!numberIsTaken(current.number, taken)) return current;
    current = allocateNumber(current.nextState, prefix, year);
  }
  throw new Error("Could not allocate a unique number");
}

export function planIssueNumber(input: {
  reservedNumber: string | null | undefined;
  state: SequenceState;
  prefix: string;
  year: number;
  takenNumbers: string[];
}):
  | { ok: true; number: string; nextState: SequenceState }
  | { ok: false; error: string } {
  const parsed = parseDocumentNumberInput(input.reservedNumber ?? "", {
    allowEmpty: true,
  });
  if (!parsed.ok) return parsed;

  if (parsed.value) {
    if (numberIsTaken(parsed.value, input.takenNumbers)) {
      return { ok: false, error: "That number is already used" };
    }
    return {
      ok: true,
      number: parsed.value,
      nextState: bumpSequenceForUsedNumber(
        input.state,
        input.prefix,
        input.year,
        parsed.value,
      ),
    };
  }

  const allocated = allocateUnusedNumber(
    input.state,
    input.prefix,
    input.year,
    input.takenNumbers,
  );
  return { ok: true, ...allocated };
}

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

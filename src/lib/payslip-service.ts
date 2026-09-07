import { db, getBusiness, getSettings, saveSettings } from "./db";
import { todayISO, uid } from "./format";
import { allocateNumber, previewNextNumber } from "./numbering";
import {
  calculatePayslipTotals,
  clientToEmployee,
  emptyEmployee,
  emptyPayLine,
  monthEndISO,
  monthStartISO,
} from "./payslip";
import type { Payslip } from "./types";

export function recomputePayslip(slip: Payslip): Payslip {
  return {
    ...slip,
    totals: calculatePayslipTotals(slip.earnings, slip.deductions),
  };
}

export async function createDraftPayslip(options?: {
  clientId?: string;
  fromPayslipId?: string;
}): Promise<Payslip> {
  const business = await getBusiness();
  const now = new Date().toISOString();
  const today = todayISO();

  let employee = emptyEmployee();
  let clientId: string | null = null;
  let earnings = [emptyPayLine("Basic pay")];
  let deductions = [emptyPayLine("PAYE"), emptyPayLine("UIF")];
  let notes = "";
  let currency = business.currency;
  let accentColor = business.accentColor;
  let fontPair = business.fontPair;
  let logoId: string | null | undefined = business.defaultLogoId;
  let periodStart = monthStartISO(today);
  let periodEnd = monthEndISO(today);
  let payDate = periodEnd;

  if (options?.fromPayslipId) {
    const source = await db.payslips.get(options.fromPayslipId);
    if (source) {
      employee = { ...source.employee };
      clientId = source.clientId;
      earnings = source.earnings.map((line) => ({ ...line, id: uid("pay") }));
      deductions = source.deductions.map((line) => ({ ...line, id: uid("pay") }));
      notes = source.notes;
      currency = source.currency;
      accentColor = source.accentColor;
      fontPair = source.fontPair;
      logoId = source.logoId;
      periodStart = source.periodStart;
      periodEnd = source.periodEnd;
      payDate = source.payDate;
    }
  } else if (options?.clientId) {
    const client = await db.clients.get(options.clientId);
    if (client) {
      employee = clientToEmployee(client);
      clientId = client.id;
    }
  }

  const slip: Payslip = recomputePayslip({
    id: uid("pay"),
    status: "draft",
    number: null,
    clientId,
    employee,
    periodStart,
    periodEnd,
    payDate,
    currency,
    accentColor,
    fontPair,
    logoId,
    earnings,
    deductions,
    notes,
    totals: { gross: 0, deductionTotal: 0, net: 0 },
    createdAt: now,
    updatedAt: now,
  });
  await db.payslips.put(slip);
  return slip;
}

export async function savePayslip(slip: Payslip): Promise<Payslip> {
  if (slip.status !== "draft") {
    throw new Error("Only drafts can be edited");
  }
  const next = recomputePayslip({
    ...slip,
    updatedAt: new Date().toISOString(),
  });
  await db.payslips.put(next);
  return next;
}

export async function peekPayslipNumber(): Promise<string> {
  const business = await getBusiness();
  const settings = await getSettings();
  const year = new Date().getFullYear();
  return previewNextNumber(
    {
      nextSequence: settings.nextPayslipSequence ?? 1,
      sequenceYear: settings.payslipSequenceYear ?? year,
    },
    business.payslipPrefix || "PAY-",
    year,
  );
}

export async function issuePayslip(id: string): Promise<Payslip> {
  const slip = await db.payslips.get(id);
  if (!slip) throw new Error("Payslip not found");
  if (slip.status !== "draft") {
    throw new Error("Only drafts can be issued");
  }
  if (!slip.employee.name.trim()) {
    throw new Error("Add an employee name before issuing");
  }
  const year = new Date().getFullYear();
  const settings = await getSettings();
  const business = await getBusiness();
  const { number, nextState } = allocateNumber(
    {
      nextSequence: settings.nextPayslipSequence ?? 1,
      sequenceYear: settings.payslipSequenceYear ?? year,
    },
    business.payslipPrefix || "PAY-",
    year,
  );
  const next = recomputePayslip({
    ...slip,
    status: "issued",
    number,
    updatedAt: new Date().toISOString(),
  });
  await db.payslips.put(next);
  await saveSettings({
    nextPayslipSequence: nextState.nextSequence,
    payslipSequenceYear: nextState.sequenceYear,
  });
  return next;
}

export async function voidPayslip(id: string): Promise<Payslip> {
  const slip = await db.payslips.get(id);
  if (!slip) throw new Error("Payslip not found");
  if (slip.status === "draft") {
    throw new Error("Void an issued slip, or delete the draft");
  }
  const next = { ...slip, status: "void" as const, updatedAt: new Date().toISOString() };
  await db.payslips.put(next);
  return next;
}

export async function deleteDraftPayslip(id: string): Promise<void> {
  const slip = await db.payslips.get(id);
  if (!slip) return;
  if (slip.status !== "draft") {
    throw new Error("Only drafts can be deleted");
  }
  await db.payslips.delete(id);
}

export async function duplicatePayslip(id: string): Promise<Payslip> {
  return createDraftPayslip({ fromPayslipId: id });
}

import { roundMoney } from "./invoice-math";
import { uid } from "./format";
import type { Client, PayLine, PayslipEmployee, PayslipTotals } from "./types";

export function emptyPayLine(label = ""): PayLine {
  return { id: uid("pay"), label, amount: 0 };
}

export function emptyEmployee(): PayslipEmployee {
  return {
    name: "",
    email: "",
    taxId: "",
    employeeNumber: "",
    jobTitle: "",
    address: "",
  };
}

export function clientToEmployee(client: Client): PayslipEmployee {
  return {
    name: client.name,
    email: client.email,
    taxId: client.taxId,
    employeeNumber: "",
    jobTitle: "",
    address: [client.address, client.city, client.postalCode, client.country]
      .filter(Boolean)
      .join(", "),
  };
}

export function sumPayLines(lines: PayLine[]): number {
  return roundMoney(
    lines.reduce((sum, line) => sum + (Number.isFinite(line.amount) ? line.amount : 0), 0),
  );
}

export function calculatePayslipTotals(
  earnings: PayLine[],
  deductions: PayLine[],
): PayslipTotals {
  const gross = sumPayLines(earnings);
  const deductionTotal = sumPayLines(deductions);
  return {
    gross,
    deductionTotal,
    net: roundMoney(gross - deductionTotal),
  };
}

export function monthStartISO(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export function monthEndISO(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const y = last.getFullYear();
  const m = String(last.getMonth() + 1).padStart(2, "0");
  const day = String(last.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

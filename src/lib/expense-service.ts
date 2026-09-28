import { db } from "./db";
import { todayISO, uid } from "./format";
import type { Expense } from "./types";

export async function listExpenses(): Promise<Expense[]> {
  return db.expenses.orderBy("date").reverse().toArray();
}

export async function saveExpense(
  expense: Expense,
): Promise<Expense> {
  if (!expense.date) throw new Error("Pick a date");
  if (!(expense.total > 0)) throw new Error("Enter the amount you paid");
  if (expense.vatPortion < 0 || expense.vatPortion > expense.total) {
    throw new Error("VAT portion can't be negative or more than the total");
  }
  const now = new Date().toISOString();
  const next: Expense = {
    ...expense,
    vendor: expense.vendor.trim().slice(0, 120),
    description: expense.description.trim().slice(0, 300),
    updatedAt: now,
  };
  await db.expenses.put(next);
  return next;
}

export function emptyExpense(currency: string): Expense {
  return {
    id: uid("exp"),
    date: todayISO(),
    vendor: "",
    description: "",
    category: "other",
    total: 0,
    vatPortion: 0,
    currency,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function deleteExpense(id: string): Promise<void> {
  await db.expenses.delete(id);
}

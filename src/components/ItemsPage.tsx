"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { db, getBusiness } from "@/lib/db";
import { formatMoney, uid } from "@/lib/format";
import type { CatalogItem } from "@/lib/types";
import { Button, Field, PageHeader, inputClass } from "@/components/ui";

export function ItemsPage() {
  const items = useLiveQuery(() => db.items.orderBy("description").toArray(), []);
  const business = useLiveQuery(() => getBusiness(), []);
  const [form, setForm] = useState({
    description: "",
    unitPrice: 0,
    unit: "",
    taxRate: 15,
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (business && !editingId && !form.description) {
      setForm((f) => ({ ...f, taxRate: business.defaultTaxRate }));
    }
  }, [business, editingId, form.description]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    const now = new Date().toISOString();
    if (editingId) {
      const existing = await db.items.get(editingId);
      if (!existing) return;
      await db.items.put({ ...existing, ...form });
    } else {
      const item: CatalogItem = {
        id: uid("item"),
        ...form,
        createdAt: now,
      };
      await db.items.put(item);
    }
    setForm({
      description: "",
      unitPrice: 0,
      unit: "",
      taxRate: business?.defaultTaxRate ?? 15,
    });
    setEditingId(null);
  }

  function onEdit(item: CatalogItem) {
    setEditingId(item.id);
    setForm({
      description: item.description,
      unitPrice: item.unitPrice,
      unit: item.unit,
      taxRate: item.taxRate,
    });
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this catalog item?")) return;
    await db.items.delete(id);
  }

  return (
    <div>
      <PageHeader
        title="Catalog"
        subtitle="Line-item presets for day rates, retainers, and packages."
      />
      <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        <form onSubmit={onSave} className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
          <h2 className="font-[family-name:var(--font-display)] text-xl">
            {editingId ? "Edit item" : "New preset"}
          </h2>
          <Field label="Description">
            <input
              className={inputClass}
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="e.g. Design day rate"
            />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Unit price">
              <input
                className={inputClass}
                type="number"
                min={0}
                step={0.01}
                value={form.unitPrice}
                onChange={(e) => setForm({ ...form, unitPrice: Number(e.target.value) })}
              />
            </Field>
            <Field label="Unit">
              <input
                className={inputClass}
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                placeholder="day"
              />
            </Field>
            <Field label="VAT %">
              <input
                className={inputClass}
                type="number"
                min={0}
                step={0.01}
                value={form.taxRate}
                onChange={(e) => setForm({ ...form, taxRate: Number(e.target.value) })}
              />
            </Field>
          </div>
          <div className="flex gap-2">
            <Button type="submit">{editingId ? "Update" : "Add preset"}</Button>
            {editingId ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditingId(null);
                  setForm({
                    description: "",
                    unitPrice: 0,
                    unit: "",
                    taxRate: business?.defaultTaxRate ?? 15,
                  });
                }}
              >
                Cancel
              </Button>
            ) : null}
          </div>
        </form>

        <div className="space-y-2">
          {!items?.length ? (
            <div className="rounded-xl border border-dashed border-[var(--line)] px-4 py-10 text-center text-sm text-[var(--muted)]">
              Add presets like “Day rate” or “Monthly retainer” to fill invoices in one click.
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3"
              >
                <div>
                  <p className="font-medium">{item.description}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {formatMoney(item.unitPrice, business?.currency || "ZAR")}
                    {item.unit ? ` / ${item.unit}` : ""} · {item.taxRate}% VAT
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={() => onEdit(item)}>
                    Edit
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => onDelete(item.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

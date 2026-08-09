"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { db } from "@/lib/db";
import { uid } from "@/lib/format";
import { createDraftInvoice } from "@/lib/invoice-service";
import type { Client } from "@/lib/types";
import { Button, Field, PageHeader, inputClass } from "@/components/ui";

const blank = (): Omit<Client, "id" | "createdAt" | "updatedAt"> => ({
  name: "",
  email: "",
  address: "",
  city: "",
  postalCode: "",
  country: "",
  taxId: "",
  notes: "",
});

export function ClientsPage() {
  const router = useRouter();
  const clients = useLiveQuery(() => db.clients.orderBy("name").toArray(), []);
  const [form, setForm] = useState(blank());
  const [editingId, setEditingId] = useState<string | null>(null);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    const now = new Date().toISOString();
    if (editingId) {
      const existing = await db.clients.get(editingId);
      if (!existing) return;
      await db.clients.put({ ...existing, ...form, updatedAt: now });
    } else {
      await db.clients.put({
        ...form,
        id: uid("cli"),
        createdAt: now,
        updatedAt: now,
      });
    }
    setForm(blank());
    setEditingId(null);
  }

  function onEdit(c: Client) {
    setEditingId(c.id);
    setForm({
      name: c.name,
      email: c.email,
      address: c.address,
      city: c.city,
      postalCode: c.postalCode,
      country: c.country,
      taxId: c.taxId,
      notes: c.notes,
    });
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this client?")) return;
    await db.clients.delete(id);
    if (editingId === id) {
      setEditingId(null);
      setForm(blank());
    }
  }

  async function invoiceFor(clientId: string) {
    const inv = await createDraftInvoice({ clientId });
    router.push(`/invoice?id=${inv.id}`);
  }

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle="Save bill-to details once — reuse them on every invoice."
      />
      <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
        <form onSubmit={onSave} className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
          <h2 className="font-[family-name:var(--font-display)] text-xl">
            {editingId ? "Edit client" : "New client"}
          </h2>
          <Field label="Name">
            <input className={inputClass} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Email">
            <input className={inputClass} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Address">
            <input className={inputClass} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="City">
              <input className={inputClass} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </Field>
            <Field label="Postal">
              <input className={inputClass} value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} />
            </Field>
          </div>
          <Field label="Country">
            <input className={inputClass} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          </Field>
          <Field label="Tax ID">
            <input className={inputClass} value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} />
          </Field>
          <Field label="Notes">
            <textarea className={inputClass} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <div className="flex gap-2">
            <Button type="submit">{editingId ? "Update" : "Add client"}</Button>
            {editingId ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditingId(null);
                  setForm(blank());
                }}
              >
                Cancel
              </Button>
            ) : null}
          </div>
        </form>

        <div className="space-y-2">
          {!clients ? (
            <p className="text-sm text-[var(--muted)]">Loading…</p>
          ) : clients.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--line)] px-4 py-10 text-center text-sm text-[var(--muted)]">
              No clients yet. Add one to autofill bill-to.
            </div>
          ) : (
            clients.map((c) => (
              <div
                key={c.id}
                className="flex flex-col gap-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-[var(--ink)]">{c.name}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {[c.email, c.city, c.country].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" onClick={() => invoiceFor(c.id)}>
                    Invoice
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => onEdit(c)}>
                    Edit
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => onDelete(c.id)}>
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

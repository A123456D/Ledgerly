"use client";

import { useLiveQuery } from "dexie-react-hooks";
import {useEffect, useState, useRef } from "react";
import {
  downloadJson,
  exportBackup,
  importBackup,
  type BackupPayload,
} from "@/lib/backup";
import {
  createAutoBackup,
  deleteAutoBackup,
  listAutoBackups,
  restoreAutoBackup,
} from "@/lib/auto-backup";
import { getBusiness, getSettings, saveBusiness, saveSettings } from "@/lib/db";
import type { Business, TaxMode, TemplateId } from "@/lib/types";
import { Button, Field, PageHeader, inputClass } from "@/components/ui";
import { LogoLibrary } from "@/components/LogoUploader";
import { BrandLookControls } from "@/components/BrandLookControls";
import { TemplatePicker } from "@/components/TemplatePicker";
import { formatDate } from "@/lib/format";
import Link from "next/link";

export function SettingsPage() {
  const businessLive = useLiveQuery(() => getBusiness(), []);
  const settingsLive = useLiveQuery(() => getSettings(), []);
  const autoBackups = useLiveQuery(() => listAutoBackups(), []);
  const [form, setForm] = useState<Business | null>(null);
  const [template, setTemplate] = useState<TemplateId>("classic");
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [backupMessage, setBackupMessage] = useState("");
  const [busyBackup, setBusyBackup] = useState(false);

  // Seed the form once — background settings writes (auto-backup timestamps)
  // must never clobber in-progress edits.
  const formSeeded = useRef(false);
  useEffect(() => {
    if (businessLive && !formSeeded.current) {
      formSeeded.current = true;
      setForm(businessLive);
    }
  }, [businessLive]);

  const settingsSeeded = useRef(false);
  useEffect(() => {
    if (settingsLive && !settingsSeeded.current) {
      settingsSeeded.current = true;
      setTemplate(settingsLive.defaultTemplate);
      setAutoBackupEnabled(settingsLive.autoBackupEnabled !== false);
    }
  }, [settingsLive]);

  if (!form) {
    return <p className="text-sm text-[var(--muted)]">Loading…</p>;
  }

  function patch<K extends keyof Business>(key: K, value: Business[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
    setSaved(false);
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await saveBusiness(form!);
      await saveSettings({
        defaultTemplate: template,
        autoBackupEnabled,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  async function onExport() {
    const data = await exportBackup();
    downloadJson(`easyledger-backup-${new Date().toISOString().slice(0, 10)}.json`, data);
  }

  async function onImport(file: File | null) {
    if (!file) return;
    setError("");
    try {
      const text = await file.text();
      const payload = JSON.parse(text) as BackupPayload;
      await importBackup(payload, "replace");
      setSaved(true);
      setBackupMessage("Backup imported");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    }
  }

  async function onBackupNow() {
    setBusyBackup(true);
    setBackupMessage("");
    setError("");
    try {
      const record = await createAutoBackup("manual", { force: true });
      setBackupMessage(
        record
          ? `Auto-backup saved (${record.invoiceCount} invoices)`
          : "Auto-backup skipped (disabled)",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Backup failed");
    } finally {
      setBusyBackup(false);
    }
  }

  async function onRestore(id: string) {
    if (
      !confirm(
        "Restore this auto-backup? Current local data will be replaced.",
      )
    ) {
      return;
    }
    setBusyBackup(true);
    setError("");
    try {
      await restoreAutoBackup(id);
      setBackupMessage("Restored from auto-backup");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Restore failed");
    } finally {
      setBusyBackup(false);
    }
  }

  async function onDownloadAuto(id: string) {
    const list = autoBackups ?? [];
    const record = list.find((b) => b.id === id);
    if (!record) return;
    downloadJson(
      `easyledger-auto-${record.createdAt.slice(0, 10)}.json`,
      record.payload,
    );
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Business identity, tax defaults, numbering, and backups."
      />

      <form onSubmit={onSave} className="grid gap-8 lg:grid-cols-2">
        <section className="space-y-4 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3.5 sm:p-5">
          <h2 className="font-[family-name:var(--font-display)] text-xl">Business</h2>
          <Field label="Legal / trading name">
            <input className={inputClass} value={form.name} onChange={(e) => patch("name", e.target.value)} required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email">
              <input className={inputClass} type="email" value={form.email} onChange={(e) => patch("email", e.target.value)} />
            </Field>
            <Field label="Phone">
              <input className={inputClass} value={form.phone} onChange={(e) => patch("phone", e.target.value)} />
            </Field>
          </div>
          <Field label="Address">
            <input className={inputClass} value={form.address} onChange={(e) => patch("address", e.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="City">
              <input className={inputClass} value={form.city} onChange={(e) => patch("city", e.target.value)} />
            </Field>
            <Field label="Postal code">
              <input className={inputClass} value={form.postalCode} onChange={(e) => patch("postalCode", e.target.value)} />
            </Field>
            <Field label="Country">
              <input className={inputClass} value={form.country} onChange={(e) => patch("country", e.target.value)} />
            </Field>
          </div>
          <label className="flex items-start gap-2.5 rounded-lg border border-[var(--line)] bg-[var(--wash)]/50 px-3 py-2.5 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--line)] accent-[var(--accent)]"
              checked={Boolean(form.vatRegistered)}
              onChange={(e) => patch("vatRegistered", e.target.checked)}
            />
            <span>
              <span className="font-medium text-[var(--ink)]">VAT registered — issue SARS tax invoices</span>
              <span className="mt-0.5 block text-xs text-[var(--muted)]">
                Off by default. Turn on only if you have a VAT number and need Tax Invoices. Off: documents say Invoice, and SARS checks will not block Send.
              </span>
            </span>
          </label>
          <Field
            label="VAT No."
            hint={
              form.vatRegistered
                ? "SARS 10-digit VAT number. Needed on tax invoices."
                : "Optional. Used on the sheet if you fill it in — not required unless VAT registered is on."
            }
          >
            <input className={inputClass} value={form.taxId} placeholder="4123456789" onChange={(e) => patch("taxId", e.target.value)} />
          </Field>
          <Field
            label="Company No."
            hint="CIPC registration, e.g. 2020/123456/07. Optional — toggle it on each invoice."
          >
            <input
              className={inputClass}
              value={form.companyNumber ?? ""}
              placeholder="2020/123456/07"
              maxLength={40}
              autoComplete="off"
              onChange={(e) => patch("companyNumber", e.target.value)}
            />
          </Field>
        </section>

        <section className="space-y-4 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3.5 sm:p-5">
          <h2 className="font-[family-name:var(--font-display)] text-xl">Defaults & brand</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Currency"
              hint={
                form.currency && form.currency !== "ZAR"
                  ? "ISO code — ZAR for South African rand. SA tax invoices expect ZAR."
                  : "ISO code — ZAR for South African rand"
              }
            >
              <input className={inputClass} value={form.currency} onChange={(e) => patch("currency", e.target.value.toUpperCase())} maxLength={3} />
            </Field>
            <Field
              label="Default VAT rate %"
              hint="Standard SA rate is 15%. Line rates can still differ."
            >
              <input className={inputClass} type="number" min={0} step={0.01} value={form.defaultTaxRate} onChange={(e) => patch("defaultTaxRate", Math.max(0, Number(e.target.value) || 0))} />
            </Field>
            <Field label="VAT mode" hint="This is the default for new invoices. Each invoice can override.">
              <select className={inputClass} value={form.taxMode} onChange={(e) => patch("taxMode", e.target.value as TaxMode)}>
                <option value="exclusive">Prices excl. VAT (add 15% on top)</option>
                <option value="inclusive">Prices incl. VAT (VAT already in the rate)</option>
              </select>
            </Field>
            <Field label="Net days" hint="Optional helper — use it on an invoice to fill a due date. New invoices do not get a due date automatically.">
              <input className={inputClass} type="number" min={0} value={form.netDays} onChange={(e) => patch("netDays", Math.max(0, Number(e.target.value) || 0))} />
            </Field>
            <Field label="Invoice prefix" hint="Numbers format as PREFIX-YEAR-0001">
              <input className={inputClass} value={form.invoicePrefix} onChange={(e) => patch("invoicePrefix", e.target.value)} />
            </Field>
            <Field label="Quote prefix" hint="Quotes use a separate sequence">
              <input className={inputClass} value={form.quotePrefix || "QUO-"} onChange={(e) => patch("quotePrefix", e.target.value)} />
            </Field>
            <Field label="Payslip prefix" hint="Payslips use a separate sequence">
              <input className={inputClass} value={form.payslipPrefix || "PAY-"} onChange={(e) => patch("payslipPrefix", e.target.value)} />
            </Field>
          </div>
          <BrandLookControls
            accentColor={form.accentColor}
            fontPair={form.fontPair}
            onAccentChange={(accentColor) => patch("accentColor", accentColor)}
            onFontChange={(fontPair) => patch("fontPair", fontPair)}
          />
          <Field
            label="Payment terms / instructions"
            hint="Optional. Copied onto new invoices only if you fill this in. Leave blank to omit Payment from the sheet."
          >
            <textarea className={inputClass} rows={3} value={form.paymentTerms} placeholder="e.g. EFT to … within 14 days" onChange={(e) => patch("paymentTerms", e.target.value)} />
          </Field>
          <LogoLibrary
            business={form}
            onChange={(next) => {
              setForm(next);
              setSaved(false);
            }}
            logoSizePx={form.defaultLogoSizePx}
            onLogoSizeChange={(defaultLogoSizePx) =>
              patch("defaultLogoSizePx", defaultLogoSizePx)
            }
          />
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm text-[var(--muted)]">Default template</p>
              <Link href="/templates" className="text-xs text-teal-800 underline">
                Template gallery →
              </Link>
            </div>
            <TemplatePicker
              value={template}
              onChange={(id) => {
                setTemplate(id);
                setSaved(false);
              }}
              onAccentSuggest={(accent) => patch("accentColor", accent)}
            />
          </div>
          {settingsLive ? (
            <p className="text-xs text-[var(--muted)]">
              Next number sequence: {settingsLive.nextSequence} (year {settingsLive.sequenceYear}). Drafts do not consume numbers.
            </p>
          ) : null}
        </section>

        <div className="flex flex-wrap items-center gap-3 lg:col-span-2">
          <Button type="submit">Save settings</Button>
          {saved ? <span className="text-sm text-teal-700">Saved</span> : null}
          {error ? <span className="text-sm text-red-700">{error}</span> : null}
        </div>
      </form>

      <section className="mt-10 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3.5 sm:p-5">
        <h2 className="font-[family-name:var(--font-display)] text-xl">Backup</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Auto-backups stay on this device (IndexedDB). Export a JSON file for an off-device copy.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoBackupEnabled}
              onChange={(e) => {
                setAutoBackupEnabled(e.target.checked);
                setSaved(false);
              }}
            />
            Auto-backup enabled
          </label>
          {settingsLive?.lastAutoBackupAt ? (
            <p className="text-xs text-[var(--muted)]">
              Last auto-backup: {formatDate(settingsLive.lastAutoBackupAt.slice(0, 10))}{" "}
              {settingsLive.lastAutoBackupAt.slice(11, 16)}
            </p>
          ) : (
            <p className="text-xs text-[var(--muted)]">No auto-backup yet</p>
          )}
        </div>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Snapshots run on open, about hourly, and after issuing or deleting a draft. Keeps the newest 10.
          Save settings to persist the toggle.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <Button type="button" variant="secondary" onClick={onExport}>
            Export backup
          </Button>
          <label className="inline-flex cursor-pointer items-center rounded-md border border-[var(--line)] bg-[var(--panel)] px-3.5 py-2 text-sm hover:bg-[var(--wash)]">
            Import backup
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => onImport(e.target.files?.[0] ?? null)}
            />
          </label>
          <Button
            type="button"
            variant="ghost"
            disabled={busyBackup || !autoBackupEnabled}
            onClick={() => void onBackupNow()}
          >
            Backup now
          </Button>
        </div>

        {backupMessage ? (
          <p className="mt-3 text-sm text-teal-800">{backupMessage}</p>
        ) : null}

        {autoBackups && autoBackups.length > 0 ? (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-[var(--ink)]">Recent auto-backups</h3>
            <ul className="mt-2 divide-y divide-[var(--line)] rounded-lg border border-[var(--line)]">
              {autoBackups.map((b) => (
                <li
                  key={b.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium tabular-nums">
                      {b.createdAt.slice(0, 10)} {b.createdAt.slice(11, 16)}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {b.reason} · {b.invoiceCount} invoices · {b.clientCount} clients
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={busyBackup}
                      onClick={() => onDownloadAuto(b.id)}
                    >
                      Download
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busyBackup}
                      onClick={() => void onRestore(b.id)}
                    >
                      Restore
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={busyBackup}
                      onClick={() => void deleteAutoBackup(b.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </div>
  );
}

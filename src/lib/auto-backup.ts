import { exportBackup, importBackup, type BackupPayload } from "./backup";
import { db, getSettings, saveSettings } from "./db";
import { uid } from "./format";
import type { AutoBackupRecord } from "./types";

/** Minimum gap between routine auto-backups (issue/delete can force sooner). */
const MIN_INTERVAL_MS = 15 * 60 * 1000;

let inFlight: Promise<AutoBackupRecord | null> | null = null;

export async function listAutoBackups(): Promise<AutoBackupRecord[]> {
  return db.autoBackups.orderBy("createdAt").reverse().toArray();
}

export async function pruneAutoBackups(keep: number): Promise<void> {
  const all = await db.autoBackups.orderBy("createdAt").reverse().toArray();
  const drop = all.slice(Math.max(0, keep));
  if (drop.length) {
    await db.autoBackups.bulkDelete(drop.map((b) => b.id));
  }
}

export async function createAutoBackup(
  reason: string,
  options?: { force?: boolean },
): Promise<AutoBackupRecord | null> {
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const settings = await getSettings();
      if (settings.autoBackupEnabled === false) return null;

      const now = Date.now();
      const last = settings.lastAutoBackupAt
        ? Date.parse(settings.lastAutoBackupAt)
        : 0;
      if (!options?.force && last && now - last < MIN_INTERVAL_MS) {
        return null;
      }

      const payload = await exportBackup();
      const record: AutoBackupRecord = {
        id: uid("abak"),
        createdAt: new Date().toISOString(),
        reason,
        invoiceCount: payload.invoices.length,
        clientCount: payload.clients.length,
        payload,
      };

      await db.autoBackups.put(record);
      await saveSettings({ lastAutoBackupAt: record.createdAt });
      await pruneAutoBackups(settings.autoBackupKeep ?? 10);
      return record;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/** On app open / hourly: backup if enough time has passed. */
export async function maybeAutoBackupOnLaunch(): Promise<void> {
  await createAutoBackup("scheduled", { force: false });
}

export async function restoreAutoBackup(id: string): Promise<void> {
  const record = await db.autoBackups.get(id);
  if (!record) throw new Error("Backup not found");
  const payload = record.payload as BackupPayload;
  await importBackup(payload, "replace");
}

export async function deleteAutoBackup(id: string): Promise<void> {
  await db.autoBackups.delete(id);
}

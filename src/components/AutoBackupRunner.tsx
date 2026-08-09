"use client";

import { useEffect } from "react";
import { maybeAutoBackupOnLaunch, createAutoBackup } from "@/lib/auto-backup";

const HOUR_MS = 60 * 60 * 1000;

/** Runs silent IndexedDB auto-backups on launch and roughly hourly. */
export function AutoBackupRunner() {
  useEffect(() => {
    void maybeAutoBackupOnLaunch();

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void createAutoBackup("resume", { force: false });
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    const timer = window.setInterval(() => {
      void createAutoBackup("hourly", { force: false });
    }, HOUR_MS);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(timer);
    };
  }, []);

  return null;
}

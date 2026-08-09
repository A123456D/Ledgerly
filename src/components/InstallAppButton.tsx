"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia("(display-mode: standalone)").matches;
  const ios =
    "standalone" in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return mq || ios;
}

function isIosSafari(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const iOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const webkit = /WebKit/.test(ua);
  const notOther = !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return iOS && webkit && notOther;
}

export function InstallAppButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissedIos, setDismissedIos] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);

    if (isIosSafari()) setShowIosHint(true);

    try {
      if (sessionStorage.getItem("ledgerly-ios-install-dismissed") === "1") {
        setDismissedIos(true);
      }
    } catch {
      /* ignore */
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  async function onInstall() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  }

  function dismissIos() {
    setDismissedIos(true);
    try {
      sessionStorage.setItem("ledgerly-ios-install-dismissed", "1");
    } catch {
      /* ignore */
    }
  }

  if (deferred) {
    return (
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-md border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1.5 text-xs font-medium text-[var(--ink)] transition hover:bg-[var(--wash)] sm:px-3 sm:text-sm"
        onClick={() => void onInstall()}
      >
        Install
      </button>
    );
  }

  if (showIosHint && !dismissedIos) {
    return (
      <button
        type="button"
        className="max-w-[9.5rem] rounded-md border border-[var(--line)] bg-[var(--wash)] px-2 py-1 text-left text-[10px] leading-snug text-[var(--muted)] sm:max-w-[14rem] sm:text-[11px]"
        onClick={dismissIos}
        title="Share → Add to Home Screen"
      >
        Share → Add to Home Screen <span className="opacity-60">×</span>
      </button>
    );
  }

  return null;
}

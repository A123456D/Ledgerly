"use client";

import { useEffect } from "react";

/** Registers the Ledgerly service worker in production builds only. */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const base = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
    const swUrl = `${base}/sw.js`;

    const register = () => {
      void navigator.serviceWorker.register(swUrl).catch(() => {
        /* ignore registration failures in unsupported contexts */
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}

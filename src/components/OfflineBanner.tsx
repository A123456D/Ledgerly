"use client";

import { useOffline } from "next/offline";

export function OfflineBanner() {
  const offline = useOffline();
  if (!offline) return null;

  return (
    <div
      role="status"
      className="border-b border-amber-200 bg-amber-50 px-[max(1rem,env(safe-area-inset-left))] py-2 pr-[max(1rem,env(safe-area-inset-right))] text-center text-sm text-amber-950"
    >
      You’re offline — invoices and clients stay on this device. Some actions (like email) need a connection.
    </div>
  );
}

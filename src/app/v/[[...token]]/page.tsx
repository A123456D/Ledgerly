import type { Metadata } from "next";
import { Suspense } from "react";
import { PublicSharePage } from "@/components/PublicSharePage";

export const metadata: Metadata = {
  title: "Document",
  robots: { index: false, follow: false, nocache: true, noarchive: true },
};

export function generateStaticParams() {
  return [{ token: [] as string[] }];
}

export const dynamicParams = true;

export default async function Page({
  params,
}: {
  params: Promise<{ token?: string[] }>;
}) {
  const { token } = await params;
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[100dvh] items-center justify-center px-4">
          <p className="text-sm text-[var(--muted)]">Loading document…</p>
        </main>
      }
    >
      <PublicSharePage pathToken={token?.[0] ?? ""} />
    </Suspense>
  );
}

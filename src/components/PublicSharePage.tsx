"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui";
import { InvoiceStage } from "@/components/InvoiceStage";
import { InvoicePreview } from "@/templates/InvoicePreview";
import { downloadInvoicePdf } from "@/lib/pdf/download";
import { formatDate } from "@/lib/format";
import { documentKind, isQuote } from "@/lib/document-kind";
import {
  COPY,
  isShareToken,
  publicStatusChip,
  type PublicSharePayload,
} from "@/lib/share-link";
import { loadPublicShare } from "@/lib/share-link-store";

function resolveToken(pathToken: string | undefined, param: unknown, query: string | null) {
  const fromParam = Array.isArray(param) ? param[0] : typeof param === "string" ? param : "";
  return (fromParam || pathToken || query || "").trim();
}

export function PublicSharePage({ pathToken = "" }: { pathToken?: string }) {
  const params = useParams();
  const search = useSearchParams();
  const token = resolveToken(pathToken, params.token, search.get("t"));
  const validToken = isShareToken(token) ? token : "";

  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "unavailable" }
    | { kind: "error" }
    | { kind: "ready"; payload: PublicSharePayload }
  >({ kind: validToken ? "loading" : "unavailable" });
  const [pdfError, setPdfError] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);

  const load = useCallback(async () => {
    if (!validToken) {
      setState({ kind: "unavailable" });
      return;
    }
    setPdfError("");
    setState({ kind: "loading" });
    const result = await loadPublicShare(validToken);
    if (result === "unavailable") setState({ kind: "unavailable" });
    else if ("retryable" in result) setState({ kind: "error" });
    else setState({ kind: "ready", payload: result.payload });
  }, [validToken]);

  useEffect(() => {
    if (!validToken) return;
    let cancelled = false;
    void loadPublicShare(validToken).then((result) => {
      if (cancelled) return;
      if (result === "unavailable") setState({ kind: "unavailable" });
      else if ("retryable" in result) setState({ kind: "error" });
      else setState({ kind: "ready", payload: result.payload });
    });
    return () => {
      cancelled = true;
    };
  }, [validToken]);

  const ready = state.kind === "ready" ? state.payload : null;
  const doc = ready?.doc;
  const title = doc
    ? `${isQuote(doc.kind) ? "Quote" : "Tax Invoice"} ${doc.number || ""}`.trim()
    : "Document";

  useEffect(() => {
    document.title = title;
  }, [title]);

  const chip = ready ? publicStatusChip(ready.status) : null;
  const issueDate = doc?.issueDate ? formatDate(doc.issueDate) : "";
  const logo = doc?.logoDataUrl || doc?.business.logoDataUrl;
  const contact = useMemo(() => {
    if (!doc) return "";
    return [doc.business.email, doc.business.phone].filter(Boolean).join(" · ");
  }, [doc]);

  async function onDownload() {
    if (!doc) return;
    setPdfBusy(true);
    setPdfError("");
    try {
      await downloadInvoicePdf(doc);
    } catch {
      setPdfError(COPY.pdfFail);
    } finally {
      setPdfBusy(false);
    }
  }

  if (state.kind === "loading") {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center px-4">
        <p className="text-sm text-[var(--muted)]">Loading document…</p>
      </main>
    );
  }

  if (state.kind === "unavailable") {
    return (
      <EmptyState title={COPY.unavailableTitle} body={COPY.unavailableBody} />
    );
  }

  if (state.kind === "error" || !doc || !ready) {
    return (
      <EmptyState
        title="Couldn’t load this document"
        body={COPY.loadFail}
        action={
          <Button type="button" onClick={() => void load()}>
            Retry
          </Button>
        }
      />
    );
  }

  const noun = isQuote(documentKind(doc.kind)) ? "Quote" : "Tax Invoice";

  return (
    <div className="flex min-h-[100dvh] flex-col bg-transparent">
      <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col px-[max(1rem,env(safe-area-inset-left))] pb-[max(6.5rem,env(safe-area-inset-bottom))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(1rem,env(safe-area-inset-top))]">
        <header className="mb-4 border-b border-[var(--line)] pb-4">
          <div className="flex items-start gap-3">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logo}
                alt=""
                className="h-10 w-10 shrink-0 rounded-md object-contain"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="font-[family-name:var(--font-display)] text-xl leading-tight text-[var(--ink)]">
                {doc.business.name || "Document"}
              </p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                {noun}
              </p>
              <p className="mt-0.5 text-sm text-[var(--muted)]">
                {[doc.number, issueDate].filter(Boolean).join(" · ")}
              </p>
            </div>
            {chip ? (
              <span className="inline-flex shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-medium text-emerald-900">
                {chip}
              </span>
            ) : null}
          </div>
        </header>

        <div className="overflow-x-clip rounded-xl border border-[var(--line)] bg-[var(--panel)] p-2 shadow-sm sm:p-3">
          <InvoiceStage minScale={0.2} maxScale={1}>
            <InvoicePreview doc={doc} />
          </InvoiceStage>
        </div>

        <footer className="mt-6 space-y-2 text-center text-xs text-[var(--muted)]">
          {contact ? <p>Questions? Contact {contact}</p> : null}
          <p>{COPY.privacy}</p>
        </footer>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--line)] bg-[var(--panel)]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[720px] flex-col gap-1 px-[max(1rem,env(safe-area-inset-left))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pr-[max(1rem,env(safe-area-inset-right))] pt-3">
          {/* P0-6: Pay now slot reserved — do not ship a dead button. */}
          <Button type="button" onClick={() => void onDownload()} disabled={pdfBusy}>
            {pdfBusy ? "Preparing PDF…" : COPY.download}
          </Button>
          {pdfError ? (
            <p className="text-center text-sm text-red-700" role="alert">
              {pdfError}
            </p>
          ) : null}
          <p className="text-center text-[11px] text-[var(--muted)]">{COPY.powered}</p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[720px] flex-col justify-center px-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))]">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
        {title}
      </h1>
      <p className="mt-2 max-w-md text-sm text-[var(--muted)]">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </main>
  );
}

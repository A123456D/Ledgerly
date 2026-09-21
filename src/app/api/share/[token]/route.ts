import { NextResponse } from "next/server";
import {
  deleteHostedShare,
  getHostedShare,
  putHostedShare,
} from "@/lib/share-host";
import { isShareToken, parseSharePayload } from "@/lib/share-link";

export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "private, no-store" };

function sameOriginMutate(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(req.url).origin;
  } catch {
    return false;
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!isShareToken(token)) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: NO_STORE });
  }
  const json = await getHostedShare(token);
  if (!json) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: NO_STORE });
  }
  return new NextResponse(json, {
    status: 200,
    headers: { ...NO_STORE, "Content-Type": "application/json" },
  });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  if (!sameOriginMutate(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { token } = await params;
  if (!isShareToken(token)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const payload = parseSharePayload(raw);
  if (!payload) {
    return NextResponse.json({ error: "Invalid snapshot" }, { status: 400 });
  }
  try {
    await putHostedShare(token, JSON.stringify(payload));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save";
    const status = message === "Share is too large" ? 413 : 500;
    return NextResponse.json({ error: message }, { status });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  if (!sameOriginMutate(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { token } = await params;
  if (!isShareToken(token)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await deleteHostedShare(token);
  return NextResponse.json({ ok: true });
}

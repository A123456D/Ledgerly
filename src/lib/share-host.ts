import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { isShareToken } from "@/lib/share-link";

const MAX_BYTES = 4_000_000;
const mem = new Map<string, string>();

function storeDir() {
  return process.env.SHARE_STORE_DIR || path.join(os.tmpdir(), "easyledger-shares");
}

function fileFor(token: string): string {
  if (!isShareToken(token)) throw new Error("Invalid token");
  return path.join(storeDir(), `${token}.json`);
}

export async function putHostedShare(token: string, json: string): Promise<void> {
  if (!isShareToken(token)) throw new Error("Invalid token");
  if (Buffer.byteLength(json, "utf8") > MAX_BYTES) {
    throw new Error("Share is too large");
  }
  mem.set(token, json);
  const dir = storeDir();
  await mkdir(dir, { recursive: true });
  await writeFile(fileFor(token), json, "utf8");
}

export async function getHostedShare(token: string): Promise<string | null> {
  if (!isShareToken(token)) return null;
  const hit = mem.get(token);
  if (hit) return hit;
  try {
    const json = await readFile(fileFor(token), "utf8");
    mem.set(token, json);
    return json;
  } catch {
    return null;
  }
}

export async function deleteHostedShare(token: string): Promise<void> {
  if (!isShareToken(token)) return;
  mem.delete(token);
  try {
    await unlink(fileFor(token));
  } catch {
    /* already gone */
  }
}

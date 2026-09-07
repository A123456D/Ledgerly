/** Prefix public asset paths when embedded under SKITZ (`/apps/easyledger/web`). */
export function assetUrl(path: string): string {
  const base = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

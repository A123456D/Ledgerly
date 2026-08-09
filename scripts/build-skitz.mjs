/**
 * Build a static Ledgerly export for embedding under the SKITZ Apps catalog.
 * Output: ../skitz-site/website/public/apps/ledgerly/web
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const basePath = "/apps/ledgerly/web";
const apiDir = path.join(root, "src", "app", "api");
const apiPark = path.join(root, "src", "app", "_api_parked_for_export");
const outDir = path.join(root, "out");
const dest = path.resolve(root, "..", "skitz-site", "website", "public", "apps", "ledgerly", "web");

function run(cmd, args, env = {}) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, ...env },
  });
  if (r.status !== 0) process.exit(r.status || 1);
}

if (fs.existsSync(apiDir)) {
  if (fs.existsSync(apiPark)) fs.rmSync(apiPark, { recursive: true, force: true });
  fs.cpSync(apiDir, apiPark, { recursive: true });
  fs.rmSync(apiDir, { recursive: true, force: true });
}

try {
  run("npx", ["next", "build"], {
    SKITZ_BASE_PATH: basePath,
    NEXT_PUBLIC_BASE_PATH: basePath,
  });
} finally {
  if (fs.existsSync(apiPark)) {
    if (fs.existsSync(apiDir)) fs.rmSync(apiDir, { recursive: true, force: true });
    fs.cpSync(apiPark, apiDir, { recursive: true });
    fs.rmSync(apiPark, { recursive: true, force: true });
  }
}

if (!fs.existsSync(outDir)) {
  console.error("Missing out/ after export build");
  process.exit(1);
}

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(outDir, dest, { recursive: true });
console.log("Copied static app →", dest);

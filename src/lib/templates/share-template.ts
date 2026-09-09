import { uid } from "@/lib/format";
import {
  buildSharePack,
  packToCustomTemplate,
  parseSharePack,
  type SharedTemplatePack,
} from "@/lib/templates/share-pack";
import type { CustomTemplate } from "@/lib/types";
import { supportsWebShare } from "@/lib/pdf/download";

export function sharePackFilename(name: string) {
  const slug = (name || "template")
    .toLowerCase()
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${slug || "template"}.easyledger.json`;
}

export function sharePackToFile(pack: SharedTemplatePack): File {
  const body = JSON.stringify(pack, null, 2);
  return new File([body], sharePackFilename(pack.name), {
    type: "application/json",
  });
}

export function downloadSharePack(pack: SharedTemplatePack) {
  const file = sharePackToFile(pack);
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(url);
}

export async function shareDesignTemplate(
  template: CustomTemplate,
): Promise<"shared" | "downloaded"> {
  const pack = buildSharePack(template);
  const file = sharePackToFile(pack);

  if (supportsWebShare()) {
    try {
      const canFiles =
        typeof navigator.canShare !== "function" ||
        navigator.canShare({ files: [file] });
      if (canFiles) {
        await navigator.share({
          files: [file],
          title: pack.name,
          text: "Easy Ledger layout template — colours and placement only, no business details.",
        });
        return "shared";
      }
      await navigator.share({
        title: pack.name,
        text: "Easy Ledger layout template — import this .easyledger.json file in Templates.",
      });
      downloadSharePack(pack);
      return "downloaded";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
    }
  }

  downloadSharePack(pack);
  return "downloaded";
}

export async function readSharedTemplateFile(file: File): Promise<CustomTemplate> {
  if (file.size > 250_000) {
    throw new Error("Template file is too large");
  }
  const text = await file.text();
  const pack = parseSharePack(text);
  return packToCustomTemplate(pack, uid("tmpl"));
}

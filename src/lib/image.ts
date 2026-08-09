/** Resize / compress an image file to a data URL suitable for IndexedDB. */
export async function fileToDataUrl(
  file: File,
  options?: { maxEdge?: number; quality?: number; maxBytes?: number },
): Promise<string> {
  const maxEdge = options?.maxEdge ?? 1600;
  const quality = options?.quality ?? 0.85;
  const maxBytes = options?.maxBytes ?? 1_800_000;

  if (!file.type.startsWith("image/")) {
    throw new Error("Please upload an image (PNG, JPG, or WebP)");
  }
  if (file.size > 12_000_000) {
    throw new Error("File is too large (max 12MB). Export a smaller image from Canva.");
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process image");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  let q = quality;
  let dataUrl = canvas.toDataURL("image/jpeg", q);
  while (dataUrl.length > maxBytes * 1.37 && q > 0.45) {
    q -= 0.1;
    dataUrl = canvas.toDataURL("image/jpeg", q);
  }
  if (dataUrl.length > maxBytes * 1.37) {
    throw new Error("Image is still too large after compression. Try a simpler export.");
  }
  return dataUrl;
}

/** Sample a rough dominant accent from the upper portion of an image (letterhead). */
export async function extractAccentColor(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const sampleW = 40;
      const sampleH = 24;
      canvas.width = sampleW;
      canvas.height = sampleH;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve("#0f766e");
        return;
      }
      ctx.drawImage(img, 0, 0, sampleW, sampleH);
      const { data } = ctx.getImageData(0, 0, sampleW, sampleH);
      const buckets = new Map<string, { n: number; r: number; g: number; b: number }>();
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        if (a < 200) continue;
        // skip near-white / near-black
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        if (lum > 245 || lum < 18) continue;
        const key = `${Math.round(r / 24)}_${Math.round(g / 24)}_${Math.round(b / 24)}`;
        const cur = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 };
        cur.n += 1;
        cur.r += r;
        cur.g += g;
        cur.b += b;
        buckets.set(key, cur);
      }
      let best = { n: 0, r: 15, g: 118, b: 110 };
      for (const v of buckets.values()) {
        if (v.n > best.n) best = v;
      }
      const r = Math.round(best.r / Math.max(1, best.n));
      const g = Math.round(best.g / Math.max(1, best.n));
      const b = Math.round(best.b / Math.max(1, best.n));
      resolve(
        `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`,
      );
    };
    img.onerror = () => resolve("#0f766e");
    img.src = dataUrl;
  });
}

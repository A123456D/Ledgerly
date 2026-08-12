/** Resize / compress an image file to a data URL suitable for IndexedDB. */
export async function fileToDataUrl(
  file: File,
  options?: {
    maxEdge?: number;
    quality?: number;
    maxBytes?: number;
    /** Prefer PNG (keeps transparency — best for logos). */
    preferPng?: boolean;
  },
): Promise<string> {
  const maxEdge = options?.maxEdge ?? 1600;
  const quality = options?.quality ?? 0.85;
  const maxBytes = options?.maxBytes ?? 1_800_000;
  const preferPng = options?.preferPng ?? file.type === "image/png";

  if (!file.type.startsWith("image/")) {
    throw new Error("Please upload an image (PNG, JPG, or WebP)");
  }
  if (file.size > 12_000_000) {
    throw new Error("File is too large (max 12MB). Try a smaller image.");
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

  if (preferPng) {
    const png = canvas.toDataURL("image/png");
    if (png.length <= maxBytes * 1.37) return png;
    // Fall through to JPEG if PNG is huge
  }

  let q = quality;
  let dataUrl = canvas.toDataURL("image/jpeg", q);
  while (dataUrl.length > maxBytes * 1.37 && q > 0.45) {
    q -= 0.1;
    dataUrl = canvas.toDataURL("image/jpeg", q);
  }
  if (dataUrl.length > maxBytes * 1.37) {
    throw new Error("Image is still too large after compression. Try a simpler file.");
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

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = dataUrl;
  });
}

function colorDist(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Offline logo background remover.
 * Samples corner pixels as the background color and makes similar pixels transparent.
 * Works best on logos with a solid (or near-solid) backdrop.
 */
export async function removeImageBackground(
  dataUrl: string,
  options?: { tolerance?: number; maxEdge?: number },
): Promise<string> {
  const tolerance = options?.tolerance ?? 42;
  const maxEdge = options?.maxEdge ?? 1000;
  const img = await loadImage(dataUrl);

  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not process image");
  ctx.drawImage(img, 0, 0, w, h);

  const imageData = ctx.getImageData(0, 0, w, h);
  const { data } = imageData;

  // Sample corners + edge midpoints for background color
  const samples: Array<[number, number]> = [
    [2, 2],
    [w - 3, 2],
    [2, h - 3],
    [w - 3, h - 3],
    [Math.floor(w / 2), 2],
    [Math.floor(w / 2), h - 3],
    [2, Math.floor(h / 2)],
    [w - 3, Math.floor(h / 2)],
  ];

  let sr = 0;
  let sg = 0;
  let sb = 0;
  let sn = 0;
  for (const [x, y] of samples) {
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const i = (y * w + x) * 4;
    if (data[i + 3] < 20) continue;
    sr += data[i];
    sg += data[i + 1];
    sb += data[i + 2];
    sn += 1;
  }
  if (sn === 0) {
    // Already transparent-ish — return PNG as-is
    return canvas.toDataURL("image/png");
  }
  const br = Math.round(sr / sn);
  const bg = Math.round(sg / sn);
  const bb = Math.round(sb / sn);

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 10) continue;
    const d = colorDist(data[i], data[i + 1], data[i + 2], br, bg, bb);
    if (d <= tolerance) {
      // Soft edge: fade near the tolerance boundary
      const fade = Math.max(0, 1 - d / Math.max(1, tolerance));
      data[i + 3] = Math.round(a * (1 - fade * fade));
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

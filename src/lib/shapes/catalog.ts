/** SVG path helpers — all shapes use a 0 0 100 100 viewBox. */

export function polygonPath(
  sides: number,
  cx = 50,
  cy = 50,
  r = 45,
): string {
  const pts: string[] = [];
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2 - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M ${pts.join(" L ")} Z`;
}

export function starPath(
  points: number,
  cx = 50,
  cy = 50,
  outer = 45,
  inner = 18,
): string {
  const pts: string[] = [];
  const total = points * 2;
  for (let i = 0; i < total; i++) {
    const a = (i / total) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? outer : inner;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M ${pts.join(" L ")} Z`;
}

export function arrowPath(dir: "up" | "down" | "left" | "right"): string {
  const m: Record<string, string> = {
    up: "M50 8 L92 55 L68 55 L68 92 L32 92 L32 55 L8 55 Z",
    down: "M50 92 L92 45 L68 45 L68 8 L32 8 L32 45 L8 45 Z",
    left: "M8 50 L55 8 L55 32 L92 32 L92 68 L55 68 L55 92 Z",
    right: "M92 50 L45 8 L45 32 L8 32 L8 68 L45 68 L45 92 Z",
  };
  return m[dir];
}

export function chevronPath(dir: "up" | "down" | "left" | "right"): string {
  const m: Record<string, string> = {
    up: "M10 65 L50 25 L90 65 L75 65 L50 40 L25 65 Z",
    down: "M10 35 L50 75 L90 35 L75 35 L50 60 L25 35 Z",
    left: "M65 10 L25 50 L65 90 L65 75 L40 50 L65 25 Z",
    right: "M35 10 L75 50 L35 90 L35 75 L60 50 L35 25 Z",
  };
  return m[dir];
}

export function blobPath(seed: number): string {
  const n = 8;
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const wobble = 0.72 + 0.28 * Math.sin(seed * 3.7 + i * 1.9);
    const r = 42 * wobble;
    pts.push(`${(50 + r * Math.cos(a)).toFixed(1)},${(50 + r * Math.sin(a)).toFixed(1)}`);
  }
  return `M ${pts.join(" L ")} Z`;
}

export function gearPath(teeth: number): string {
  const outer = 45;
  const inner = 32;
  const pts: string[] = [];
  const total = teeth * 2;
  for (let i = 0; i < total; i++) {
    const a = (i / total) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? outer : inner;
    pts.push(`${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M ${pts.join(" L ")} Z`;
}

export type ShapeCategory =
  | "basic"
  | "polygon"
  | "star"
  | "arrow"
  | "line"
  | "symbol"
  | "frame"
  | "badge"
  | "wave"
  | "organic";

export interface ShapeDefinition {
  id: string;
  name: string;
  category: ShapeCategory;
  path: string;
  /** Render as stroke-only (lines, frames) */
  strokeOnly?: boolean;
  /** Default fill when added to invoice */
  defaultFill?: string;
}

function buildCatalog(): ShapeDefinition[] {
  const shapes: ShapeDefinition[] = [];

  const add = (s: ShapeDefinition) => shapes.push(s);

  // ── Basic (12) ──
  add({ id: "rect", name: "Rectangle", category: "basic", path: "M8 20 L92 20 L92 80 L8 80 Z" });
  add({ id: "round-rect", name: "Rounded rect", category: "basic", path: "M8 20 Q8 8 20 8 L80 8 Q92 8 92 20 L92 80 Q92 92 80 92 L20 92 Q8 92 8 80 Z" });
  add({ id: "circle", name: "Circle", category: "basic", path: "M50 5 A45 45 0 1 1 49.99 5 Z" });
  add({ id: "ellipse", name: "Ellipse", category: "basic", path: "M50 15 A40 30 0 1 1 49.99 15 Z" });
  add({ id: "pill", name: "Pill", category: "basic", path: "M20 30 A20 20 0 0 1 20 70 L80 70 A20 20 0 0 1 80 30 Z" });
  add({ id: "ring", name: "Ring", category: "basic", path: "M50 5 A45 45 0 1 1 49.99 5 Z M50 20 A30 30 0 1 0 50.01 20 Z", strokeOnly: true });
  add({ id: "semicircle", name: "Semicircle", category: "basic", path: "M10 55 A40 40 0 0 1 90 55 L10 55 Z" });
  add({ id: "triangle-up", name: "Triangle up", category: "basic", path: polygonPath(3) });
  add({ id: "diamond", name: "Diamond", category: "basic", path: "M50 5 L95 50 L50 95 L5 50 Z" });
  add({ id: "parallelogram", name: "Parallelogram", category: "basic", path: "M22 20 L92 20 L78 80 L8 80 Z" });
  add({ id: "trapezoid", name: "Trapezoid", category: "basic", path: "M25 25 L75 25 L95 75 L5 75 Z" });
  add({ id: "cross-plate", name: "Plus plate", category: "basic", path: "M35 8 L65 8 L65 35 L92 35 L92 65 L65 65 L65 92 L35 92 L35 65 L8 65 L8 35 L35 35 Z" });
  add({ id: "sidebar-fill", name: "Sidebar panel", category: "basic", path: "M0 0 L100 0 L100 100 L0 100 Z" });
  add({ id: "slant-band", name: "Slant header band", category: "badge", path: "M0 0 L100 0 L100 78 L0 100 Z" });
  add({ id: "wash-band", name: "Soft top wash", category: "wave", path: "M0 25 Q50 5 100 25 L100 100 L0 100 Z" });
  add({ id: "card-shell", name: "Rounded card", category: "frame", path: "M8 8 L92 8 Q96 8 96 12 L96 88 Q96 92 92 92 L8 92 Q4 92 4 88 L4 12 Q4 8 8 8 Z", strokeOnly: true });
  add({ id: "header-block", name: "Header block", category: "basic", path: "M0 0 L100 0 L100 100 L0 100 Z" });
  add({ id: "accent-dot-row", name: "Accent dots", category: "line", path: "M12 50 A4 4 0 1 1 12.01 50 M50 50 A4 4 0 1 1 50.01 50 M88 50 A4 4 0 1 1 88.01 50" });
  add({ id: "luxury-rule", name: "Luxury rule", category: "line", path: "M10 50 L40 50 M60 50 L90 50 M45 50 Q50 42 55 50 Q50 58 45 50", strokeOnly: true });

  // ── Polygons (10) ──
  for (let n = 3; n <= 12; n++) {
    add({
      id: `polygon-${n}`,
      name: `${n}-gon`,
      category: "polygon",
      path: polygonPath(n),
    });
  }

  // ── Stars (9) ──
  for (let p = 4; p <= 12; p++) {
    add({
      id: `star-${p}`,
      name: `${p}-point star`,
      category: "star",
      path: starPath(p),
    });
  }

  // ── Arrows (12) ──
  for (const dir of ["up", "down", "left", "right"] as const) {
    add({ id: `arrow-${dir}`, name: `Arrow ${dir}`, category: "arrow", path: arrowPath(dir) });
  }
  add({ id: "arrow-double-h", name: "Double arrow ↔", category: "arrow", path: "M8 50 L35 25 L35 40 L65 40 L65 25 L92 50 L65 75 L65 60 L35 60 L35 75 Z" });
  add({ id: "arrow-double-v", name: "Double arrow ↕", category: "arrow", path: "M50 8 L75 35 L60 35 L60 65 L75 65 L50 92 L25 65 L40 65 L40 35 L25 35 Z" });
  add({ id: "arrow-curved", name: "Curved arrow", category: "arrow", path: "M15 75 Q15 15 75 15 L75 30 Q30 30 30 75 Z M65 8 L92 15 L75 35 Z", strokeOnly: true });
  add({ id: "arrow-return", name: "Return arrow", category: "arrow", path: "M85 25 L85 65 Q85 85 50 85 L20 85 L35 70 M20 85 L35 100", strokeOnly: true });
  add({ id: "arrow-thick-right", name: "Thick arrow →", category: "arrow", path: "M5 35 L55 35 L55 15 L95 50 L55 85 L55 65 L5 65 Z" });

  // ── Chevrons (6) ──
  for (const dir of ["up", "down", "left", "right"] as const) {
    add({ id: `chevron-${dir}`, name: `Chevron ${dir}`, category: "arrow", path: chevronPath(dir) });
  }
  add({ id: "chevron-double-right", name: "Double chevron »", category: "arrow", path: "M15 10 L55 50 L15 90 M45 10 L85 50 L45 90", strokeOnly: true });

  // ── Lines & dividers (14) ──
  add({ id: "line-h", name: "Line horizontal", category: "line", path: "M5 50 L95 50", strokeOnly: true });
  add({ id: "line-v", name: "Line vertical", category: "line", path: "M50 5 L50 95", strokeOnly: true });
  add({ id: "line-diag", name: "Line diagonal", category: "line", path: "M10 90 L90 10", strokeOnly: true });
  add({ id: "line-dashed-h", name: "Dashed line", category: "line", path: "M5 50 L25 50 M35 50 L55 50 M65 50 L85 50", strokeOnly: true });
  add({ id: "line-cross", name: "Cross lines", category: "line", path: "M50 5 L50 95 M5 50 L95 50", strokeOnly: true });
  add({ id: "line-x", name: "X lines", category: "line", path: "M10 10 L90 90 M90 10 L10 90", strokeOnly: true });
  add({ id: "divider-ornate", name: "Ornate divider", category: "line", path: "M5 50 L35 50 M40 50 Q50 35 60 50 M65 50 L95 50", strokeOnly: true });
  add({ id: "divider-dots", name: "Dot divider", category: "line", path: "M10 50 A3 3 0 1 1 10.01 50 M30 50 A3 3 0 1 1 30.01 50 M50 50 A3 3 0 1 1 50.01 50 M70 50 A3 3 0 1 1 70.01 50 M90 50 A3 3 0 1 1 90.01 50" });
  add({ id: "divider-flourish", name: "Flourish", category: "line", path: "M5 50 Q25 30 50 50 Q75 70 95 50", strokeOnly: true });
  add({ id: "bracket-square", name: "Square brackets", category: "line", path: "M25 10 L10 10 L10 90 L25 90 M75 10 L90 10 L90 90 L75 90", strokeOnly: true });
  add({ id: "bracket-curly", name: "Curly brackets", category: "line", path: "M30 10 Q15 10 15 50 Q15 90 30 90 M70 10 Q85 10 85 50 Q85 90 70 90", strokeOnly: true });
  add({ id: "bracket-angle", name: "Angle brackets", category: "line", path: "M35 10 L15 50 L35 90 M65 10 L85 50 L65 90", strokeOnly: true });
  add({ id: "line-bracket-h", name: "Horizontal brackets", category: "line", path: "M10 25 L10 10 L90 10 L90 25 M10 75 L10 90 L90 90 L90 75", strokeOnly: true });
  add({ id: "line-underline", name: "Underline swoosh", category: "line", path: "M10 60 Q50 80 90 60", strokeOnly: true });

  // ── Symbols (18) ──
  add({ id: "heart", name: "Heart", category: "symbol", path: "M50 88 C20 60 5 40 25 22 C38 12 50 28 50 28 C50 28 62 12 75 22 C95 40 80 60 50 88 Z" });
  add({ id: "cross", name: "Cross", category: "symbol", path: "M35 8 L65 8 L65 35 L92 35 L92 65 L65 65 L65 92 L35 92 L35 65 L8 65 L8 35 L35 35 Z" });
  add({ id: "plus", name: "Plus", category: "symbol", path: "M40 8 L60 8 L60 40 L92 40 L92 60 L60 60 L60 92 L40 92 L40 60 L8 60 L8 40 L40 40 Z" });
  add({ id: "minus", name: "Minus", category: "symbol", path: "M8 42 L92 42 L92 58 L8 58 Z" });
  add({ id: "check", name: "Check", category: "symbol", path: "M15 52 L38 75 L85 22 L72 12 L38 52 L25 42 Z" });
  add({ id: "x-mark", name: "X mark", category: "symbol", path: "M20 20 L45 45 L20 70 L30 80 L55 55 L80 80 L90 70 L65 45 L90 20 L80 10 L55 35 L30 10 Z" });
  add({ id: "infinity", name: "Infinity", category: "symbol", path: "M25 50 Q25 20 50 35 Q75 50 75 50 Q75 80 50 65 Q25 50 25 50 Z", strokeOnly: true });
  add({ id: "lightning", name: "Lightning", category: "symbol", path: "M55 5 L25 52 L48 52 L35 95 L75 42 L52 42 Z" });
  add({ id: "shield", name: "Shield", category: "symbol", path: "M50 5 L88 18 L88 48 Q88 78 50 95 Q12 78 12 48 L12 18 Z" });
  add({ id: "anchor", name: "Anchor", category: "symbol", path: "M50 8 A12 12 0 1 1 49.99 8 M50 20 L50 70 M30 55 Q50 85 70 55 M20 55 L20 65 Q50 95 80 65 L80 55", strokeOnly: true });
  add({ id: "flag", name: "Flag", category: "symbol", path: "M22 8 L22 92 M22 8 L78 8 L65 28 L78 48 L22 48 Z" });
  add({ id: "peace", name: "Peace", category: "symbol", path: "M50 8 L50 92 M50 35 L22 65 M50 35 L78 65 M50 8 L22 35 M50 8 L78 35", strokeOnly: true });
  add({ id: "yin-yang", name: "Yin yang", category: "symbol", path: "M50 5 A45 45 0 1 1 50 95 A22.5 22.5 0 1 0 50 50 A22.5 22.5 0 1 1 50 5 M50 28 A6 6 0 1 1 49.99 28 M50 72 A6 6 0 1 0 50.01 72" });
  add({ id: "sun", name: "Sun", category: "symbol", path: "M50 28 A22 22 0 1 1 49.99 28 M50 5 L50 15 M50 85 L50 95 M5 50 L15 50 M85 50 L95 50 M18 18 L25 25 M75 75 L82 82 M82 18 L75 25 M25 75 L18 82", strokeOnly: true });
  add({ id: "moon", name: "Moon", category: "symbol", path: "M65 8 A38 38 0 1 1 35 92 A28 28 0 1 0 65 8 Z" });
  add({ id: "star-burst", name: "Burst", category: "symbol", path: starPath(16, 50, 50, 45, 38) });
  add({ id: "target", name: "Target", category: "symbol", path: "M50 5 A45 45 0 1 1 49.99 5 M50 18 A32 32 0 1 1 49.99 18 M50 32 A18 18 0 1 1 49.99 32 M50 44 A6 6 0 1 1 49.99 44", strokeOnly: true });
  add({ id: "percent", name: "Percent", category: "symbol", path: "M25 25 A12 12 0 1 1 24.99 25 M75 75 A12 12 0 1 1 74.99 75 M78 22 L22 78", strokeOnly: true });

  // ── Frames (10) ──
  add({ id: "frame-full", name: "Full frame", category: "frame", path: "M5 5 L95 5 L95 95 L5 95 Z M12 12 L12 88 L88 88 L88 12 Z", strokeOnly: true });
  add({ id: "frame-double", name: "Double frame", category: "frame", path: "M5 5 L95 5 L95 95 L5 95 Z M10 10 L10 90 L90 90 L90 10 Z M15 15 L15 85 L85 85 L85 15 Z", strokeOnly: true });
  add({ id: "frame-circle", name: "Circle frame", category: "frame", path: "M50 5 A45 45 0 1 1 49.99 5 M50 12 A38 38 0 1 0 50.01 12", strokeOnly: true });
  add({ id: "corner-tl", name: "Corner TL", category: "frame", path: "M5 35 L5 5 L35 5 M5 5 L25 5 M5 5 L5 25", strokeOnly: true });
  add({ id: "corner-tr", name: "Corner TR", category: "frame", path: "M65 5 L95 5 L95 35 M95 5 L95 25 M95 5 L75 5", strokeOnly: true });
  add({ id: "corner-bl", name: "Corner BL", category: "frame", path: "M5 65 L5 95 L35 95 M5 95 L5 75 M5 95 L25 95", strokeOnly: true });
  add({ id: "corner-br", name: "Corner BR", category: "frame", path: "M95 65 L95 95 L65 95 M95 95 L95 75 M95 95 L75 95", strokeOnly: true });
  add({ id: "frame-dashed", name: "Dashed frame", category: "frame", path: "M8 8 L92 8 M92 8 L92 92 M92 92 L8 92 M8 92 L8 8", strokeOnly: true });
  add({ id: "frame-ornate", name: "Ornate frame", category: "frame", path: "M5 15 Q5 5 15 5 L85 5 Q95 5 95 15 L95 85 Q95 95 85 95 L15 95 Q5 95 5 85 Z", strokeOnly: true });
  add({ id: "frame-cross", name: "Cross frame", category: "frame", path: "M5 5 L95 95 M95 5 L5 95 M5 5 L95 5 L95 95 L5 95 Z", strokeOnly: true });

  // ── Badges (10) ──
  add({ id: "ribbon", name: "Ribbon", category: "badge", path: "M10 25 L90 25 L90 55 L72 55 L50 75 L28 55 L10 55 Z" });
  add({ id: "banner", name: "Banner", category: "badge", path: "M5 35 L95 35 L88 50 L95 65 L5 65 L12 50 Z" });
  add({ id: "tag", name: "Price tag", category: "badge", path: "M8 20 L72 20 L92 50 L72 80 L8 80 Z M22 35 A8 8 0 1 1 21.99 35" });
  add({ id: "seal", name: "Wax seal", category: "badge", path: "M50 8 L58 28 L80 28 L63 42 L70 62 L50 50 L30 62 L37 42 L20 28 L42 28 Z" });
  add({ id: "rosette", name: "Rosette", category: "badge", path: starPath(12, 50, 50, 42, 30) });
  add({ id: "medal", name: "Medal", category: "badge", path: "M35 5 L50 20 L65 5 L58 35 L92 35 L68 55 L78 88 L50 68 L22 88 L32 55 L8 35 L42 35 Z" });
  add({ id: "bookmark", name: "Bookmark", category: "badge", path: "M25 5 L75 5 L75 85 L50 68 L25 85 Z" });
  add({ id: "stamp", name: "Stamp circle", category: "badge", path: "M50 8 A42 42 0 1 1 49.99 8 M50 18 A32 32 0 1 0 50.01 18", strokeOnly: true });
  add({ id: "badge-shield", name: "Badge shield", category: "badge", path: "M50 5 L85 20 L85 45 Q85 72 50 92 Q15 72 15 45 L15 20 Z" });
  add({ id: "ticket", name: "Ticket", category: "badge", path: "M8 25 L92 25 L92 75 L8 75 Z M8 42 A8 8 0 0 0 8 58 M92 42 A8 8 0 0 1 92 58" });

  // ── Waves & curves (10) ──
  add({ id: "wave-h", name: "Wave horizontal", category: "wave", path: "M5 50 Q20 30 35 50 Q50 70 65 50 Q80 30 95 50", strokeOnly: true });
  add({ id: "wave-v", name: "Wave vertical", category: "wave", path: "M50 5 Q30 20 50 35 Q70 50 50 65 Q30 80 50 95", strokeOnly: true });
  add({ id: "scallop", name: "Scallop", category: "wave", path: "M5 50 Q15 35 25 50 Q35 65 45 50 Q55 35 65 50 Q75 65 85 50 Q90 42 95 50", strokeOnly: true });
  add({ id: "zigzag-h", name: "Zigzag", category: "wave", path: "M5 55 L20 35 L35 55 L50 35 L65 55 L80 35 L95 55", strokeOnly: true });
  add({ id: "cloud", name: "Cloud", category: "wave", path: "M25 65 Q10 65 10 50 Q10 35 28 32 Q35 15 55 18 Q72 8 82 25 Q95 28 92 45 Q95 65 75 65 L25 65 Z" });
  add({ id: "splash", name: "Splash", category: "wave", path: starPath(8, 50, 50, 45, 22) });
  add({ id: "spiral", name: "Spiral", category: "wave", path: "M50 50 Q70 50 70 30 Q70 10 50 10 Q20 10 20 50 Q20 90 60 90 Q90 90 90 60", strokeOnly: true });
  add({ id: "swoosh", name: "Swoosh", category: "wave", path: "M5 70 Q40 20 95 40", strokeOnly: true });
  add({ id: "hill", name: "Hills", category: "wave", path: "M5 70 Q25 40 45 70 Q65 40 85 70 L95 70 L95 95 L5 95 Z" });
  add({ id: "drop", name: "Water drop", category: "wave", path: "M50 8 Q78 45 50 88 Q22 45 50 8 Z" });

  // ── Organic blobs (15) ──
  for (let i = 1; i <= 15; i++) {
    add({
      id: `blob-${i}`,
      name: `Blob ${i}`,
      category: "organic",
      path: blobPath(i),
    });
  }

  // ── Gears (4) ──
  for (const teeth of [6, 8, 12, 16]) {
    add({
      id: `gear-${teeth}`,
      name: `Gear ${teeth}T`,
      category: "symbol",
      path: gearPath(teeth),
    });
  }

  // ── Business icons (6) ──
  add({ id: "chart-bar", name: "Bar chart", category: "symbol", path: "M15 85 L15 45 L30 45 L30 85 M40 85 L40 25 L55 25 L55 85 M65 85 L65 55 L80 55 L80 85", strokeOnly: true });
  add({ id: "chart-pie", name: "Pie chart", category: "symbol", path: "M50 50 L50 10 A40 40 0 0 1 88 55 Z M50 50 L88 55 A40 40 0 1 1 15 60 Z" });
  add({ id: "dollar", name: "Dollar", category: "symbol", path: "M50 8 L50 92 M35 18 Q50 8 65 18 Q75 28 50 38 Q25 48 35 58 Q50 68 65 58 Q75 48 65 38", strokeOnly: true });
  add({ id: "euro", name: "Euro", category: "symbol", path: "M65 18 Q45 8 30 25 Q20 50 30 75 Q45 92 65 82 M22 35 L52 35 M22 65 L52 65", strokeOnly: true });
  add({ id: "doc", name: "Document", category: "symbol", path: "M28 8 L72 8 L82 22 L82 92 L18 92 L18 8 Z M72 8 L72 22 L82 22", strokeOnly: true });
  add({ id: "envelope", name: "Envelope", category: "symbol", path: "M8 28 L92 28 L92 82 L8 82 Z M8 28 L50 58 L92 28", strokeOnly: true });

  // ── Extra stars & bursts (6) ──
  add({ id: "sparkle", name: "Sparkle", category: "star", path: "M50 5 L54 42 L92 50 L54 58 L50 95 L46 58 L8 50 L46 42 Z" });
  add({ id: "sparkle-4", name: "4-sparkle", category: "star", path: "M50 8 L58 42 L92 50 L58 58 L50 92 L42 58 L8 50 L42 42 Z" });
  add({ id: "asterisk", name: "Asterisk", category: "star", path: "M50 8 L50 92 M8 50 L92 50 M18 18 L82 82 M82 18 L18 82", strokeOnly: true });
  add({ id: "snowflake", name: "Snowflake", category: "star", path: "M50 5 L50 95 M5 50 L95 50 M18 18 L82 82 M82 18 L18 82 M50 5 L35 20 M50 5 L65 20 M50 95 L35 80 M50 95 L65 80 M5 50 L20 35 M5 50 L20 65 M95 50 L80 35 M95 50 L80 65", strokeOnly: true });
  add({ id: "compass", name: "Compass", category: "symbol", path: "M50 5 A45 45 0 1 1 49.99 5 M50 15 L58 58 L50 50 L42 58 Z M50 85 L58 42 L50 50 L42 42 Z", strokeOnly: true });
  add({ id: "hex-grid", name: "Hex grid", category: "polygon", path: "M50 8 L78 24 L78 56 L50 72 L22 56 L22 24 Z M50 28 L65 38 L65 58 L50 68 L35 58 L35 38 Z", strokeOnly: true });

  // ── Text block (special) ──
  add({ id: "text-block", name: "Text box", category: "basic", path: "M8 15 L92 15 L92 85 L8 85 Z", strokeOnly: true });

  return shapes;
}

export const SHAPE_CATALOG = buildCatalog();

export const SHAPE_MAP = new Map(SHAPE_CATALOG.map((s) => [s.id, s]));

export const SHAPE_CATEGORIES: { id: ShapeCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "basic", label: "Basic" },
  { id: "polygon", label: "Polygons" },
  { id: "star", label: "Stars" },
  { id: "arrow", label: "Arrows" },
  { id: "line", label: "Lines" },
  { id: "symbol", label: "Symbols" },
  { id: "frame", label: "Frames" },
  { id: "badge", label: "Badges" },
  { id: "wave", label: "Waves" },
  { id: "organic", label: "Organic" },
];

export function getShape(id: string): ShapeDefinition | undefined {
  return SHAPE_MAP.get(id);
}

export function defaultDecoration(
  shapeId: string,
  accent: string,
  zIndex: number,
): Omit<import("@/lib/types").InvoiceDecoration, "id"> {
  const shape = getShape(shapeId);
  const strokeOnly = shape?.strokeOnly;
  return {
    shapeId,
    x: 35,
    y: 35,
    w: shapeId === "text-block" ? 30 : 18,
    h: shapeId === "text-block" ? 8 : 18,
    rotation: 0,
    opacity: strokeOnly ? 0.85 : 0.28,
    fill: strokeOnly ? "transparent" : accent,
    stroke: strokeOnly ? accent : "transparent",
    strokeWidth: strokeOnly ? 2.5 : 0,
    zIndex,
    text: shapeId === "text-block" ? "Your text" : undefined,
    fontSize: shapeId === "text-block" ? 4 : undefined,
    fontWeight: "bold",
  };
}

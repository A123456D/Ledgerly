import type { BuiltinTemplateId } from "@/lib/types";

export type PdfVariant = "classic" | "minimal" | "bold" | "dark" | "frame";

export interface TemplateMeta {
  id: BuiltinTemplateId;
  name: string;
  blurb: string;
  /** Which Canva-popular archetype we remix (original art only) */
  inspiredBy: string;
  category: "Essential" | "Creative" | "Corporate" | "Luxury";
  defaultAccent: string;
  paper: string;
  ink: string;
  pdfVariant: PdfVariant;
  shell: {
    header:
      | "split"
      | "band"
      | "left-bar"
      | "top-rule"
      | "centered"
      | "dark-band"
      | "frame";
    table: "underline" | "filled" | "zebra" | "cards";
  };
}

/**
 * Gallery mapped to the invoice styles that dominate Canva / Forma / Creative Market —
 * original layouts only (no Canva assets).
 */
export const BUILTIN_TEMPLATES: TemplateMeta[] = [
  {
    id: "classic",
    name: "Clean Warm",
    blurb: "Canva’s #1 vibe: airy white-cream page, clear bill-to, big Amount Due.",
    inspiredBy: "Minimal clean white invoices",
    category: "Essential",
    defaultAccent: "#0f766e",
    paper: "#fffcf7",
    ink: "#1c1917",
    pdfVariant: "classic",
    shell: { header: "split", table: "underline" },
  },
  {
    id: "minimal",
    name: "Swiss White",
    blurb: "Ultra-clean freelancer staple — tiny labels, hairlines, quiet totals.",
    inspiredBy: "Simple freelancer / minimal white",
    category: "Essential",
    defaultAccent: "#111111",
    paper: "#ffffff",
    ink: "#111111",
    pdfVariant: "minimal",
    shell: { header: "top-rule", table: "underline" },
  },
  {
    id: "bold",
    name: "Color Block",
    blurb: "Solid brand slab across the top + filled table — startup Canva classic.",
    inspiredBy: "Color-blocked modern / bold startup",
    category: "Essential",
    defaultAccent: "#2563eb",
    paper: "#ffffff",
    ink: "#0f172a",
    pdfVariant: "bold",
    shell: { header: "band", table: "filled" },
  },
  {
    id: "atelier",
    name: "Serif Editorial",
    blurb: "Elegant centered serif with ornamental rules — designer darling on Canva.",
    inspiredBy: "Elegant serif typography invoices",
    category: "Creative",
    defaultAccent: "#9a3412",
    paper: "#faf6f1",
    ink: "#292524",
    pdfVariant: "classic",
    shell: { header: "centered", table: "underline" },
  },
  {
    id: "nordic",
    name: "Corporate Blue",
    blurb: "Modern blue header energy, split meta, consulting-ready.",
    inspiredBy: "Modern blue corporate (Forma-style)",
    category: "Corporate",
    defaultAccent: "#0369a1",
    paper: "#f8fafc",
    ink: "#0f172a",
    pdfVariant: "minimal",
    shell: { header: "top-rule", table: "zebra" },
  },
  {
    id: "midnight",
    name: "Noir Glow",
    blurb: "Dark portfolio drama with luminous accent — creative Canva favorite.",
    inspiredBy: "Dark creative / black luxury variants",
    category: "Creative",
    defaultAccent: "#818cf8",
    paper: "#0b1020",
    ink: "#e2e8f0",
    pdfVariant: "dark",
    shell: { header: "dark-band", table: "filled" },
  },
  {
    id: "coral",
    name: "Soft Pastel",
    blurb: "Blush wash, rounded cards, pill number — lifestyle & beauty services.",
    inspiredBy: "Soft pastel service invoices",
    category: "Creative",
    defaultAccent: "#e11d48",
    paper: "#fff1f2",
    ink: "#1c1917",
    pdfVariant: "bold",
    shell: { header: "band", table: "cards" },
  },
  {
    id: "slate",
    name: "Consulting Grid",
    blurb: "Dense, trustworthy, mono dates — agency / consulting Canva staple.",
    inspiredBy: "Consulting business invoices",
    category: "Corporate",
    defaultAccent: "#334155",
    paper: "#ffffff",
    ink: "#0f172a",
    pdfVariant: "frame",
    shell: { header: "left-bar", table: "zebra" },
  },
  {
    id: "luxe",
    name: "Black & Gold",
    blurb: "Charcoal + champagne foil feel — Canva’s luxury bestseller pattern.",
    inspiredBy: "Black & gold luxury invoices",
    category: "Luxury",
    defaultAccent: "#c4a574",
    paper: "#14110f",
    ink: "#f5efe6",
    pdfVariant: "dark",
    shell: { header: "centered", table: "underline" },
  },
  {
    id: "meadow",
    name: "Pastel Sage",
    blurb: "Soft green wellness look with rounded info tiles.",
    inspiredBy: "Soft pastel / wellness service",
    category: "Creative",
    defaultAccent: "#4d7c5a",
    paper: "#f4f7f2",
    ink: "#1f2a22",
    pdfVariant: "classic",
    shell: { header: "split", table: "cards" },
  },
  {
    id: "ink",
    name: "Mono Punch",
    blurb: "High-contrast black frame + oversized INVOICE — editorial Canva energy.",
    inspiredBy: "Bold B&W / high-contrast templates",
    category: "Corporate",
    defaultAccent: "#000000",
    paper: "#ffffff",
    ink: "#000000",
    pdfVariant: "frame",
    shell: { header: "frame", table: "filled" },
  },
  {
    id: "studio",
    name: "Gradient Studio",
    blurb: "Asymmetric creative layout with warm accent — photographer / studio vibe.",
    inspiredBy: "Photography & creative gradient invoices",
    category: "Creative",
    defaultAccent: "#ea580c",
    paper: "#fafaf9",
    ink: "#1c1917",
    pdfVariant: "bold",
    shell: { header: "left-bar", table: "underline" },
  },
  {
    id: "harbor",
    name: "Forma Navy",
    blurb: "Tech-inspired navy band + brass total — Forma / agency Canva look.",
    inspiredBy: "Forma-style bold blue/navy systems",
    category: "Corporate",
    defaultAccent: "#1e3a5f",
    paper: "#f5f7fa",
    ink: "#0b1220",
    pdfVariant: "bold",
    shell: { header: "band", table: "zebra" },
  },
  {
    id: "parchment",
    name: "Heritage Statement",
    blurb: "Double-ruled traditional statement — legal / formal Canva classic.",
    inspiredBy: "Traditional / elegant statement invoices",
    category: "Luxury",
    defaultAccent: "#7c2d12",
    paper: "#f3e9d7",
    ink: "#3f2a1d",
    pdfVariant: "classic",
    shell: { header: "frame", table: "underline" },
  },
];

export function getBuiltinTemplate(id: string): TemplateMeta | undefined {
  return BUILTIN_TEMPLATES.find((t) => t.id === id);
}

export function isBuiltinTemplateId(id: string): id is BuiltinTemplateId {
  return BUILTIN_TEMPLATES.some((t) => t.id === id);
}

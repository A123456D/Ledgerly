import type { InvoiceDecoration } from "@/lib/types";
import { getShape } from "@/lib/shapes/catalog";

export function ShapeSvg({
  decoration,
  className = "",
}: {
  decoration: Pick<
    InvoiceDecoration,
    "shapeId" | "fill" | "stroke" | "strokeWidth" | "opacity"
  >;
  className?: string;
}) {
  const shape = getShape(decoration.shapeId);
  if (!shape) return null;

  const strokeOnly = shape.strokeOnly;
  const fill = strokeOnly ? "none" : decoration.fill;
  const stroke = strokeOnly ? decoration.stroke || decoration.fill : decoration.stroke;
  const sw = strokeOnly
    ? decoration.strokeWidth || 2.5
    : decoration.strokeWidth || 0;

  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        d={shape.path}
        fill={fill}
        stroke={sw > 0 ? stroke : "none"}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={decoration.opacity}
      />
    </svg>
  );
}

export function ShapeThumb({
  shapeId,
  accent = "#0f766e",
  size = 36,
}: {
  shapeId: string;
  accent?: string;
  size?: number;
}) {
  if (shapeId === "logo") {
    return (
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        aria-hidden
        className="mx-auto"
      >
        <rect x="12" y="22" width="76" height="56" rx="8" fill={accent} opacity={0.35} />
        <text x="50" y="58" textAnchor="middle" fill={accent} fontSize="28" fontWeight="bold">
          L
        </text>
      </svg>
    );
  }
  if (shapeId === "image") {
    return (
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        aria-hidden
        className="mx-auto"
      >
        <rect x="10" y="15" width="80" height="70" rx="6" fill={accent} opacity={0.2} stroke={accent} strokeWidth="3" />
        <circle cx="32" cy="38" r="8" fill={accent} opacity={0.7} />
        <path d="M10 72 L35 48 L55 65 L72 42 L90 72 Z" fill={accent} opacity={0.5} />
      </svg>
    );
  }

  const shape = getShape(shapeId);
  if (!shape) return null;
  const strokeOnly = shape.strokeOnly;
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden
      className="mx-auto"
    >
      <path
        d={shape.path}
        fill={strokeOnly ? "none" : accent}
        stroke={strokeOnly ? accent : "none"}
        strokeWidth={strokeOnly ? 4 : 0}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.9}
      />
    </svg>
  );
}

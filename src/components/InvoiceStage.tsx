"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

/**
 * Fits an A4 invoice sheet into the host width via transform: scale,
 * while reserving the post-scale layout box so nothing clips on the right.
 */
export function InvoiceStage({
  children,
  maxScale = 0.92,
  minScale = 0.35,
  className = "",
}: {
  children: ReactNode;
  maxScale?: number;
  minScale?: number;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const [natural, setNatural] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const host = hostRef.current;
    const sheet = sheetRef.current;
    if (!host || !sheet) return;

    const measure = () => {
      // offset* ignores transform — true pre-scale sheet size in CSS px
      const w = Math.max(sheet.offsetWidth, 1);
      const h = Math.max(sheet.offsetHeight, 1);
      const available = host.clientWidth;
      if (available <= 0) return;
      // 2px slack avoids subpixel overflow clipping in rounded parents
      const next = Math.min(maxScale, Math.max(minScale, (available - 2) / w));
      setNatural({ w, h });
      setScale(next);
    };

    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(host);
    ro.observe(sheet);
    return () => ro.disconnect();
  }, [maxScale, minScale]);

  const boxW = natural.w > 0 ? Math.floor(natural.w * scale) : undefined;
  const boxH = natural.h > 0 ? Math.floor(natural.h * scale) : undefined;

  return (
    <div ref={hostRef} className={`w-full min-w-0 ${className}`}>
      <div
        className="relative mx-auto"
        style={{
          width: boxW ?? "100%",
          height: boxH,
          maxWidth: "100%",
        }}
      >
        <div
          ref={sheetRef}
          data-invoice-stage-scaler="true"
          className="absolute left-0 top-0 origin-top-left"
          style={{
            width: `${A4_WIDTH_MM}mm`,
            minHeight: `${A4_HEIGHT_MM}mm`,
            transform: `scale(${scale})`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

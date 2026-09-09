"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { A4_HEIGHT_MM, A4_WIDTH_MM } from "@/lib/sheet-size";

/**
 * Fits an A4 invoice sheet into the host width via a GPU compositor
 * transform (translate3d + scale) so Chrome, Safari, and Android paint
 * the live preview on the GPU — not a Canvas 2D bitmap.
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
      // Round up so the scaled sheet isn't clipped by a short layout box
      const next = Math.min(maxScale, Math.max(minScale, (available - 2) / w));
      setNatural({ w, h });
      setScale(next);
    };

    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(host);
    ro.observe(sheet);
    return () => ro.disconnect();
  }, [maxScale, minScale, children]);

  const boxW = natural.w > 0 ? Math.ceil(natural.w * scale) : undefined;
  const boxH = natural.h > 0 ? Math.ceil(natural.h * scale) + 4 : undefined;

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
          className="absolute left-0 top-0 origin-top-left invoice-gpu-layer"
          style={{
            width: `${A4_WIDTH_MM}mm`,
            minHeight: `${A4_HEIGHT_MM}mm`,
            transform: `translate3d(0, 0, 0) scale(${scale})`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

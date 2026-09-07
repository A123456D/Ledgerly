"use client";

import {
  createContext,
  useContext,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { InvoiceDecoration } from "@/lib/types";
import {
  IMAGE_SHAPE_ID,
  LOGO_SHAPE_ID,
  isImageDecoration,
  isLogoDecoration,
} from "@/lib/decorations/logo-decoration";
import { ShapeSvg } from "@/lib/shapes/render";

export interface DecorationEditContextValue {
  editable: boolean;
  /** UI flag only (Design studio checkbox) — must not block section clicks */
  focusShapes: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdate: (id: string, patch: Partial<InvoiceDecoration>) => void;
}

export const DecorationEditContext =
  createContext<DecorationEditContextValue | null>(null);

export interface DecorationMediaContextValue {
  logoSrc?: string;
  logoName: string;
  logoAccent: string;
}

export const DecorationMediaContext =
  createContext<DecorationMediaContextValue>({
    logoName: "",
    logoAccent: "#0f766e",
  });

export function useDecorationEdit() {
  return useContext(DecorationEditContext);
}

type DragMode = "move" | "resize-se" | "resize-sw" | "resize-ne" | "resize-nw";

function DecorationContent({ decoration }: { decoration: InvoiceDecoration }) {
  const media = useContext(DecorationMediaContext);

  if (isLogoDecoration(decoration)) {
    const src = decoration.imageDataUrl || media.logoSrc;
    const fit = decoration.objectFit ?? "contain";
    if (src) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="h-full w-full"
          style={{
            opacity: decoration.opacity,
            objectFit: fit,
          }}
          draggable={false}
        />
      );
    }
    if (!media.logoName && !decoration.fill) return null;
    return (
      <div
        className="flex h-full w-full items-center justify-center rounded-xl font-bold text-white"
        style={{
          background: decoration.fill || media.logoAccent,
          opacity: decoration.opacity,
          fontSize: "clamp(1rem, 40%, 3rem)",
        }}
      >
        {(media.logoName || "L").slice(0, 1).toUpperCase()}
      </div>
    );
  }

  if (isImageDecoration(decoration) && decoration.imageDataUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={decoration.imageDataUrl}
        alt=""
        className="h-full w-full"
        style={{
          opacity: decoration.opacity,
          objectFit: decoration.objectFit ?? "contain",
        }}
        draggable={false}
      />
    );
  }

  if (decoration.shapeId === "text-block") {
    return (
      <div
        className="flex h-full w-full items-center justify-center overflow-hidden px-1 text-center leading-tight"
        style={{
          color: decoration.fill,
          opacity: decoration.opacity,
          fontSize: `${((decoration.fontSize ?? 4) / Math.max(decoration.w, 1)) * 100}%`,
          fontWeight: decoration.fontWeight ?? "bold",
        }}
      >
        {decoration.text || "Text"}
      </div>
    );
  }

  return <ShapeSvg decoration={decoration} className="h-full w-full" />;
}

function ResizeHandle({
  mode,
  className,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  mode: DragMode;
  className: string;
  onPointerDown: (e: ReactPointerEvent, mode: DragMode) => void;
  onPointerMove: (e: ReactPointerEvent) => void;
  onPointerUp: (e: ReactPointerEvent) => void;
}) {
  return (
    <div
      className={`no-print absolute h-3 w-3 rounded-[2px] border-2 border-white bg-teal-600 shadow ${className}`}
      onPointerDown={(e) => onPointerDown(e, mode)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    />
  );
}

function DecorationItem({
  decoration,
  sheetRef,
}: {
  decoration: InvoiceDecoration;
  sheetRef: React.RefObject<HTMLElement | null>;
}) {
  const edit = useDecorationEdit();
  const selected = edit?.selectedId === decoration.id;
  const dragRef = useRef<{
    mode: DragMode;
    startX: number;
    startY: number;
    orig: InvoiceDecoration;
  } | null>(null);

  const interactive =
    Boolean(edit?.editable) && !decoration.locked;

  const onPointerDown = (e: ReactPointerEvent, mode: DragMode) => {
    if (!edit?.editable || decoration.locked) return;
    e.stopPropagation();
    e.preventDefault();
    edit.onSelect(decoration.id);
    dragRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      orig: { ...decoration },
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const drag = dragRef.current;
    if (!drag || !edit || !sheetRef.current) return;
    const rect = sheetRef.current.getBoundingClientRect();
    const dx = ((e.clientX - drag.startX) / rect.width) * 100;
    const dy = ((e.clientY - drag.startY) / rect.height) * 100;
    const o = drag.orig;

    if (drag.mode === "move") {
      // Allow parking oversized shapes anywhere on/off the sheet.
      edit.onUpdate(decoration.id, {
        x: Math.min(120, Math.max(-80, o.x + dx)),
        y: Math.min(120, Math.max(-80, o.y + dy)),
      });
      return;
    }

    let x = o.x;
    let y = o.y;
    let w = o.w;
    let h = o.h;

    if (drag.mode === "resize-se") {
      w = Math.max(1, o.w + dx);
      h = Math.max(1, o.h + dy);
    } else if (drag.mode === "resize-sw") {
      w = Math.max(1, o.w - dx);
      h = Math.max(1, o.h + dy);
      x = o.x + (o.w - w);
    } else if (drag.mode === "resize-ne") {
      w = Math.max(1, o.w + dx);
      h = Math.max(1, o.h - dy);
      y = o.y + (o.h - h);
    } else if (drag.mode === "resize-nw") {
      w = Math.max(1, o.w - dx);
      h = Math.max(1, o.h - dy);
      x = o.x + (o.w - w);
      y = o.y + (o.h - h);
    }

    // No upper cap — user can fill the page or go beyond for bleed.
    edit.onUpdate(decoration.id, { x, y, w, h });
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    dragRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      data-invoice-decoration={decoration.id}
      data-invoice-decoration-type={decoration.shapeId}
      className={`absolute touch-none ${
        interactive ? "pointer-events-auto cursor-move" : "pointer-events-none"
      }`}
      style={{
        left: `${decoration.x}%`,
        top: `${decoration.y}%`,
        width: `${decoration.w}%`,
        height: `${decoration.h}%`,
        transform: `translate3d(0, 0, 0) rotate(${decoration.rotation}deg)`,
        transformOrigin: "center center",
        zIndex: selected && edit?.editable ? 9998 : decoration.zIndex,
        filter: decoration.blur ? `blur(${decoration.blur}px)` : undefined,
      }}
      onPointerDown={(e) => onPointerDown(e, "move")}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={(e) => {
        // Keep selection — do not let preview/section handlers clear it.
        e.stopPropagation();
      }}
    >
      <DecorationContent decoration={decoration} />

      {selected && edit?.editable && !decoration.locked ? (
        <>
          {/* Box sits on the shape edge (not outside) so handles stay grabable when huge/near sheet edge */}
          <div className="no-print pointer-events-none absolute inset-0 border border-teal-600/90" />
          <ResizeHandle
            mode="resize-nw"
            className="left-0 top-0 cursor-nw-resize"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          />
          <ResizeHandle
            mode="resize-ne"
            className="right-0 top-0 cursor-ne-resize"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          />
          <ResizeHandle
            mode="resize-sw"
            className="bottom-0 left-0 cursor-sw-resize"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          />
          <ResizeHandle
            mode="resize-se"
            className="bottom-0 right-0 cursor-se-resize"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          />
        </>
      ) : null}
    </div>
  );
}

export function DecorationLayer({
  decorations,
  sheetRef,
  behind = false,
}: {
  decorations: InvoiceDecoration[];
  sheetRef: React.RefObject<HTMLElement | null>;
  behind?: boolean;
}) {
  const sorted = [...decorations].sort((a, b) => a.zIndex - b.zIndex);
  const edit = useDecorationEdit();

  if (!sorted.length && !edit?.editable) return null;

  return (
    <div
      className={`pointer-events-none absolute inset-0 ${
        behind ? "z-0" : "z-[4]"
      }`}
      aria-hidden={!sorted.length}
    >
      {sorted.map((d) => (
        <DecorationItem key={d.id} decoration={d} sheetRef={sheetRef} />
      ))}
    </div>
  );
}

export { LOGO_SHAPE_ID, IMAGE_SHAPE_ID };

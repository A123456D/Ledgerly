"use client";

import {
  createContext,
  useContext,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import type { InvoiceSectionId, SectionAccents } from "@/lib/types";

export interface InvoiceEditContextValue {
  editable: boolean;
  selectedSection: InvoiceSectionId | null;
  onSelectSection: (section: InvoiceSectionId | null) => void;
  globalAccent: string;
  sectionAccents: SectionAccents;
}

export const InvoiceEditContext = createContext<InvoiceEditContextValue | null>(
  null,
);

export const SectionAccentsCtx = createContext<SectionAccents>({});

export function useInvoiceEdit() {
  return useContext(InvoiceEditContext);
}

export function useSectionAccent(section: InvoiceSectionId, fallback: string) {
  const accents = useContext(SectionAccentsCtx);
  return accents[section] || fallback;
}

export function EditableSection({
  section,
  accent,
  children,
  className = "",
  style,
  tint = true,
}: {
  section: InvoiceSectionId;
  accent: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Left accent bar when this section has its own colour */
  tint?: boolean;
}) {
  const edit = useInvoiceEdit();
  const sectionAccent = useSectionAccent(section, accent);
  const hasOverride = Boolean(edit?.sectionAccents[section]);
  const selected = edit?.editable && edit.selectedSection === section;

  const onClick = (e: MouseEvent) => {
    if (!edit?.editable) return;
    e.stopPropagation();
    edit.onSelectSection(section);
  };

  const tintStyle: CSSProperties | undefined =
    tint && hasOverride
      ? {
          boxShadow: `inset 3px 0 0 ${sectionAccent}`,
          background: `${sectionAccent}12`,
        }
      : undefined;

  return (
    <div
      data-invoice-section={section}
      data-invoice-section-selected={selected ? "true" : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!edit?.editable) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          edit.onSelectSection(section);
        }
      }}
      role={edit?.editable ? "button" : undefined}
      tabIndex={edit?.editable ? 0 : undefined}
      className={`relative rounded-sm transition-[box-shadow,outline] ${
        edit?.editable
          ? "cursor-pointer hover:outline hover:outline-1 hover:outline-teal-500/35"
          : ""
      } ${selected ? "outline outline-2 outline-teal-600/70 outline-offset-2" : ""} ${className}`}
      style={{ ...tintStyle, ...style }}
    >
      {children}
    </div>
  );
}

/** Strip edit chrome from cloned preview DOM before PDF capture. */
export function stripSectionEditChrome(root: ParentNode) {
  root.querySelectorAll("[data-invoice-section]").forEach((el) => {
    if (!(el instanceof HTMLElement)) return;
    el.removeAttribute("data-invoice-section-selected");
    el.style.boxShadow = "";
    el.classList.remove(
      "outline",
      "outline-2",
      "outline-teal-600/70",
      "outline-offset-2",
      "cursor-pointer",
    );
  });
}

"use client";

import { createElement } from "react";
import type { InvoiceViewModel } from "@/templates/InvoicePreview";
import { formatDate, formatMoney } from "@/lib/format";
import { resolveVisibility } from "@/lib/invoice-visibility";
import { getBuiltinTemplate, isBuiltinTemplateId } from "@/lib/templates/catalog";

function lineAmount(doc: InvoiceViewModel, index: number): number {
  const line = doc.lineItems[index];
  const base =
    (line.quantity || 0) *
    (line.unitPrice || 0) *
    (1 - (line.discountPercent || 0) / 100);
  return doc.taxMode === "inclusive"
    ? base
    : base + (base * (line.taxRate || 0)) / 100;
}

export async function buildInvoicePdfBlob(
  doc: InvoiceViewModel,
): Promise<Blob> {
  const {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Image,
    pdf,
  } = await import("@react-pdf/renderer");

  const visibility = resolveVisibility(doc.visibility);
  const accent = doc.accentColor || "#0f766e";
  const logo = visibility.logo
    ? doc.logoDataUrl || doc.business.logoDataUrl
    : undefined;
  const issueDate =
    visibility.issueDate && doc.issueDate
      ? formatDate(doc.issueDate)
      : "";
  const dueDate =
    visibility.dueDate && doc.dueDate ? formatDate(doc.dueDate) : "";
  const number = visibility.invoiceNumber ? doc.number : "";
  const notes = visibility.notes ? doc.notes : "";
  const payment = visibility.payment ? doc.paymentInstructions : "";
  const showVat = visibility.vat;
  const showSubtotal = visibility.subtotal;
  const showFrom = visibility.from;
  const showBillTo = visibility.billTo;
  const custom = doc.customTemplate;
  const meta =
    !custom && isBuiltinTemplateId(doc.templateId)
      ? getBuiltinTemplate(doc.templateId)
      : undefined;
  const variant = custom ? "custom" : meta?.pdfVariant || "classic";
  const isDark = variant === "dark";
  const isBold = variant === "bold";
  const isMinimal = variant === "minimal";
  const paper = custom ? "#ffffff" : meta?.paper || "#ffffff";
  const ink = custom ? "#1c1917" : meta?.ink || "#1c1917";

  const styles = StyleSheet.create({
    page: {
      padding: custom ? 36 : 40,
      paddingTop: custom ? (custom.contentTopMm / 25.4) * 72 + 12 : 40,
      fontSize: 10,
      fontFamily: "Helvetica",
      color: ink,
      backgroundColor: paper,
    },
    row: { flexDirection: "row", justifyContent: "space-between" },
    h1: { fontSize: 20, fontFamily: "Helvetica-Bold", color: ink },
    muted: {
      color: isDark ? "#94a3b8" : "#78716c",
      fontSize: 8,
      textTransform: "uppercase",
      letterSpacing: 1.2,
    },
    tableHeader: {
      flexDirection: "row",
      borderBottomWidth: 1.5,
      paddingBottom: 6,
      marginTop: 24,
      marginBottom: 4,
    },
    tableRow: {
      flexDirection: "row",
      borderBottomWidth: 0.5,
      borderBottomColor: isDark ? "#334155" : "#e7e5e4",
      paddingVertical: 8,
    },
    colDesc: { width: "42%" },
    colQty: { width: "12%", textAlign: "right" },
    colPrice: { width: "16%", textAlign: "right" },
    colTax: { width: "12%", textAlign: "right" },
    colAmt: { width: "18%", textAlign: "right" },
    totals: { marginTop: 16, alignSelf: "flex-end", width: 180 },
    totalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 4,
    },
    footer: {
      position: "absolute",
      bottom: 24,
      left: 40,
      right: 40,
      flexDirection: "row",
      justifyContent: "space-between",
      fontSize: 8,
      color: isDark ? "#64748b" : "#a8a29e",
    },
  });

  const bg =
    custom?.backgroundDataUrl
      ? createElement(Image, {
          src: custom.backgroundDataUrl,
          style: {
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          },
          fixed: true,
        })
      : null;

  const contentCard =
    custom && custom.contentStyle !== "transparent"
      ? {
          backgroundColor:
            custom.contentStyle === "band"
              ? "rgba(255,255,255,0.94)"
              : "rgba(255,255,255,0.92)",
          padding: 14,
          borderRadius: custom.contentStyle === "card" ? 8 : 0,
        }
      : {};

  const header =
    custom || isMinimal
      ? createElement(
          View,
          { style: styles.row },
          createElement(
            View,
            { style: { flexDirection: "row", gap: 10, alignItems: "center" } },
            logo
              ? createElement(Image, {
                  src: logo,
                  style: { height: 32, width: 64, objectFit: "contain" },
                })
              : null,
          ),
          createElement(
            View,
            { style: { alignItems: "flex-end" } },
            number
              ? createElement(Text, { style: styles.muted }, "Reference")
              : null,
            number
              ? createElement(
                  Text,
                  { style: { fontSize: 14, color: accent, marginTop: 2 } },
                  number,
                )
              : null,
            issueDate
              ? createElement(Text, { style: { marginTop: 6 } }, `Issued ${issueDate}`)
              : null,
            dueDate ? createElement(Text, null, `Due ${dueDate}`) : null,
          ),
        )
      : isBold || isDark
        ? createElement(
            View,
            {
              style: {
                backgroundColor: isDark ? "#111827" : accent,
                margin: -40,
                marginBottom: 20,
                padding: 40,
                paddingBottom: 28,
              },
            },
            createElement(
              View,
              { style: styles.row },
              createElement(
                View,
                null,
                logo
                  ? createElement(Image, {
                      src: logo,
                      style: {
                        height: 36,
                        width: 90,
                        marginBottom: 10,
                        objectFit: "contain",
                      },
                    })
                  : null,
                createElement(
                  Text,
                  { style: { ...styles.h1, color: "#fff" } },
                  doc.business.name || "Invoice",
                ),
              ),
              createElement(
                View,
                null,
                createElement(
                  Text,
                  { style: { color: "#ffffffcc", fontSize: 9 } },
                  "INVOICE",
                ),
                createElement(
                  Text,
                  { style: { color: "#fff", fontSize: 16, marginTop: 4 } },
                  number,
                ),
              ),
            ),
          )
        : createElement(
            View,
            { style: styles.row },
            showFrom
              ? createElement(
              View,
              { style: { flexDirection: "row", gap: 12, maxWidth: "60%" } },
              logo
                ? createElement(Image, {
                    src: logo,
                    style: { height: 40, width: 40, objectFit: "contain" },
                  })
                : null,
              createElement(
                View,
                null,
                createElement(
                  Text,
                  { style: styles.h1 },
                  doc.business.name || "Your business",
                ),
                createElement(
                  Text,
                  { style: { marginTop: 6, lineHeight: 1.4, color: isDark ? "#94a3b8" : "#57534e" } },
                  [
                    doc.business.address,
                    [doc.business.postalCode, doc.business.city]
                      .filter(Boolean)
                      .join(" "),
                    doc.business.country,
                    doc.business.email,
                    doc.business.taxId ? `Tax ID: ${doc.business.taxId}` : "",
                  ]
                    .filter(Boolean)
                    .join("\n"),
                ),
              ),
            )
              : logo
                ? createElement(Image, {
                    src: logo,
                    style: { height: 40, width: 40, objectFit: "contain" },
                  })
                : createElement(View, null),
            createElement(
              View,
              { style: { alignItems: "flex-end" } },
              createElement(
                Text,
                {
                  style: {
                    fontSize: 22,
                    color: accent,
                    fontFamily: "Helvetica-Bold",
                  },
                },
                "Invoice",
              ),
              number
                ? createElement(
                    Text,
                    { style: { ...styles.muted, marginTop: 8 } },
                    "Reference",
                  )
                : null,
              number
                ? createElement(
                    Text,
                    { style: { marginTop: 2, fontSize: 12 } },
                    number,
                  )
                : null,
              issueDate
                ? createElement(
                    Text,
                    { style: { marginTop: 10 } },
                    `Issued ${issueDate}`,
                  )
                : null,
              dueDate ? createElement(Text, null, `Due ${dueDate}`) : null,
            ),
          );

  const documentTree = createElement(
    Document,
    { title: `Invoice ${doc.number}`, author: doc.business.name },
    createElement(
      Page,
      { size: "A4", style: styles.page },
      bg,
      createElement(
        View,
        { style: contentCard },
        header,
        showBillTo
          ? createElement(
          View,
          { style: { flexDirection: "row", marginTop: 20, gap: 24 } },
          createElement(
            View,
            { style: { flex: 1 } },
            createElement(Text, { style: styles.muted }, "Bill to"),
            createElement(
              Text,
              { style: { marginTop: 6, lineHeight: 1.45 } },
              [
                doc.client.name,
                doc.client.address,
                [doc.client.postalCode, doc.client.city]
                  .filter(Boolean)
                  .join(" "),
                doc.client.country,
                doc.client.email,
                doc.client.taxId ? `Tax ID: ${doc.client.taxId}` : "",
              ]
                .filter(Boolean)
                .join("\n"),
            ),
          ),
        )
          : null,
        createElement(
          View,
          {
            style: {
              ...styles.tableHeader,
              borderBottomColor: accent,
              ...(isBold || isDark
                ? {
                    backgroundColor: accent,
                    padding: 8,
                    borderBottomWidth: 0,
                  }
                : {}),
            },
          },
          ...(
            (showVat
              ? (["Description", "Qty", "Price", "VAT", "Amount"] as const)
              : (["Description", "Qty", "Price", "Amount"] as const)
            ).map((label, i, arr) => {
              const colStyle =
                label === "Description"
                  ? showVat
                    ? styles.colDesc
                    : { width: "46%" }
                  : label === "Qty"
                    ? styles.colQty
                    : label === "Price"
                      ? styles.colPrice
                      : label === "VAT"
                        ? styles.colTax
                        : showVat
                          ? styles.colAmt
                          : { width: "26%", textAlign: "right" as const };
              return createElement(
                Text,
                {
                  key: label,
                  style: {
                    ...colStyle,
                    color: isBold || isDark ? "#fff" : isDark ? "#94a3b8" : "#78716c",
                    fontFamily: "Helvetica-Bold",
                  },
                },
                label,
              );
            })
          ),
        ),
        ...doc.lineItems.map((line, i) =>
          createElement(
            View,
            { key: line.id, style: styles.tableRow, wrap: false },
            createElement(
              Text,
              { style: showVat ? styles.colDesc : { width: "46%" } },
              line.description || "—",
            ),
            createElement(
              Text,
              { style: styles.colQty },
              `${line.quantity}${line.unit ? ` ${line.unit}` : ""}`,
            ),
            createElement(
              Text,
              { style: styles.colPrice },
              formatMoney(line.unitPrice, doc.currency),
            ),
            showVat
              ? createElement(
                  Text,
                  { style: styles.colTax },
                  `${line.taxRate || 0}%`,
                )
              : null,
            createElement(
              Text,
              {
                style: showVat
                  ? styles.colAmt
                  : { width: "26%", textAlign: "right" as const },
              },
              formatMoney(lineAmount(doc, i), doc.currency),
            ),
          ),
        ),
        createElement(
          View,
          { style: styles.totals },
          showSubtotal
            ? createElement(
                View,
                { style: styles.totalRow },
                createElement(Text, null, "Subtotal"),
                createElement(
                  Text,
                  null,
                  formatMoney(doc.totals.subtotal, doc.currency),
                ),
              )
            : null,
          ...(showVat
            ? doc.totals.taxByRate.map((b) =>
                createElement(
                  View,
                  { key: String(b.rate), style: styles.totalRow },
                  createElement(Text, null, `VAT ${b.rate}%`),
                  createElement(Text, null, formatMoney(b.tax, doc.currency)),
                ),
              )
            : []),
          createElement(
            View,
            {
              style: {
                ...styles.totalRow,
                marginTop: 6,
                paddingTop: 6,
                borderTopWidth: 1,
                borderTopColor: isDark ? "#334155" : "#d6d3d1",
              },
            },
            createElement(
              Text,
              { style: { fontFamily: "Helvetica-Bold", color: accent } },
              "Total",
            ),
            createElement(
              Text,
              { style: { fontFamily: "Helvetica-Bold", color: accent } },
              formatMoney(doc.totals.total, doc.currency),
            ),
          ),
        ),
        notes || payment
          ? createElement(
              View,
              { style: { marginTop: 28, flexDirection: "row", gap: 20 } },
              notes
                ? createElement(
                    View,
                    { style: { flex: 1 } },
                    createElement(Text, { style: styles.muted }, "Notes"),
                    createElement(
                      Text,
                      { style: { marginTop: 6, lineHeight: 1.4 } },
                      notes,
                    ),
                  )
                : null,
              payment
                ? createElement(
                    View,
                    { style: { flex: 1 } },
                    createElement(Text, { style: styles.muted }, "Payment"),
                    createElement(
                      Text,
                      { style: { marginTop: 6, lineHeight: 1.4 } },
                      payment,
                    ),
                  )
                : null,
            )
          : null,
      ),
      createElement(
        View,
        { style: styles.footer, fixed: true },
        createElement(Text, null, number),
        createElement(Text, {
          render: ({
            pageNumber,
            totalPages,
          }: {
            pageNumber: number;
            totalPages: number;
          }) => `Page ${pageNumber} of ${totalPages}`,
        }),
      ),
    ),
  );


  return pdf(documentTree).toBlob();
}

export async function downloadInvoicePdf(
  doc: InvoiceViewModel,
  filename?: string,
) {
  const blob = await buildInvoicePdfBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `${doc.number || "invoice"}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

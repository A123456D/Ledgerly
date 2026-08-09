import { db, getBusiness, getSettings, saveSettings } from "./db";
import { getCustomTemplate } from "./custom-templates";
import { addDaysISO, todayISO, uid } from "./format";
import { calculateTotals } from "./invoice-math";
import { allocateNumber, previewNextNumber } from "./numbering";
import {
  EMPTY_PARTY,
  type Business,
  type Client,
  type CustomTemplate,
  type Invoice,
  type InvoiceTotals,
  type IssuedSnapshot,
  type LineItem,
  type PartySnapshot,
  type TemplateId,
} from "./types";
import type { InvoiceViewModel } from "@/templates/InvoicePreview";
import { getBuiltinTemplate } from "./templates/catalog";
import { resolveLogoDataUrl } from "./logos";

export function emptyLine(taxRate = 0): LineItem {
  return {
    id: uid("line"),
    description: "",
    quantity: 1,
    unitPrice: 0,
    unit: "",
    taxRate,
    discountPercent: 0,
  };
}

export function clientToParty(client: Client): PartySnapshot {
  return {
    name: client.name,
    email: client.email,
    address: client.address,
    city: client.city,
    postalCode: client.postalCode,
    country: client.country,
    taxId: client.taxId,
  };
}

export function businessToParty(
  business: Business,
  logoId?: string | null,
): PartySnapshot & {
  logoDataUrl?: string;
  accentColor: string;
  fontPair: Business["fontPair"];
  phone?: string;
} {
  return {
    name: business.name,
    email: business.email,
    phone: business.phone,
    address: business.address,
    city: business.city,
    postalCode: business.postalCode,
    country: business.country,
    taxId: business.taxId,
    logoDataUrl: resolveLogoDataUrl(business, logoId),
    accentColor: business.accentColor,
    fontPair: business.fontPair,
  };
}

export function recomputeTotals(invoice: Invoice): InvoiceTotals {
  const result = calculateTotals(invoice.lineItems, invoice.taxMode);
  return {
    subtotal: result.subtotal,
    discountTotal: result.discountTotal,
    taxTotal: result.taxTotal,
    taxByRate: result.taxByRate,
    total: result.total,
  };
}

export async function createDraftInvoice(options?: {
  clientId?: string;
  fromInvoiceId?: string;
}): Promise<Invoice> {
  const business = await getBusiness();
  const settings = await getSettings();
  const now = new Date().toISOString();
  const issueDate = todayISO();

  let client: PartySnapshot = { ...EMPTY_PARTY };
  let clientId: string | null = null;
  let lineItems = [emptyLine(business.defaultTaxRate)];
  let notes = "";
  let paymentInstructions = business.paymentTerms;
  let templateId: TemplateId = settings.defaultTemplate;
  let accentColor = business.accentColor;
  let taxMode = business.taxMode;
  let currency = business.currency;
  let logoId: string | null | undefined = business.defaultLogoId ?? null;

  if (options?.fromInvoiceId) {
    const source = await db.invoices.get(options.fromInvoiceId);
    if (source) {
      client = { ...source.client };
      clientId = source.clientId;
      lineItems = source.lineItems.map((l) => ({
        ...l,
        id: uid("line"),
      }));
      notes = source.notes;
      paymentInstructions =
        source.paymentInstructions || business.paymentTerms;
      templateId = source.templateId;
      accentColor = source.accentColor;
      taxMode = source.taxMode;
      currency = source.currency;
      logoId = source.logoId ?? business.defaultLogoId ?? null;
    }
  } else if (options?.clientId) {
    const c = await db.clients.get(options.clientId);
    if (c) {
      client = clientToParty(c);
      clientId = c.id;
    }
  }

  const invoice: Invoice = {
    id: uid("inv"),
    status: "draft",
    number: null,
    clientId,
    client,
    issueDate,
    dueDate: addDaysISO(issueDate, business.netDays),
    currency,
    taxMode,
    templateId,
    accentColor,
    logoId,
    notes,
    paymentInstructions,
    lineItems,
    totals: {
      subtotal: 0,
      discountTotal: 0,
      taxTotal: 0,
      taxByRate: [],
      total: 0,
    },
    createdAt: now,
    updatedAt: now,
  };
  invoice.totals = recomputeTotals(invoice);
  await db.invoices.put(invoice);
  return invoice;
}

export async function saveInvoice(invoice: Invoice): Promise<Invoice> {
  if (invoice.status !== "draft") {
    throw new Error("Only draft invoices can be edited");
  }
  const next = {
    ...invoice,
    totals: recomputeTotals(invoice),
    updatedAt: new Date().toISOString(),
  };
  await db.invoices.put(next);
  return next;
}

export async function peekDraftNumber(): Promise<string> {
  const business = await getBusiness();
  const settings = await getSettings();
  const year = new Date().getFullYear();
  return previewNextNumber(
    {
      nextSequence: settings.nextSequence,
      sequenceYear: settings.sequenceYear,
    },
    business.invoicePrefix,
    year,
  );
}

export async function issueInvoice(id: string): Promise<Invoice> {
  const invoice = await db.invoices.get(id);
  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status !== "draft") {
    throw new Error("Only drafts can be issued");
  }
  if (!invoice.client.name.trim()) {
    throw new Error("Add a client name before issuing");
  }
  if (
    invoice.lineItems.length === 0 ||
    invoice.lineItems.every((l) => !l.description.trim())
  ) {
    throw new Error("Add at least one line item before issuing");
  }

  const business = await getBusiness();
  const settings = await getSettings();
  const year = new Date(invoice.issueDate + "T12:00:00").getFullYear();
  const { number, nextState } = allocateNumber(
    {
      nextSequence: settings.nextSequence,
      sequenceYear: settings.sequenceYear,
    },
    business.invoicePrefix,
    year,
  );

  const totals = recomputeTotals(invoice);
  const custom = invoice.templateId.startsWith("custom:")
    ? await getCustomTemplate(invoice.templateId)
    : undefined;

  const snapshot: IssuedSnapshot = {
    number,
    issuedAt: new Date().toISOString(),
    business: businessToParty(business, invoice.logoId),
    client: { ...invoice.client },
    currency: invoice.currency,
    taxMode: invoice.taxMode,
    templateId: invoice.templateId,
    customBackgroundDataUrl: custom?.backgroundDataUrl,
    customContentTopMm: custom?.contentTopMm,
    customContentStyle: custom?.contentStyle,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    notes: invoice.notes,
    paymentInstructions: invoice.paymentInstructions,
    lineItems: invoice.lineItems.map((l) => ({ ...l })),
    totals,
  };

  const issued: Invoice = {
    ...invoice,
    status: "issued",
    number,
    totals,
    snapshot,
    updatedAt: new Date().toISOString(),
  };

  await db.transaction("rw", db.invoices, db.settings, async () => {
    await db.invoices.put(issued);
    await saveSettings({
      nextSequence: nextState.nextSequence,
      sequenceYear: nextState.sequenceYear,
    });
  });

  void import("@/lib/auto-backup").then(({ createAutoBackup }) =>
    createAutoBackup("issue", { force: true }),
  );

  return issued;
}

export async function markInvoiceStatus(
  id: string,
  status: "paid" | "void" | "issued",
): Promise<Invoice> {
  const invoice = await db.invoices.get(id);
  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status === "draft") {
    throw new Error("Issue the invoice first");
  }
  if (invoice.status === "void" && status !== "void") {
    throw new Error("Void invoices cannot be reopened");
  }
  const next: Invoice = {
    ...invoice,
    status,
    updatedAt: new Date().toISOString(),
  };
  await db.invoices.put(next);
  return next;
}

export async function duplicateInvoice(id: string): Promise<Invoice> {
  return createDraftInvoice({ fromInvoiceId: id });
}

/** Permanently remove a draft. Issued / paid / void invoices cannot be deleted (void instead). */
export async function deleteDraftInvoice(id: string): Promise<void> {
  const invoice = await db.invoices.get(id);
  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status !== "draft") {
    throw new Error("Only drafts can be deleted. Void issued invoices instead.");
  }
  await db.invoices.delete(id);
  void import("@/lib/auto-backup").then(({ createAutoBackup }) =>
    createAutoBackup("delete-draft", { force: true }),
  );
}

function customFromSnapshot(snapshot: IssuedSnapshot): CustomTemplate | null {
  if (!snapshot.customBackgroundDataUrl) return null;
  return {
    id: "snapshot",
    name: "Issued design",
    source: "canva",
    backgroundDataUrl: snapshot.customBackgroundDataUrl,
    accentColor: snapshot.business.accentColor,
    contentTopMm: snapshot.customContentTopMm ?? 52,
    contentStyle: snapshot.customContentStyle ?? "card",
    createdAt: snapshot.issuedAt,
  };
}

export function displayDocument(invoice: Invoice): InvoiceViewModel {
  if (invoice.snapshot) {
    return {
      number: invoice.snapshot.number,
      business: invoice.snapshot.business,
      client: invoice.snapshot.client,
      currency: invoice.snapshot.currency,
      taxMode: invoice.snapshot.taxMode,
      templateId: invoice.snapshot.templateId,
      accentColor: invoice.snapshot.business.accentColor,
      fontPair: invoice.snapshot.business.fontPair,
      logoDataUrl: invoice.snapshot.business.logoDataUrl,
      issueDate: invoice.snapshot.issueDate,
      dueDate: invoice.snapshot.dueDate,
      notes: invoice.snapshot.notes,
      paymentInstructions: invoice.snapshot.paymentInstructions,
      lineItems: invoice.snapshot.lineItems,
      totals: invoice.snapshot.totals,
      status: invoice.status,
      customTemplate: customFromSnapshot(invoice.snapshot),
    };
  }
  return {
    number: invoice.number ?? "DRAFT",
    business: {
      name: "",
      email: "",
      address: "",
      city: "",
      postalCode: "",
      country: "",
      taxId: "",
    },
    client: invoice.client,
    currency: invoice.currency,
    taxMode: invoice.taxMode,
    templateId: invoice.templateId,
    accentColor: invoice.accentColor,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    notes: invoice.notes,
    paymentInstructions: invoice.paymentInstructions,
    lineItems: invoice.lineItems,
    totals: invoice.totals,
    status: invoice.status,
  };
}

export async function displayDocumentLive(
  invoice: Invoice,
): Promise<InvoiceViewModel> {
  if (invoice.snapshot) return displayDocument(invoice);
  const business = await getBusiness();
  const peek =
    invoice.status === "draft"
      ? await peekDraftNumber()
      : (invoice.number ?? "—");

  let customTemplate: CustomTemplate | null = null;
  let accent = invoice.accentColor || business.accentColor;
  if (invoice.templateId.startsWith("custom:")) {
    customTemplate = (await getCustomTemplate(invoice.templateId)) ?? null;
    if (customTemplate) accent = customTemplate.accentColor || accent;
  } else {
    const meta = getBuiltinTemplate(invoice.templateId);
    if (meta && (!invoice.accentColor || invoice.accentColor === business.accentColor)) {
      // keep invoice accent if user set it; otherwise leave as-is
    }
  }

  return {
    number: peek,
    business: businessToParty(business, invoice.logoId),
    client: invoice.client,
    currency: invoice.currency,
    taxMode: invoice.taxMode,
    templateId: invoice.templateId,
    accentColor: accent,
    fontPair: business.fontPair,
    logoDataUrl: resolveLogoDataUrl(business, invoice.logoId),
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    notes: invoice.notes,
    paymentInstructions: invoice.paymentInstructions,
    lineItems: invoice.lineItems,
    totals: recomputeTotals(invoice),
    status: invoice.status,
    customTemplate,
  };
}

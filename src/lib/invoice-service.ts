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
import { resolveLogoDataUrl, normalizeBusinessLogos } from "./logos";

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

/**
 * Create or update a Clients book entry from invoice bill-to details.
 * First invoice for a new name/email adds them automatically.
 */
export async function ensureClientFromInvoice(
  invoice: Invoice,
): Promise<{ invoice: Invoice; created: boolean }> {
  const name = invoice.client.name.trim();
  if (!name) {
    return { invoice, created: false };
  }

  const now = new Date().toISOString();
  const party = {
    name: invoice.client.name.trim(),
    email: invoice.client.email.trim(),
    address: invoice.client.address.trim(),
    city: invoice.client.city.trim(),
    postalCode: invoice.client.postalCode.trim(),
    country: invoice.client.country.trim(),
    taxId: invoice.client.taxId.trim(),
  };

  if (invoice.clientId) {
    const existing = await db.clients.get(invoice.clientId);
    if (existing) {
      await db.clients.put({
        ...existing,
        ...party,
        updatedAt: now,
      });
      return { invoice, created: false };
    }
  }

  const clients = await db.clients.toArray();
  const emailKey = party.email.toLowerCase();
  const nameKey = party.name.toLowerCase();
  const match =
    (emailKey
      ? clients.find((c) => c.email.trim().toLowerCase() === emailKey)
      : undefined) ||
    clients.find((c) => c.name.trim().toLowerCase() === nameKey);

  if (match) {
    await db.clients.put({
      ...match,
      ...party,
      updatedAt: now,
    });
    const next = { ...invoice, clientId: match.id };
    return { invoice: next, created: false };
  }

  const id = uid("cli");
  await db.clients.put({
    id,
    ...party,
    notes: "",
    createdAt: now,
    updatedAt: now,
  });
  return { invoice: { ...invoice, clientId: id }, created: true };
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
  const business = normalizeBusinessLogos(await getBusiness());
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
  let logoId: string | null | undefined = business.defaultLogoId;
  let visibility = undefined as Invoice["visibility"];

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
      logoId = source.logoId ?? business.defaultLogoId;
      visibility = source.visibility ? { ...source.visibility } : undefined;
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
    visibility,
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

export async function saveInvoice(
  invoice: Invoice,
): Promise<Invoice & { clientCreated?: boolean }> {
  if (invoice.status !== "draft") {
    throw new Error("Only draft invoices can be edited");
  }
  const { invoice: withClient, created } = await ensureClientFromInvoice(invoice);
  const next: Invoice & { clientCreated?: boolean } = {
    ...withClient,
    totals: recomputeTotals(withClient),
    updatedAt: new Date().toISOString(),
    clientCreated: created,
  };
  const { clientCreated: _flag, ...toStore } = next;
  await db.invoices.put(toStore);
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
  if (
    invoice.lineItems.length === 0 ||
    invoice.lineItems.every((l) => !l.description.trim())
  ) {
    throw new Error("Add at least one line item before issuing");
  }

  const { invoice: linked } = await ensureClientFromInvoice(invoice);

  const business = normalizeBusinessLogos(await getBusiness());
  const settings = await getSettings();
  const year = new Date(
    (linked.issueDate || todayISO()) + "T12:00:00",
  ).getFullYear();
  const { number, nextState } = allocateNumber(
    {
      nextSequence: settings.nextSequence,
      sequenceYear: settings.sequenceYear,
    },
    business.invoicePrefix,
    year,
  );

  const totals = recomputeTotals(linked);
  const custom = linked.templateId.startsWith("custom:")
    ? await getCustomTemplate(linked.templateId)
    : undefined;

  const logoId =
    linked.logoId === null
      ? null
      : linked.logoId ?? business.defaultLogoId ?? null;

  const snapshot: IssuedSnapshot = {
    number,
    issuedAt: new Date().toISOString(),
    business: businessToParty(business, logoId),
    client: { ...linked.client },
    currency: linked.currency,
    taxMode: linked.taxMode,
    templateId: linked.templateId,
    customBackgroundDataUrl: custom?.backgroundDataUrl,
    customContentTopMm: custom?.contentTopMm,
    customContentStyle: custom?.contentStyle,
    issueDate: linked.issueDate,
    dueDate: linked.dueDate,
    notes: linked.notes,
    paymentInstructions: linked.paymentInstructions,
    lineItems: linked.lineItems.map((l) => ({ ...l })),
    totals,
    visibility: linked.visibility ? { ...linked.visibility } : undefined,
  };

  const issued: Invoice = {
    ...linked,
    status: "issued",
    number,
    totals,
    snapshot,
    updatedAt: new Date().toISOString(),
  };

  await db.transaction("rw", db.invoices, db.settings, db.clients, async () => {
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
      visibility: invoice.snapshot.visibility ?? invoice.visibility,
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
    visibility: invoice.visibility,
  };
}

export async function displayDocumentLive(
  invoice: Invoice,
): Promise<InvoiceViewModel> {
  if (invoice.snapshot) return displayDocument(invoice);
  const business = normalizeBusinessLogos(await getBusiness());
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

  const logoId =
    invoice.logoId === null
      ? null
      : invoice.logoId ?? business.defaultLogoId ?? null;

  return {
    number: peek,
    business: businessToParty(business, logoId),
    client: invoice.client,
    currency: invoice.currency,
    taxMode: invoice.taxMode,
    templateId: invoice.templateId,
    accentColor: accent,
    fontPair: business.fontPair,
    logoDataUrl: resolveLogoDataUrl(business, logoId),
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    notes: invoice.notes,
    paymentInstructions: invoice.paymentInstructions,
    lineItems: invoice.lineItems,
    totals: recomputeTotals(invoice),
    status: invoice.status,
    visibility: invoice.visibility,
    customTemplate,
  };
}

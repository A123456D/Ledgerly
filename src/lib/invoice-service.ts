import { db, getBusiness, getSettings, saveSettings } from "./db";
import { getCustomTemplate } from "./custom-templates";
import { addDaysISO, todayISO, uid } from "./format";
import { calculateTotals } from "./invoice-math";
import {
  bumpSequenceForUsedNumber,
  numberIsTaken,
  parseDocumentNumberInput,
  planIssueNumber,
  previewNextNumber,
} from "./numbering";
import {
  EMPTY_PARTY,
  type Business,
  type Client,
  type CustomTemplate,
  type DocKind,
  type Invoice,
  type InvoiceStatus,
  type InvoiceTotals,
  type IssuedSnapshot,
  type LineItem,
  type PartySnapshot,
  type TemplateId,
} from "./types";
import { documentKind, documentNounLower, isQuote } from "./document-kind";
import type { InvoiceViewModel } from "@/templates/InvoicePreview";
import { getBuiltinTemplate, isBuiltinTemplateId } from "./templates/catalog";
import {
  buildTemplateDecorations,
  isBuiltinTemplateIdForDesign,
} from "./templates/decoration-presets";
import { resolveLogoDataUrl, normalizeBusinessLogos } from "./logos";
import { resolveVisibility } from "./invoice-visibility";
import { defaultBusinessNameFill } from "./decorations/business-name-decoration";
import { fillLogoImages } from "./decorations/logo-decoration";
import { syncIdentityDecorations } from "./decorations/identity-layers";

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

export function takenNumbersForKind(
  invoices: Array<Pick<Invoice, "id" | "kind" | "number" | "snapshot">>,
  kind: DocKind,
  excludeId: string,
): string[] {
  const want = documentKind(kind);
  const taken: string[] = [];
  for (const invoice of invoices) {
    if (invoice.id === excludeId) continue;
    if (documentKind(invoice.kind) !== want) continue;
    if (invoice.number) taken.push(invoice.number);
    if (invoice.snapshot?.number) taken.push(invoice.snapshot.number);
  }
  return taken;
}

async function takenNumbers(kind: DocKind, excludeId: string): Promise<string[]> {
  return takenNumbersForKind(await db.invoices.toArray(), kind, excludeId);
}

function sequencePatch(
  quote: boolean,
  nextState: { nextSequence: number; sequenceYear: number },
) {
  return quote
    ? {
        nextQuoteSequence: nextState.nextSequence,
        quoteSequenceYear: nextState.sequenceYear,
      }
    : {
        nextSequence: nextState.nextSequence,
        sequenceYear: nextState.sequenceYear,
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
  kind?: DocKind;
  sourceQuoteId?: string | null;
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
  let fontPair = business.fontPair;
  let taxMode = business.taxMode;
  let currency = business.currency;
  let logoId: string | null | undefined = business.defaultLogoId;
  let logoSizePx = business.defaultLogoSizePx;
  let visibility = undefined as Invoice["visibility"];
  let sectionAccents = undefined as Invoice["sectionAccents"];
  let decorations = undefined as Invoice["decorations"];
  let kind: DocKind = options?.kind ?? "invoice";

  if (options?.fromInvoiceId) {
    const source = await db.invoices.get(options.fromInvoiceId);
    if (source) {
      if (options.kind === undefined) kind = documentKind(source.kind);
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
      fontPair = source.fontPair ?? business.fontPair;
      taxMode = source.taxMode;
      currency = source.currency;
      logoId = source.logoId ?? business.defaultLogoId;
      logoSizePx = source.logoSizePx ?? business.defaultLogoSizePx;
      visibility = source.visibility ? { ...source.visibility } : undefined;
      sectionAccents = source.sectionAccents
        ? { ...source.sectionAccents }
        : undefined;
      decorations = source.decorations?.map((d) => ({
        ...d,
        id: uid("deco"),
      }));
    }
  } else if (options?.clientId) {
    const c = await db.clients.get(options.clientId);
    if (c) {
      client = clientToParty(c);
      clientId = c.id;
    }
  }

  const invoice: Invoice = {
    id: uid(kind === "quote" ? "quo" : "inv"),
    kind,
    status: "draft",
    number: null,
    sourceQuoteId: options?.sourceQuoteId ?? null,
    clientId,
    client,
    issueDate,
    dueDate: addDaysISO(issueDate, business.netDays),
    currency,
    taxMode,
    templateId,
    accentColor,
    fontPair,
    logoId,
    logoSizePx,
    notes,
    paymentInstructions,
    lineItems,
    visibility,
    sectionAccents,
    decorations,
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
  if (
    !options?.fromInvoiceId &&
    isBuiltinTemplateIdForDesign(templateId) &&
    !decorations?.length
  ) {
    invoice.decorations = buildTemplateDecorations(templateId, accentColor);
  }
  const logoDataUrl = resolveLogoDataUrl(
    business,
    invoice.logoId === null
      ? null
      : invoice.logoId ?? business.defaultLogoId ?? null,
  );
  invoice.decorations = fillLogoImages(invoice.decorations, logoDataUrl);
  await db.invoices.put(invoice);
  return invoice;
}

export async function saveInvoice(
  invoice: Invoice,
): Promise<Invoice & { clientCreated?: boolean }> {
  if (invoice.status !== "draft") {
    throw new Error("Only drafts can be edited");
  }
  const parsed = parseDocumentNumberInput(invoice.number ?? "", {
    allowEmpty: true,
  });
  if (!parsed.ok) {
    throw new Error(parsed.error);
  }
  if (parsed.value && numberIsTaken(parsed.value, await takenNumbers(documentKind(invoice.kind), invoice.id))) {
    throw new Error(
      `That number is already used on another ${documentNounLower(invoice.kind)}`,
    );
  }
  const { invoice: withClient, created } = await ensureClientFromInvoice(invoice);
  const business = normalizeBusinessLogos(await getBusiness());
  const logoDataUrl = resolveLogoDataUrl(
    business,
    withClient.logoId === null
      ? null
      : withClient.logoId ?? business.defaultLogoId ?? null,
  );
  const next: Invoice & { clientCreated?: boolean } = {
    ...withClient,
    number: parsed.value,
    decorations: fillLogoImages(withClient.decorations, logoDataUrl),
    totals: recomputeTotals(withClient),
    updatedAt: new Date().toISOString(),
    clientCreated: created,
  };
  const { clientCreated: _flag, ...toStore } = next;
  await db.invoices.put(toStore);
  return next;
}

export async function peekDraftNumber(kind: DocKind = "invoice"): Promise<string> {
  const business = await getBusiness();
  const settings = await getSettings();
  const year = new Date().getFullYear();
  const quote = isQuote(kind);
  return previewNextNumber(
    {
      nextSequence: quote
        ? (settings.nextQuoteSequence ?? 1)
        : settings.nextSequence,
      sequenceYear: quote
        ? (settings.quoteSequenceYear ?? year)
        : settings.sequenceYear,
    },
    quote ? business.quotePrefix || "QUO-" : business.invoicePrefix,
    year,
  );
}

export async function issueInvoice(id: string): Promise<Invoice> {
  const invoice = await db.invoices.get(id);
  if (!invoice) throw new Error("Document not found");
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
  const quote = isQuote(invoice.kind);
  const year = new Date(
    (linked.issueDate || todayISO()) + "T12:00:00",
  ).getFullYear();
  const prefix = quote ? business.quotePrefix || "QUO-" : business.invoicePrefix;
  const planned = planIssueNumber({
    reservedNumber: linked.number,
    state: {
      nextSequence: quote
        ? (settings.nextQuoteSequence ?? 1)
        : settings.nextSequence,
      sequenceYear: quote
        ? (settings.quoteSequenceYear ?? year)
        : settings.sequenceYear,
    },
    prefix,
    year,
    takenNumbers: await takenNumbers(documentKind(invoice.kind), invoice.id),
  });
  if (!planned.ok) {
    throw new Error(
      planned.error === "That number is already used"
        ? `That number is already used on another ${documentNounLower(invoice.kind)}`
        : planned.error,
    );
  }
  const { number, nextState } = planned;

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
    business: {
      ...businessToParty(business, logoId),
      accentColor: linked.accentColor || business.accentColor,
      fontPair: linked.fontPair || business.fontPair,
    },
    client: { ...linked.client },
    currency: linked.currency,
    taxMode: linked.taxMode,
    templateId: linked.templateId,
    customBackgroundDataUrl:
      custom?.source !== "design" ? custom?.backgroundDataUrl : undefined,
    customContentTopMm:
      custom?.source !== "design" ? custom?.contentTopMm : undefined,
    customContentStyle:
      custom?.source !== "design" ? custom?.contentStyle : undefined,
    designBaseTemplateId:
      custom?.source === "design" ? custom.baseTemplateId : undefined,
    issueDate: linked.issueDate,
    dueDate: linked.dueDate,
    notes: linked.notes,
    paymentInstructions: linked.paymentInstructions,
    lineItems: linked.lineItems.map((l) => ({ ...l })),
    totals,
    visibility: linked.visibility ? { ...linked.visibility } : undefined,
    logoSizePx: linked.logoSizePx ?? business.defaultLogoSizePx,
    sectionAccents: linked.sectionAccents
      ? { ...linked.sectionAccents }
      : undefined,
    decorations: fillLogoImages(
      linked.decorations?.map((d) => ({ ...d })),
      resolveLogoDataUrl(business, logoId),
    ),
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
    await saveSettings(sequencePatch(quote, nextState));
  });

  void import("@/lib/auto-backup").then(({ createAutoBackup }) =>
    createAutoBackup("issue", { force: true }),
  );

  return issued;
}

export async function updateIssuedDocumentNumber(
  id: string,
  rawNumber: string,
): Promise<Invoice> {
  const invoice = await db.invoices.get(id);
  if (!invoice) throw new Error("Document not found");
  if (invoice.status === "draft") {
    throw new Error("Save the draft to keep this number, or issue it");
  }
  const parsed = parseDocumentNumberInput(rawNumber, { allowEmpty: false });
  if (!parsed.ok || !parsed.value) {
    throw new Error(parsed.ok ? "Enter a number" : parsed.error);
  }
  const kind = documentKind(invoice.kind);
  if (numberIsTaken(parsed.value, await takenNumbers(kind, invoice.id))) {
    throw new Error(
      `That number is already used on another ${documentNounLower(kind)}`,
    );
  }

  const business = await getBusiness();
  const settings = await getSettings();
  const quote = isQuote(kind);
  const year = new Date(
    (invoice.issueDate || invoice.snapshot?.issueDate || todayISO()) +
      "T12:00:00",
  ).getFullYear();
  const nextState = bumpSequenceForUsedNumber(
    {
      nextSequence: quote
        ? (settings.nextQuoteSequence ?? 1)
        : settings.nextSequence,
      sequenceYear: quote
        ? (settings.quoteSequenceYear ?? year)
        : settings.sequenceYear,
    },
    quote ? business.quotePrefix || "QUO-" : business.invoicePrefix,
    year,
    parsed.value,
  );

  const next: Invoice = {
    ...invoice,
    number: parsed.value,
    snapshot: invoice.snapshot
      ? { ...invoice.snapshot, number: parsed.value }
      : invoice.snapshot,
    updatedAt: new Date().toISOString(),
  };

  await db.transaction("rw", db.invoices, db.settings, async () => {
    await db.invoices.put(next);
    await saveSettings(sequencePatch(quote, nextState));
  });

  return next;
}

export async function markInvoiceStatus(
  id: string,
  status: InvoiceStatus,
): Promise<Invoice> {
  const invoice = await db.invoices.get(id);
  if (!invoice) throw new Error("Document not found");
  if (invoice.status === "draft") {
    throw new Error("Issue the document first");
  }
  if (invoice.status === "void" && status !== "void") {
    throw new Error("Void documents cannot be reopened");
  }
  if (isQuote(invoice.kind)) {
    if (status === "paid" || status === "partial") {
      throw new Error("Quotes cannot be marked paid — convert to an invoice");
    }
    if (status === "issued" && invoice.status !== "issued") {
      throw new Error("Quotes cannot return to sent once accepted or declined");
    }
  }
  const now = new Date().toISOString();
  // Clear payment record when returning to unpaid (issued) or going fully paid.
  const clearPayments = status === "issued" || status === "paid";
  const next: Invoice = {
    ...invoice,
    status,
    amountPaid: clearPayments ? undefined : invoice.amountPaid,
    paidAt: clearPayments ? undefined : invoice.paidAt,
    updatedAt: now,
  };
  await db.invoices.put(next);
  return next;
}

/**
 * Record a partial payment against an invoice.
 * Sets status → "partial" and stores amountPaid + paidAt.
 */
export async function recordPartialPayment(
  id: string,
  amount: number,
  date: string,
): Promise<Invoice> {
  const invoice = await db.invoices.get(id);
  if (!invoice) throw new Error("Document not found");
  if (invoice.status === "draft") throw new Error("Issue the invoice first");
  if (invoice.status === "void") throw new Error("Void invoices cannot be updated");
  if (isQuote(invoice.kind)) throw new Error("Quotes cannot have partial payments");
  if (amount <= 0) throw new Error("Amount must be greater than 0");
  const total = invoice.totals.total;
  if (amount >= total) throw new Error("Use Mark paid for a full payment");
  const next: Invoice = {
    ...invoice,
    status: "partial",
    amountPaid: amount,
    paidAt: date,
    updatedAt: new Date().toISOString(),
  };
  await db.invoices.put(next);
  return next;
}

export async function convertQuoteToInvoice(quoteId: string): Promise<Invoice> {
  const quote = await db.invoices.get(quoteId);
  if (!quote || !isQuote(quote.kind)) {
    throw new Error("Quote not found");
  }
  if (quote.status === "draft") {
    throw new Error("Send the quote before converting it to an invoice");
  }
  if (quote.status === "void" || quote.status === "declined") {
    throw new Error("This quote cannot be converted");
  }
  if (quote.convertedInvoiceId) {
    const existing = await db.invoices.get(quote.convertedInvoiceId);
    if (existing) return existing;
  }

  const invoice = await createDraftInvoice({
    fromInvoiceId: quote.id,
    kind: "invoice",
    sourceQuoteId: quote.id,
  });
  const now = new Date().toISOString();
  await db.invoices.put({
    ...quote,
    status: "accepted",
    convertedInvoiceId: invoice.id,
    updatedAt: now,
  });
  return invoice;
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
  if (snapshot.designBaseTemplateId) {
    return {
      id: "snapshot-design",
      name: "Issued design",
      source: "design",
      accentColor: snapshot.business.accentColor,
      baseTemplateId: snapshot.designBaseTemplateId,
      fontPair: snapshot.business.fontPair,
      sectionAccents: snapshot.sectionAccents,
      decorations: snapshot.decorations,
      logoSizePx: snapshot.logoSizePx,
      visibility: snapshot.visibility,
      createdAt: snapshot.issuedAt,
    };
  }
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
      kind: documentKind(invoice.kind),
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
      logoSizePx: invoice.snapshot.logoSizePx ?? invoice.logoSizePx,
      sectionAccents: invoice.snapshot.sectionAccents ?? invoice.sectionAccents,
      decorations: fillLogoImages(
        invoice.snapshot.decorations ?? invoice.decorations,
        invoice.snapshot.business.logoDataUrl,
      ),
      customTemplate: customFromSnapshot(invoice.snapshot),
    };
  }
  return {
    kind: documentKind(invoice.kind),
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
    fontPair: invoice.fontPair,
    logoSizePx: invoice.logoSizePx,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    notes: invoice.notes,
    paymentInstructions: invoice.paymentInstructions,
    lineItems: invoice.lineItems,
    totals: invoice.totals,
    status: invoice.status,
    visibility: invoice.visibility,
    sectionAccents: invoice.sectionAccents,
    decorations: invoice.decorations,
  };
}

export async function displayDocumentLive(
  invoice: Invoice,
): Promise<InvoiceViewModel> {
  if (invoice.snapshot) {
    const doc = displayDocument(invoice);
    if (
      invoice.templateId.startsWith("custom:") &&
      doc.customTemplate?.source !== "design" &&
      !doc.customTemplate?.backgroundDataUrl
    ) {
      const custom = (await getCustomTemplate(invoice.templateId)) ?? null;
      if (custom) return { ...doc, customTemplate: custom };
    }
    return doc;
  }
  const business = normalizeBusinessLogos(await getBusiness());
  const reserved = parseDocumentNumberInput(invoice.number ?? "", {
    allowEmpty: true,
  });
  const peek =
    reserved.ok && reserved.value
      ? reserved.value
      : invoice.status === "draft"
        ? await peekDraftNumber(documentKind(invoice.kind))
        : (invoice.number ?? "—");

  let customTemplate: CustomTemplate | null = null;
  let accent = invoice.accentColor || business.accentColor;
  if (invoice.templateId.startsWith("custom:")) {
    customTemplate = (await getCustomTemplate(invoice.templateId)) ?? null;
    if (customTemplate?.source !== "design" && customTemplate) {
      accent = customTemplate.accentColor || accent;
    }
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

  const designDecorations =
    customTemplate?.source === "design" ? customTemplate.decorations : undefined;

  const vis = resolveVisibility(invoice.visibility);
  const layoutId = isBuiltinTemplateId(invoice.templateId)
    ? invoice.templateId
    : customTemplate?.source === "design" && customTemplate.baseTemplateId
      ? customTemplate.baseTemplateId
      : undefined;

  const logoDataUrl = resolveLogoDataUrl(business, logoId);

  let decorations =
    invoice.decorations?.length
      ? invoice.decorations
      : designDecorations?.length
        ? designDecorations
        : layoutId
          ? buildTemplateDecorations(layoutId, accent)
          : undefined;

  if (invoice.status === "draft") {
    decorations = syncIdentityDecorations(decorations, {
      accent,
      logoVisible: vis.logo,
      nameVisible: vis.businessName,
      imageDataUrl: logoDataUrl,
      nameFill: defaultBusinessNameFill(layoutId),
    });
  } else {
    decorations = fillLogoImages(decorations, vis.logo ? logoDataUrl : undefined);
  }

  return {
    kind: documentKind(invoice.kind),
    number: peek,
    business: businessToParty(business, logoId),
    client: invoice.client,
    currency: invoice.currency,
    taxMode: invoice.taxMode,
    templateId: invoice.templateId,
    accentColor: accent,
    fontPair: invoice.fontPair ?? business.fontPair,
    logoSizePx: invoice.logoSizePx ?? business.defaultLogoSizePx,
    logoDataUrl,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    notes: invoice.notes,
    paymentInstructions: invoice.paymentInstructions,
    lineItems: invoice.lineItems,
    totals: recomputeTotals(invoice),
    status: invoice.status,
    visibility: invoice.visibility,
    customTemplate,
    sectionAccents: invoice.sectionAccents,
    decorations,
  };
}

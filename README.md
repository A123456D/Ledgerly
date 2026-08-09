# Ledgerly

Freelancer invoice maker focused on **design**, **speed**, and **compliance**.

Local-first (IndexedDB). No account. Numbers lock on issue. Beautiful A4 templates + PDF export + send.

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Send invoices

On any invoice, click **Send**. The app builds the PDF and:

1. Opens the system share sheet with the PDF attached when supported, or
2. Emails via [Resend](https://resend.com) if you set env vars, or
3. Downloads the PDF and opens your mail app (attach the file before sending)

```bash
# optional — one-click email from the server
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL="Ledgerly <billing@yourdomain.com>"
```

```bash
npm test
npm run build
```

## Flow

1. **Settings** — business name, VAT/tax ID, currency, tax mode, prefix, logo, accent
2. **Clients** / **Catalog** — reuse bill-to and line presets
3. **New invoice** — live preview (Classic / Minimal / Bold) → **Issue** → **Download PDF**

Drafts never consume invoice numbers. Voiding does not reuse a number. Issued invoices freeze a snapshot so later brand edits do not rewrite history.

## Stack

Next.js · TypeScript · Tailwind · Dexie · `@react-pdf/renderer` · Vitest

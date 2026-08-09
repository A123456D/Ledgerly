import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Body = {
  to?: string;
  subject?: string;
  message?: string;
  fromName?: string;
  fromEmail?: string;
  filename?: string;
  pdfBase64?: string;
  invoiceNumber?: string;
};

export async function POST(req: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.RESEND_FROM_EMAIL ||
    process.env.INVOICE_FROM_EMAIL ||
    "";

  if (!apiKey || !from) {
    return NextResponse.json(
      {
        error:
          "Email sending is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.",
        configured: false,
      },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const to = body.to?.trim();
  const subject = body.subject?.trim();
  const message = body.message?.trim() || "";
  const filename = body.filename || "invoice.pdf";
  const pdfBase64 = body.pdfBase64;

  if (!to || !to.includes("@") || !subject || !pdfBase64) {
    return NextResponse.json(
      { error: "Missing to, subject, or PDF attachment" },
      { status: 400 },
    );
  }

  const html = message
    .split("\n")
    .map((line) => `<p style="margin:0 0 8px;white-space:pre-wrap">${escapeHtml(line) || "&nbsp;"}</p>`)
    .join("");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: body.fromName ? `${body.fromName} <${from}>` : from,
      to: [to],
      subject,
      html: `<div style="font-family:Georgia,serif;font-size:15px;line-height:1.5;color:#1c1917">${html}</div>`,
      text: message,
      attachments: [
        {
          filename,
          content: pdfBase64,
        },
      ],
      reply_to: body.fromEmail || undefined,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    id?: string;
    message?: string;
    error?: { message?: string };
  };

  if (!res.ok) {
    return NextResponse.json(
      {
        error:
          data.error?.message ||
          data.message ||
          "Resend rejected the email",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, id: data.id });
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

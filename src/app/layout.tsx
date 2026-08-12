import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import {
  Fraunces,
  Source_Sans_3,
  IBM_Plex_Mono,
  Outfit,
} from "next/font/google";
import { AppShell } from "@/components/ui";
import "./globals.css";

const display = Fraunces({
  variable: "--font-editorial-display",
  subsets: ["latin"],
});

const body = Source_Sans_3({
  variable: "--font-editorial-body",
  subsets: ["latin"],
});

const modern = Outfit({
  variable: "--font-modern",
  subsets: ["latin"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const rootFontVars = {
  ["--font-display"]: "var(--font-editorial-display)",
  ["--font-body"]: "var(--font-editorial-body)",
} as CSSProperties;

export const metadata: Metadata = {
  title: "Ledgerly — Freelancer Invoice Maker",
  description:
    "Beautiful, fast, compliant invoices for freelancers. Local-first. No account required.",
  applicationName: "Ledgerly",
  appleWebApp: {
    capable: true,
    title: "Ledgerly",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${modern.variable} ${mono.variable} h-full antialiased`}
      style={rootFontVars}
    >
      <body className="min-h-full flex flex-col">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

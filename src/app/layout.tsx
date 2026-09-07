import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import {
  Fraunces,
  Source_Sans_3,
  IBM_Plex_Mono,
  Outfit,
  Lora,
} from "next/font/google";
import { AppShell } from "@/components/ui";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
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

const classicDisplay = Lora({
  variable: "--font-classic-display",
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
  title: `${APP_NAME} — ${APP_TAGLINE}`,
  description:
    "Beautiful, fast, compliant invoices for freelancers. Local-first. No account required.",
  applicationName: APP_NAME,
  appleWebApp: {
    capable: true,
    title: APP_NAME,
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
      className={`${display.variable} ${body.variable} ${modern.variable} ${classicDisplay.variable} ${mono.variable} h-full overflow-x-clip antialiased`}
      style={rootFontVars}
    >
      <body className="flex min-h-full max-w-[100vw] flex-col overflow-x-clip touch-manipulation">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

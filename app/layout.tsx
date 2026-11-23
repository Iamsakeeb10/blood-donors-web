import type { Metadata, Viewport } from "next";
import { Noto_Sans_Bengali } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { M } from "@/lib/messages";

const bengali = Noto_Sans_Bengali({
  subsets: ["bengali", "latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--font-bengali",
});

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")
).replace(/\/+$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: M.appNameFull,
    template: `%s · ${M.appNameFull}`,
  },
  description: M.description,
  applicationName: M.appNameFull,
  openGraph: {
    type: "website",
    locale: "bn_BD",
    siteName: M.appNameFull,
    title: M.appNameFull,
    description: M.description,
    url: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  appleWebApp: {
    capable: true,
    title: M.appName,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#C4271F",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="bn" className={bengali.variable}>
      <body className="min-h-dvh bg-paper font-sans text-ink antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

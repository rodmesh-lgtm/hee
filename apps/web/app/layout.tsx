import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { IBM_Plex_Sans_Arabic, Inter } from "next/font/google";
import { LanguageSwitcher } from "../components/language-switcher";
import { LOCALE_META, SITE_MESSAGES } from "./lib/i18n";
import { getRequestLocale } from "./lib/i18n-server";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({ variable: "--font-ibm-plex-sans-arabic", subsets: ["arabic"], weight: ["400", "500", "600", "700"] });

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const site = SITE_MESSAGES[locale];
  return {
    metadataBase: new URL("https://ir.sa"),
    title: { default: site.title, template: "%s | iR" },
    description: site.description,
    keywords: site.keywords,
    authors: [{ name: "iR" }],
    creator: "iR",
    publisher: "iR",
    robots: { index: true, follow: true },
    openGraph: {
      title: site.title,
      description: site.description,
      url: "https://ir.sa",
      siteName: "iR",
      locale: site.ogLocale,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: site.title,
      description: site.description,
    },
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getRequestLocale();
  const localeMeta = LOCALE_META[locale];

  return (
    <html lang={localeMeta.htmlLang} dir={localeMeta.dir} suppressHydrationWarning className={`${inter.variable} ${ibmPlexSansArabic.variable} h-full antialiased`}>
      <head><link rel="stylesheet" href="/brand/ir-floating-header.css" /></head>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        {children}
        <Suspense fallback={null}><LanguageSwitcher locale={locale} /></Suspense>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { IBM_Plex_Sans_Arabic, Inter } from "next/font/google";
import { LanguageSwitcher } from "../components/language-switcher";
import { LOCALE_META } from "./lib/i18n";
import { getRequestLocale } from "./lib/i18n-server";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({ variable: "--font-ibm-plex-sans-arabic", subsets: ["arabic"], weight: ["400", "500", "600", "700"] });

const description = "HEE منصة هوية أعمال رقمية تساعد الشركات والمؤسسات والمتاجر ومقدمي الخدمات على إنشاء صفحة أعمال احترافية موثوقة وسهلة المشاركة.";

export const metadata: Metadata = {
  metadataBase: new URL("https://hee.sa"),
  title: { default: "HEE | هوية أعمال رقمية", template: "%s | HEE" },
  description,
  keywords: ["HEE", "هوية أعمال رقمية", "صفحة أعمال", "هوية شركة", "ملف أعمال رقمي", "الشركات", "المؤسسات", "السعودية"],
  authors: [{ name: "HEE" }],
  creator: "HEE",
  publisher: "HEE",
  robots: { index: true, follow: true },
  openGraph: {
    title: "HEE | هوية أعمال رقمية",
    description,
    url: "https://hee.sa",
    siteName: "HEE",
    locale: "ar_SA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HEE | هوية أعمال رقمية",
    description,
  },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getRequestLocale();
  const localeMeta = LOCALE_META[locale];

  return (
    <html lang={localeMeta.htmlLang} dir={localeMeta.dir} suppressHydrationWarning className={`${inter.variable} ${ibmPlexSansArabic.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        {children}
        <Suspense fallback={null}><LanguageSwitcher locale={locale} /></Suspense>
      </body>
    </html>
  );
}

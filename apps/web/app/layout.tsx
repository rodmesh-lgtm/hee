import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-ibm-plex-sans-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://hee.sa"),
  title: {
    default: "HEE",
    template: "%s | HEE",
  },
  description:
    "منصة احترافية لإدارة النشاط التجاري، الطلبات، والعروض من واجهة واحدة، مع تجربة عربية غنية وتجهيز جاهز للتوسع.",
  keywords: [
    "HEE",
    "منصة أعمال",
    "إدارة نشاط",
    "عيادات",
    "مطاعم",
    "متاجر",
    "صفحة أعمال",
    "السعودية",
  ],
  authors: [{ name: "HEE" }],
  creator: "HEE",
  publisher: "HEE",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "HEE | المنصة الرقمية للأعمال",
    description:
      "منصة احترافية لإدارة النشاط التجاري، الطلبات، والعروض من واجهة واحدة، مع تجربة عربية غنية وتجهيز جاهز للتوسع.",
    url: "https://hee.sa",
    siteName: "HEE",
    locale: "ar_SA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HEE | المنصة الرقمية للأعمال",
    description:
      "منصة احترافية لإدارة النشاط التجاري، الطلبات، والعروض من واجهة واحدة، مع تجربة عربية غنية وتجهيز جاهز للتوسع.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      className={`${inter.variable} ${ibmPlexSansArabic.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">{children}</body>
    </html>
  );
}

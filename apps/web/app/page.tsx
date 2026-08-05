import type { Metadata } from "next";
import { HomepagePremium } from "../components/homepage-premium";

export const metadata: Metadata = {
  title: "صفحتك التجارية في رابط واحد",
  description:
    "أنشئ صفحة احترافية لنشاطك، اجمع روابطك وخدماتك ومنتجاتك وطرق التواصل في مكان واحد، وشاركها مع عملائك بسهولة.",
  openGraph: {
    title: "HEE | صفحتك التجارية في رابط واحد",
    description:
      "أنشئ صفحة احترافية لنشاطك، اجمع روابطك وخدماتك ومنتجاتك وطرق التواصل في مكان واحد، وشاركها مع عملائك بسهولة.",
    url: "/",
    siteName: "HEE",
    locale: "ar_SA",
    type: "website",
  },
  alternates: {
    canonical: "/",
  },
};

export default function Home() {
  return <HomepagePremium />;
}
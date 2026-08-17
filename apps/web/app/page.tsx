import type { Metadata } from "next";
import { HomepagePremium } from "../components/homepage-premium";

const description = "أنشئ هوية أعمال رقمية احترافية لمنشأتك في رابط واحد يعرض معلوماتها وخدماتها وفروعها وفريقها وطرق التواصل بوضوح.";

export const metadata: Metadata = {
  title: "هوية أعمال رقمية لمنشأتك",
  description,
  openGraph: {
    title: "HEE | هوية أعمال رقمية لمنشأتك",
    description,
    url: "/",
    siteName: "HEE",
    locale: "ar_SA",
    type: "website",
  },
  alternates: { canonical: "/" },
};

export default function Home() {
  return <HomepagePremium />;
}

import type { Metadata } from "next";
import { HomepageProfessional } from "../components/homepage-professional";

const description = "أنشئ مع iR هوية أعمال رقمية احترافية لمنشأتك في رابط واحد على ir.sa يعرض معلوماتها وخدماتها وفروعها وفريقها وطرق التواصل بوضوح.";

export const metadata: Metadata = {
  title: "iR | هوية أعمال رقمية لمنشأتك",
  description,
  openGraph: {
    title: "iR | هوية أعمال رقمية لمنشأتك",
    description,
    url: "/",
    siteName: "iR",
    locale: "ar_SA",
    type: "website",
  },
  alternates: { canonical: "/" },
};

export default function Home() {
  return <HomepageProfessional />;
}

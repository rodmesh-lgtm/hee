import type { Metadata } from "next";
import { HomepageProfessional } from "../components/homepage-professional";

const description = "iR منصة سعودية لهوية الأعمال الرقمية تجمع معلومات المنشأة وخدماتها وفروعها وطرق التواصل، وتطور حلول WhatsApp Business Platform الرسمية للأعمال.";

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

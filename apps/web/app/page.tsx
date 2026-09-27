import { readPlatformDesign } from "./lib/platform-design";
import type { Metadata } from "next";
import { HomepageProfessional } from "../components/homepage-professional";
const description="INFRO منصة سعودية لهوية الأعمال الرقمية والتسويقية تجمع معلومات المنشأة وخدماتها وفروعها وطرق التواصل، وتطور حلول WhatsApp Business Platform الرسمية للأعمال.";
const defaultMetadata:Metadata={title:"INFRO | هويتك الرقمية والتسويقية",description,openGraph:{title:"INFRO | هويتك الرقمية والتسويقية",description,url:"/",siteName:"INFRO",locale:"ar_SA",type:"website"},alternates:{canonical:"/"}};
export async function generateMetadata(): Promise<Metadata> {
  const { published: d } = await readPlatformDesign();
  // A layout title template does not apply to its own index page.
  const title = d.seoTitleAr.includes(d.brandNameEn) ? d.seoTitleAr : `${d.seoTitleAr} | ${d.brandNameEn}`;
  return { ...defaultMetadata, title:{absolute:title}, description:d.seoDescriptionAr, openGraph:{...defaultMetadata.openGraph,title,description:d.seoDescriptionAr,images:d.ogImageUrl?[d.ogImageUrl]:undefined} };
}
export default function Home(){return <HomepageProfessional/>}

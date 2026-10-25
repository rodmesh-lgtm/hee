import { uiText } from "./lib/ui-i18n";
import { readPlatformDesign } from "./lib/platform-design";
import type { Metadata } from "next";
import { HomepageProfessional } from "../components/homepage-professional";
import { getRequestLocale } from "./lib/i18n-server";
import { SITE_MESSAGES } from "./lib/i18n";
const description="INFRO منصة سعودية لهوية الأعمال الرقمية والتسويقية تجمع معلومات المنشأة وخدماتها وفروعها وطرق التواصل، وتطور حلول WhatsApp Business Platform الرسمية للأعمال.";
const defaultMetadata:Metadata={title:"INFRO | هويتك الرقمية والتسويقية",description,openGraph:{title:"INFRO | هويتك الرقمية والتسويقية",description,url:"/",siteName:"INFRO",locale:"ar_SA",type:"website"},alternates:{canonical:"/"}};
export async function generateMetadata(): Promise<Metadata> {
  const [{ published: d }, locale] = await Promise.all([readPlatformDesign(), getRequestLocale()]);
  const site = SITE_MESSAGES[locale];
  // A layout title template does not apply to its own index page.
  const configuredTitle = locale === "ar" ? d.seoTitleAr : locale === "en" ? d.seoTitleEn : site.title.replace("iR", "INFRO");
  const serviceSummary = !["ar","en"].includes(locale) || /هويتك الرقمية|Digital.*Identity/i.test(configuredTitle);
  const localizedTitle = serviceSummary ? uiText(locale,"الهوية والتشغيل والتسويق") : configuredTitle;
  const title = localizedTitle.includes(d.brandNameEn) ? localizedTitle : `${localizedTitle} | ${d.brandNameEn}`;
  const localizedDescription = serviceSummary ? uiText(locale,"الهوية الرقمية، الكاشير والمحاسبة والمواعيد، تسويق واتساب والمشاهدة المباشرة المؤقتة.") : locale === "ar" ? d.seoDescriptionAr : locale === "en" ? d.seoDescriptionEn : site.description;
  return { ...defaultMetadata, title:{absolute:title}, description:localizedDescription, openGraph:{...defaultMetadata.openGraph,title,description:localizedDescription,locale:site.ogLocale,images:d.ogImageUrl?[d.ogImageUrl]:undefined} };
}
export default async function Home(){const locale=await getRequestLocale();return <HomepageProfessional locale={locale}/>}

import type { Metadata } from "next";
import { HomepageProfessional } from "../components/homepage-professional";
import {
  DEFAULT_PLATFORM_DESIGN,
  readPlatformDesign,
} from "./lib/platform-design";
async function design() {
  try {
    return (await readPlatformDesign()).published;
  } catch {
    return DEFAULT_PLATFORM_DESIGN;
  }
}
export async function generateMetadata(): Promise<Metadata> {
  const d = await design();
  return {
    title: d.seoTitleAr,
    description: d.seoDescriptionAr,
    keywords: d.seoKeywords,
    robots: { index: d.robotsIndex, follow: d.robotsFollow },
    openGraph: {
      title: d.seoTitleAr,
      description: d.seoDescriptionAr,
      url: "/",
      siteName: d.brandNameEn,
      locale: "ar_SA",
      type: "website",
      images: d.ogImageUrl ? [d.ogImageUrl] : undefined,
    },
    alternates: { canonical: "/" },
  };
}
export default async function Home() {
  return <HomepageProfessional design={await design()} />;
}

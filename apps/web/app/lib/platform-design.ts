import { Prisma } from "@prisma/client";
import { db } from "./db";
import {
  DEFAULT_PLATFORM_BRAND,
  PLATFORM_BRAND_SETTING_KEY,
  type PlatformBrandConfig,
} from "../../lib/platform-brand-config";
export type PlatformDesignConfig = PlatformBrandConfig & {
  headerCtaLabel: string;
  headerCtaHref: string;
  headerLoginLabel: string;
  headerAboutLabel: string;
  headerFeaturesLabel: string;
  headerSamplesLabel: string;
  headerPricingLabel: string;
  footerCopyright: string;
  footerDescription: string;
  homeHeroBadge: string;
  homeHeroTitleAr: string;
  homeHeroAccentAr: string;
  homeHeroSubtitleAr: string;
  homeAboutTitle: string;
  homeAboutBody: string;
  homeLegalName: string;
  homeWhatsAppTitle: string;
  homeWhatsAppBody: string;
  homeContactTitle: string;
  homeContactBody: string;
  homeContactPhone: string;
  homeProcessEyebrow: string;
  homeProcessTitle: string;
  homeSamplesEyebrow: string;
  homeSamplesTitle: string;
  homeSamplesSubtitle: string;
  homePricingEyebrow: string;
  homePricingTitle: string;
  homeCtaTitle: string;
  homeCtaSubtitle: string;
  homeCtaLabel: string;
  homeCtaHref: string;
  homeFeaturesEnabled: boolean;
  homeAboutEnabled: boolean;
  homeProcessEnabled: boolean;
  homeSamplesEnabled: boolean;
  homePricingEnabled: boolean;
  homeCtaEnabled: boolean;
  trustSealEnabled: boolean;
  trustSealToken: string;
  customerHeaderEnabled: boolean;
  customerFooterEnabled: boolean;
};
export const DEFAULT_PLATFORM_DESIGN: PlatformDesignConfig = {
  ...DEFAULT_PLATFORM_BRAND,
  headerCtaLabel: "ابدأ مجانًا",
  headerCtaHref: "/register",
  headerLoginLabel: "دخول",
  headerAboutLabel: "عن INFRO",
  headerFeaturesLabel: "المميزات",
  headerSamplesLabel: "نماذج الصفحات",
  headerPricingLabel: "الباقات",
  footerCopyright: "INFRO © جميع الحقوق محفوظة",
  footerDescription:
    "منصة سعودية لهوية الأعمال الرقمية والتسويقية. اجمع حضور منشأتك في رابط واحد احترافي.",
  homeHeroBadge: "مصممة للأعمال والمنشآت",
  homeHeroTitleAr: "هويتك الرقمية.",
  homeHeroAccentAr: "في رابط واحد.",
  homeHeroSubtitleAr:
    "اجمع معلومات منشأتك وخدماتها وفروعها وفريقها وطرق التواصل في صفحة احترافية واحدة سهلة المشاركة.",
  homeAboutTitle: "INFRO لهوية الأعمال الرقمية",
  homeAboutBody:
    "INFRO مشروع تقني سعودي يساعد المنشآت على بناء هوية أعمال رقمية موثوقة ومنظمة في رابط واحد، تجمع التعريف بالنشاط والخدمات والمنتجات والفروع والفريق ووسائل التواصل، لتمنح العملاء صورة واضحة وتجربة وصول أسرع.",
  homeLegalName: "مجموعة طلبات المعلومات لخدمات الأعمال",
  homeWhatsAppTitle: "WhatsApp Business Platform الرسمي",
  homeWhatsAppBody:
    "تتضمن منظومة INFRO خدمة WhatsApp Marketing المبنية حصريًا على WhatsApp Business Platform / Cloud API الرسمي من Meta، لربط كل منشأة بحساب WABA ورقمها الخاص وإدارة القوالب والحملات والمحادثات، مع احترام موافقة العملاء والخصوصية وإلغاء الاشتراك.",
  homeContactTitle: "يسعدنا تواصلك",
  homeContactBody:
    "للاستفسارات المتعلقة بمنصة INFRO أو خدمات WhatsApp Business الرسمية، تواصل معنا عبر الرقم المسجل في بياناتنا الرسمية.",
  homeContactPhone: "0564212464",
  homeProcessEyebrow: "من الفكرة إلى رابطك",
  homeProcessTitle: "ابدأ في 3 خطوات واضحة",
  homeSamplesEyebrow: "مرنة لكل نشاط",
  homeSamplesTitle: "صفحة تبدو كجزء من علامتك",
  homeSamplesSubtitle:
    "من المطاعم والعيادات إلى المتاجر وشركات الخدمات، صُممت INFRO لتعرض أهم ما يحتاجه عميلك بسرعة ووضوح.",
  homePricingEyebrow: "باقات تناسب نموك",
  homePricingTitle: "ابدأ مجانًا، وطوّر حضورك عند الحاجة",
  homeCtaTitle: "اسم منشأتك يستحق رابطًا يليق بها.",
  homeCtaSubtitle: "تحقق من توفره الآن وابدأ بناء حضورك الرقمي على INFRO.",
  homeCtaLabel: "تحقق من اسم رابطك",
  homeCtaHref: "#home",
  homeFeaturesEnabled: true,
  homeAboutEnabled: true,
  homeProcessEnabled: true,
  homeSamplesEnabled: true,
  homePricingEnabled: true,
  homeCtaEnabled: true,
  trustSealEnabled: true,
  trustSealToken: "M2J3UGwxOXk4OVpzT2F1bW1zSVI0Zz09",
  customerHeaderEnabled: true,
  customerFooterEnabled: true,
};
const HEX = /^#[0-9a-fA-F]{6}$/;
const safeText = (v: unknown, f: string, m = 300) =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, m) : f;
const safeUrl = (v: unknown, f: string | null) => {
  if (v === null || v === "") return null;
  if (typeof v !== "string") return f;
  const s = v.trim();
  if (s.startsWith("/")) return s.slice(0, 1000);
  try {
    const u = new URL(s);
    return u.protocol === "https:" ? u.toString().slice(0, 1000) : f;
  } catch {
    return f;
  }
};
const color = (v: unknown, f: string) =>
  typeof v === "string" && HEX.test(v) ? v.toLowerCase() : f;
const bool = (v: unknown, f: boolean) => (typeof v === "boolean" ? v : f);
export function sanitizePlatformDesign(input: unknown): PlatformDesignConfig {
  const x =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};
  const d = DEFAULT_PLATFORM_DESIGN;
  return {
    ...d,
    brandNameAr: safeText(x.brandNameAr, d.brandNameAr, 80),
    brandNameEn: safeText(x.brandNameEn, d.brandNameEn, 80),
    logoUrl: safeUrl(x.logoUrl, d.logoUrl),
    logoDarkUrl: safeUrl(x.logoDarkUrl, d.logoDarkUrl),
    faviconUrl: safeUrl(x.faviconUrl, d.faviconUrl),
    primaryColor: color(x.primaryColor, d.primaryColor),
    secondaryColor: color(x.secondaryColor, d.secondaryColor),
    accentColor: color(x.accentColor, d.accentColor),
    backgroundColor: color(x.backgroundColor, d.backgroundColor),
    foregroundColor: color(x.foregroundColor, d.foregroundColor),
    headerBackground: color(x.headerBackground, d.headerBackground),
    headerForeground: color(x.headerForeground, d.headerForeground),
    footerBackground: color(x.footerBackground, d.footerBackground),
    footerForeground: color(x.footerForeground, d.footerForeground),
    seoTitleAr: safeText(x.seoTitleAr, d.seoTitleAr, 120),
    seoTitleEn: safeText(x.seoTitleEn, d.seoTitleEn, 120),
    seoDescriptionAr: safeText(x.seoDescriptionAr, d.seoDescriptionAr, 320),
    seoDescriptionEn: safeText(x.seoDescriptionEn, d.seoDescriptionEn, 320),
    seoKeywords: Array.isArray(x.seoKeywords)
      ? x.seoKeywords
          .filter((v): v is string => typeof v === "string")
          .map((v) => v.trim().slice(0, 60))
          .filter(Boolean)
          .slice(0, 30)
      : d.seoKeywords,
    ogImageUrl: safeUrl(x.ogImageUrl, d.ogImageUrl),
    robotsIndex: bool(x.robotsIndex, d.robotsIndex),
    robotsFollow: bool(x.robotsFollow, d.robotsFollow),
    customerPageBrandingEnabled: bool(
      x.customerPageBrandingEnabled,
      d.customerPageBrandingEnabled,
    ),
    headerCtaLabel: safeText(x.headerCtaLabel, d.headerCtaLabel, 60),
    headerCtaHref: safeUrl(x.headerCtaHref, d.headerCtaHref) ?? d.headerCtaHref,
    headerLoginLabel: safeText(x.headerLoginLabel, d.headerLoginLabel, 40),
    headerAboutLabel: safeText(x.headerAboutLabel, d.headerAboutLabel, 40),
    headerFeaturesLabel: safeText(
      x.headerFeaturesLabel,
      d.headerFeaturesLabel,
      40,
    ),
    headerSamplesLabel: safeText(
      x.headerSamplesLabel,
      d.headerSamplesLabel,
      40,
    ),
    headerPricingLabel: safeText(
      x.headerPricingLabel,
      d.headerPricingLabel,
      40,
    ),
    footerCopyright: safeText(x.footerCopyright, d.footerCopyright, 160),
    footerDescription: safeText(x.footerDescription, d.footerDescription, 320),
    homeHeroBadge: safeText(x.homeHeroBadge, d.homeHeroBadge, 100),
    homeHeroTitleAr: safeText(x.homeHeroTitleAr, d.homeHeroTitleAr, 160),
    homeHeroAccentAr: safeText(x.homeHeroAccentAr, d.homeHeroAccentAr, 160),
    homeHeroSubtitleAr: safeText(
      x.homeHeroSubtitleAr,
      d.homeHeroSubtitleAr,
      500,
    ),
    homeAboutTitle: safeText(x.homeAboutTitle, d.homeAboutTitle, 160),
    homeAboutBody: safeText(x.homeAboutBody, d.homeAboutBody, 1200),
    homeLegalName: safeText(x.homeLegalName, d.homeLegalName, 180),
    homeWhatsAppTitle: safeText(x.homeWhatsAppTitle, d.homeWhatsAppTitle, 160),
    homeWhatsAppBody: safeText(x.homeWhatsAppBody, d.homeWhatsAppBody, 1000),
    homeContactTitle: safeText(x.homeContactTitle, d.homeContactTitle, 120),
    homeContactBody: safeText(x.homeContactBody, d.homeContactBody, 600),
    homeContactPhone: safeText(x.homeContactPhone, d.homeContactPhone, 30),
    homeProcessEyebrow: safeText(
      x.homeProcessEyebrow,
      d.homeProcessEyebrow,
      80,
    ),
    homeProcessTitle: safeText(x.homeProcessTitle, d.homeProcessTitle, 160),
    homeSamplesEyebrow: safeText(
      x.homeSamplesEyebrow,
      d.homeSamplesEyebrow,
      80,
    ),
    homeSamplesTitle: safeText(x.homeSamplesTitle, d.homeSamplesTitle, 160),
    homeSamplesSubtitle: safeText(
      x.homeSamplesSubtitle,
      d.homeSamplesSubtitle,
      500,
    ),
    homePricingEyebrow: safeText(
      x.homePricingEyebrow,
      d.homePricingEyebrow,
      80,
    ),
    homePricingTitle: safeText(x.homePricingTitle, d.homePricingTitle, 160),
    homeCtaTitle: safeText(x.homeCtaTitle, d.homeCtaTitle, 180),
    homeCtaSubtitle: safeText(x.homeCtaSubtitle, d.homeCtaSubtitle, 500),
    homeCtaLabel: safeText(x.homeCtaLabel, d.homeCtaLabel, 80),
    homeCtaHref: safeUrl(x.homeCtaHref, d.homeCtaHref) ?? d.homeCtaHref,
    homeFeaturesEnabled: bool(x.homeFeaturesEnabled, d.homeFeaturesEnabled),
    homeAboutEnabled: bool(x.homeAboutEnabled, d.homeAboutEnabled),
    homeProcessEnabled: bool(x.homeProcessEnabled, d.homeProcessEnabled),
    homeSamplesEnabled: bool(x.homeSamplesEnabled, d.homeSamplesEnabled),
    homePricingEnabled: bool(x.homePricingEnabled, d.homePricingEnabled),
    homeCtaEnabled: bool(x.homeCtaEnabled, d.homeCtaEnabled),
    trustSealEnabled: bool(x.trustSealEnabled, d.trustSealEnabled),
    trustSealToken:
      typeof x.trustSealToken === "string" &&
      /^[A-Za-z0-9+/=]{20,160}$/.test(x.trustSealToken.trim())
        ? x.trustSealToken.trim()
        : d.trustSealToken,
    customerHeaderEnabled: bool(
      x.customerHeaderEnabled,
      d.customerHeaderEnabled,
    ),
    customerFooterEnabled: bool(
      x.customerFooterEnabled,
      d.customerFooterEnabled,
    ),
  };
}
export async function readPlatformDesign() {
  try {
    const rows = await db.$queryRaw<
      Array<{ draft: unknown; published: unknown; publishedAt: Date | null }>
    >(
      Prisma.sql`SELECT "draft","published","publishedAt" FROM "PlatformDesignSetting" WHERE "key"=${PLATFORM_BRAND_SETTING_KEY} LIMIT 1`,
    );
    const r = rows[0];
    return {
      draft: sanitizePlatformDesign(r?.draft),
      published: sanitizePlatformDesign(r?.published),
      publishedAt: r?.publishedAt ?? null,
    };
  } catch {
    return {
      draft: DEFAULT_PLATFORM_DESIGN,
      published: DEFAULT_PLATFORM_DESIGN,
      publishedAt: null,
    };
  }
}

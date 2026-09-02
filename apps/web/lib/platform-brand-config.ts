export type PlatformBrandConfig = {
  brandNameAr: string;
  brandNameEn: string;
  logoUrl: string | null;
  logoDarkUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  foregroundColor: string;
  headerBackground: string;
  headerForeground: string;
  footerBackground: string;
  footerForeground: string;
  seoTitleAr: string;
  seoTitleEn: string;
  seoDescriptionAr: string;
  seoDescriptionEn: string;
  seoKeywords: string[];
  ogImageUrl: string | null;
  robotsIndex: boolean;
  robotsFollow: boolean;
  customerPageBrandingEnabled: boolean;
};

export const DEFAULT_PLATFORM_BRAND: PlatformBrandConfig = {
  brandNameAr: "انفرو",
  brandNameEn: "INFRO",
  logoUrl: null,
  logoDarkUrl: null,
  faviconUrl: null,
  primaryColor: "#00d8c6",
  secondaryColor: "#08bfe8",
  accentColor: "#00eea8",
  backgroundColor: "#f6fbfc",
  foregroundColor: "#0b1724",
  headerBackground: "#020b14",
  headerForeground: "#ffffff",
  footerBackground: "#020b14",
  footerForeground: "#ffffff",
  seoTitleAr: "انفرو | هويتك الرقمية والتسويقية",
  seoTitleEn: "INFRO | Your Digital & Marketing Identity",
  seoDescriptionAr: "منصة انفرو للهوية الرقمية والتسويقية وإدارة حضور الأعمال والتواصل مع العملاء.",
  seoDescriptionEn: "INFRO helps businesses manage their digital identity, marketing presence, and customer communication.",
  seoKeywords: ["INFRO", "انفرو", "digital identity", "marketing identity"],
  ogImageUrl: null,
  robotsIndex: true,
  robotsFollow: true,
  customerPageBrandingEnabled: true,
};

export const PLATFORM_BRAND_SETTING_KEY = "platform.brand.v1" as const;

export function platformBrandCssVariables(config: PlatformBrandConfig) {
  return {
    "--brand-primary": config.primaryColor,
    "--brand-secondary": config.secondaryColor,
    "--brand-accent": config.accentColor,
    "--brand-background": config.backgroundColor,
    "--brand-foreground": config.foregroundColor,
    "--brand-header-background": config.headerBackground,
    "--brand-header-foreground": config.headerForeground,
    "--brand-footer-background": config.footerBackground,
    "--brand-footer-foreground": config.footerForeground,
  } as const;
}

"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_PLATFORM_BRAND, type PlatformBrandConfig } from "../../lib/platform-brand-config";
import { platformAssetUrl } from "../../lib/platform-asset-url";

type BrandValue = PlatformBrandConfig & Partial<Pick<import("../../app/lib/platform-design").PlatformDesignConfig, "headerCtaLabel" | "headerCtaHref" | "footerCopyright" | "homeHeroTitleAr" | "homeHeroSubtitleAr" | "customerHeaderEnabled" | "customerFooterEnabled">>;
const BrandContext = createContext<BrandValue>(DEFAULT_PLATFORM_BRAND);
export function PlatformBrandProvider({ value, children }: { value: BrandValue; children: ReactNode }) {
  const safeValue = { ...value, symbolUrl: platformAssetUrl(value.symbolUrl), logoUrl: platformAssetUrl(value.logoUrl), logoDarkUrl: platformAssetUrl(value.logoDarkUrl) };
  return <BrandContext.Provider value={safeValue}>{children}</BrandContext.Provider>;
}
export function usePlatformBrand() { return useContext(BrandContext); }

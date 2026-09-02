import { describe, expect, it } from "vitest";
import { DEFAULT_PLATFORM_BRAND, PLATFORM_BRAND_SETTING_KEY, platformBrandCssVariables } from "../lib/platform-brand-config";

describe("INFRO platform brand defaults", () => {
  it("uses the approved INFRO identity and stable setting key", () => {
    expect(PLATFORM_BRAND_SETTING_KEY).toBe("platform.brand.v1");
    expect(DEFAULT_PLATFORM_BRAND.brandNameEn).toBe("INFRO");
    expect(DEFAULT_PLATFORM_BRAND.brandNameAr).toBe("انفرو");
    expect(DEFAULT_PLATFORM_BRAND.primaryColor).toBe("#00d8c6");
    expect(DEFAULT_PLATFORM_BRAND.secondaryColor).toBe("#08bfe8");
    expect(DEFAULT_PLATFORM_BRAND.accentColor).toBe("#00eea8");
  });

  it("maps editable colors to semantic CSS variables", () => {
    expect(platformBrandCssVariables(DEFAULT_PLATFORM_BRAND)).toMatchObject({
      "--brand-primary": "#00d8c6",
      "--brand-secondary": "#08bfe8",
      "--brand-accent": "#00eea8",
      "--brand-header-background": "#020b14",
      "--brand-footer-background": "#020b14",
    });
  });

  it("keeps safe SEO defaults enabled", () => {
    expect(DEFAULT_PLATFORM_BRAND.robotsIndex).toBe(true);
    expect(DEFAULT_PLATFORM_BRAND.robotsFollow).toBe(true);
    expect(DEFAULT_PLATFORM_BRAND.seoTitleEn).toContain("INFRO");
    expect(DEFAULT_PLATFORM_BRAND.seoTitleAr).toContain("انفرو");
  });
});

"use client";

import { useState } from "react";
import { Copy, Download, MessageCircle, QrCode, Share2 } from "lucide-react";
import type { Prisma } from "@prisma/client";
import Image from "next/image";
import { PublicFavoriteButton } from "./public/public-favorite-button";
import { PublicReviewsSummary } from "./public/public-reviews-summary";
import { PublicSaveContact } from "./public/public-save-contact";
import { PublicShareButton } from "./public/public-share-button";
import { PublicSmartActionSheet } from "./public/public-smart-action-sheet";
import { PublicStickyMobileActions } from "./public/public-sticky-mobile-actions";
import { PublicVerifiedBadge } from "./public/public-verified-badge";
import { PublicBusinessActions, type ActionItem } from "./public/public-business-actions";
import type { PublicBusinessData } from "./public/types";
import { getActivityProfile, resolveActivityId, type ActivityId } from "../app/lib/activity-engine";
import { normalizePageModules } from "../app/lib/page-modules";
import { getPublicOpenStatus, resolvePublicAppearance } from "./public/public-page-utils";
import { PublicOffersSection } from "./public/public-offers-section";
import { PublicServicesSection } from "./public/public-services-section";
import { PublicHoursSection } from "./public/public-hours-section";
import { PublicLocationSection } from "./public/public-location-section";
import { PublicAboutSection } from "./public/public-about-section";
import { PublicSocialSection } from "./public/public-social-section";
import { PublicExternalStoreSection } from "./public/public-external-store-section";
import { PublicContactTeamSection } from "./public/public-contact-team-section";
import { PublicPortfolioSection } from "./public/public-portfolio-section";
import { PublicCompanyProfileSection } from "./public/public-company-profile-section";

type BusinessPublicPayload = Prisma.BusinessGetPayload<{
  include: {
    products: { include: { category: true } };
    offers: true;
    services: true;
    openingHours: true;
    pageModules: true;
    socialLinks: true;
  };
}>;

type PublicBusinessPageProps = {
  business: BusinessPublicPayload;
  qrDataUrl: string;
  publicUrl: string;
};

type BusinessKind = "restaurant" | "services" | "store";

function normalizePhone(value: string | null | undefined) {
  if (!value) return null;
  const normalized = value.replace(/[^\d+]/g, "").trim();
  const digitsOnly = normalized.replace(/\D/g, "");
  if (!normalized || digitsOnly.length < 8 || digitsOnly.length > 15) {
    return null;
  }
  return normalized;
}

function normalizeWhatsapp(value: string | null | undefined) {
  if (!value) return null;
  const normalized = value.replace(/\D/g, "").trim();
  return normalized || null;
}

function toArabicSocialLabel(platform: string) {
  const key = platform.toLowerCase();
  if (key.includes("instagram")) return "انستغرام";
  if (key.includes("tiktok")) return "تيك توك";
  if (key.includes("snapchat")) return "سناب شات";
  if (key === "x" || key.includes("twitter")) return "إكس";
  if (key.includes("facebook")) return "فيسبوك";
  if (key.includes("youtube")) return "يوتيوب";
  return platform;
}

function resolveBusinessKind(activityId: ActivityId, hasProducts: boolean, hasServices: boolean): BusinessKind {
  if (activityId === "RESTAURANT") {
    return "restaurant";
  }

  if (activityId === "RETAIL" || activityId === "GROCERY") {
    return "store";
  }

  if (hasProducts && !hasServices) {
    return "store";
  }

  return "services";
}

function getPrimaryCtaLabel(kind: BusinessKind, business: PublicBusinessData) {
  if (kind === "restaurant") {
    if (business.bookingAvailable) return "احجز الآن";
    if (business.acceptOnlineOrders || business.products.length > 0) return "اطلب الآن";
    return "اطلب الآن";
  }

  if (kind === "store") {
    return "زيارة المتجر الإلكتروني";
  }

  return business.bookingAvailable ? "احجز الآن" : "طلب خدمة";
}

function getInquiryLabel(kind: BusinessKind) {
  if (kind === "store") return "لديك استفسار عن منتج؟";
  if (kind === "restaurant") return "لديك استفسار عن القائمة؟";
  return "لديك استفسار؟";
}

function isModuleEnabled(modules: Array<{ id: string; enabled: boolean }>, id: string) {
  const match = modules.find((module) => module.id === id);
  if (!match) return true;
  return match.enabled;
}

function normalizeHttpUrl(value: string | null | undefined) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (raw.startsWith("/")) return raw;
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw) && !/^https?:/i.test(raw)) {
    return null;
  }
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(candidate);
    if (!/^https?:$/i.test(parsed.protocol)) {
      return null;
    }
    if (!parsed.hostname || /\s/.test(parsed.href)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function toDigits(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "").trim();
}

function isValidEmail(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

export function PublicBusinessPage({ business, qrDataUrl, publicUrl }: PublicBusinessPageProps) {
  const [sharePanelOpen, setSharePanelOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const accentColor = business.primaryColor || "#5D43EF";
  const normalizedWhatsapp = normalizeWhatsapp(business.whatsapp);
  const normalizedPhone = normalizePhone(business.phone);

  const mappedBusiness: PublicBusinessData = {
    id: business.id,
    slug: business.slug,
    name: business.name,
    businessType: business.businessType,
    description: business.description,
    isVerified: business.isVerified,
    primaryColor: accentColor,
    secondaryColor: business.secondaryColor,
    buttonStyle: business.buttonStyle,
    cardStyle: business.cardStyle,
    logoUrl: business.logoUrl,
    coverUrl: business.coverUrl,
    city: business.city,
    district: business.district,
    address: business.address,
    establishedYear: business.createdAt.getFullYear(),
    workingHours: business.workingHours,
    whatsapp: normalizedWhatsapp,
    phone: normalizedPhone,
    email: business.email,
    website: business.website,
    googleMapsLink: business.googleMapsLink,
    bookingAvailable: business.bookingAvailable,
    acceptOnlineOrders: business.acceptOnlineOrders,
    xUrl: business.xUrl,
    instagramUrl: business.instagramUrl,
    snapchatUrl: business.snapchatUrl,
    tiktokUrl: business.tiktokUrl,
    facebookUrl: business.facebookUrl,
    galleryItems: [],
    products: business.products
      .filter((product) => product.isActive)
      .map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        unit: (product as { unit?: string | null }).unit ?? null,
        price: product.price,
        oldPrice: product.oldPrice,
        imageUrl: product.imageUrl,
        isActive: product.isActive,
        categoryName: product.category?.name ?? null,
      })),
    offers: business.offers.map((offer) => ({
      id: offer.id,
      title: offer.title,
      description: offer.description,
      discountLabel: offer.discountLabel,
      imageUrl: offer.imageUrl,
      startsAt: offer.startsAt ? offer.startsAt.toISOString() : null,
      endsAt: offer.endsAt ? offer.endsAt.toISOString() : null,
    })),
    services: business.services
      .filter((service) => service.isActive)
      .map((service) => ({
        id: service.id,
        name: service.name,
        description: service.description,
        price: service.price,
        durationMinutes: service.durationMinutes,
        imageUrl: service.imageUrl,
        bookingEnabled: service.bookingEnabled,
        sortOrder: service.sortOrder,
      })),
    openingHours: business.openingHours.map((item) => ({
      id: item.id,
      dayOfWeek: item.dayOfWeek,
      opensAt: item.opensAt,
      closesAt: item.closesAt,
      secondOpensAt: item.secondOpensAt,
      secondClosesAt: item.secondClosesAt,
      isClosed: item.isClosed,
    })),
    socialLinks: business.socialLinks.map((item) => ({
      id: item.id,
      platform: item.platform,
      url: item.url,
    })),
  };

  const pageModules = normalizePageModules((business as { pageModules?: unknown }).pageModules, mappedBusiness.businessType);
  const modulesById = new Map(pageModules.map((module) => [module.id, module]));
  const appearance = resolvePublicAppearance(mappedBusiness.cardStyle, mappedBusiness.buttonStyle);
  const darkMode = appearance.themeMode === "dark";
  const openStatus = getPublicOpenStatus(mappedBusiness.openingHours);

  const hasAddress = Boolean(mappedBusiness.address?.trim());
  const mapQuery = [mappedBusiness.address, mappedBusiness.district, mappedBusiness.city].filter(Boolean).join(" ").trim();
  const mapHref = mappedBusiness.googleMapsLink || (hasAddress && mapQuery ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}` : null);
  const hasPreciseLocation = Boolean(mapHref || hasAddress);

  const normalizedSocialLinks = [
    ...(mappedBusiness.instagramUrl ? [{ label: "انستغرام", href: mappedBusiness.instagramUrl }] : []),
    ...(mappedBusiness.tiktokUrl ? [{ label: "تيك توك", href: mappedBusiness.tiktokUrl }] : []),
    ...(mappedBusiness.snapchatUrl ? [{ label: "سناب شات", href: mappedBusiness.snapchatUrl }] : []),
    ...(mappedBusiness.xUrl ? [{ label: "إكس", href: mappedBusiness.xUrl }] : []),
    ...(mappedBusiness.facebookUrl ? [{ label: "فيسبوك", href: mappedBusiness.facebookUrl }] : []),
    ...mappedBusiness.socialLinks.map((item) => ({ label: toArabicSocialLabel(item.platform), href: item.url })),
  ].filter((item, index, arr) => arr.findIndex((entry) => entry.href === item.href) === index);

  const activityId = resolveActivityId(mappedBusiness.businessType);
  const activityProfile = getActivityProfile(mappedBusiness.businessType);
  const businessKind = resolveBusinessKind(activityId, mappedBusiness.products.length > 0, mappedBusiness.services.length > 0);

  const servicesModule = modulesById.get("services");
  const productsModule = modulesById.get("products");
  const externalStoreModule = modulesById.get("externalStore");
  const contactTeamModule = modulesById.get("contactTeam");
  const portfolioModule = modulesById.get("portfolio");
  const companyProfileModule = modulesById.get("companyProfile");
  const contactModule = modulesById.get("contact");

  const serviceSectionTitle = servicesModule?.config?.serviceSectionTitle?.trim() || servicesModule?.config?.title?.trim() || "الخدمات";
  const externalStoreUrl = normalizeHttpUrl(externalStoreModule?.config?.externalStoreUrl || mappedBusiness.website);

  const featuredProductIds = Array.isArray(productsModule?.config?.featuredProductIds)
    ? productsModule?.config?.featuredProductIds.map((entry) => String(entry).trim()).filter(Boolean).slice(0, 3)
    : [];

  const productExternalLinks = productsModule?.config?.productExternalLinks && typeof productsModule.config.productExternalLinks === "object"
    ? Object.fromEntries(
        Object.entries(productsModule.config.productExternalLinks as Record<string, unknown>).map(([key, value]) => [key, normalizeHttpUrl(String(value ?? ""))]),
      ) as Record<string, string | null>
    : {};

  const featuredProducts = (() => {
    if (mappedBusiness.products.length === 0) return [] as PublicBusinessData["products"];
    const source = featuredProductIds.length > 0
      ? mappedBusiness.products.filter((product) => featuredProductIds.includes(product.id))
      : mappedBusiness.products.filter((product) => product.isActive).slice(0, 3);
    return source.slice(0, 3);
  })();

  const salesTeam = Array.isArray(contactTeamModule?.config?.salesTeam)
    ? contactTeamModule.config.salesTeam.slice(0, 3).map((member, index) => {
        const entry = member as Record<string, unknown>;
        return {
          id: String(entry.id ?? `${index}`),
          name: String(entry.name ?? "").trim(),
          title: String(entry.title ?? "").trim() || undefined,
          photoUrl: normalizeHttpUrl(String(entry.photoUrl ?? "")) || undefined,
          whatsapp: toDigits(String(entry.whatsapp ?? "")) || undefined,
          phone: String(entry.phone ?? "").trim() || undefined,
          email: String(entry.email ?? "").trim() || undefined,
          visible: entry.visible === false ? false : true,
          sortOrder: Number.isFinite(entry.sortOrder) ? Number(entry.sortOrder) : index,
        };
      })
    : [];

  const customerServiceTeam = Array.isArray(contactTeamModule?.config?.customerServiceTeam)
    ? contactTeamModule.config.customerServiceTeam.slice(0, 3).map((member, index) => {
        const entry = member as Record<string, unknown>;
        return {
          id: String(entry.id ?? `${index}`),
          name: String(entry.name ?? "").trim(),
          title: String(entry.title ?? "").trim() || undefined,
          photoUrl: normalizeHttpUrl(String(entry.photoUrl ?? "")) || undefined,
          whatsapp: toDigits(String(entry.whatsapp ?? "")) || undefined,
          phone: String(entry.phone ?? "").trim() || undefined,
          email: String(entry.email ?? "").trim() || undefined,
          visible: entry.visible === false ? false : true,
          sortOrder: Number.isFinite(entry.sortOrder) ? Number(entry.sortOrder) : index,
        };
      })
    : [];

  const portfolioTitle = portfolioModule?.config?.title?.trim() || "أعمالنا";
  const portfolioItems = Array.isArray(portfolioModule?.config?.portfolioItems)
    ? portfolioModule.config.portfolioItems.slice(0, 6).map((item, index) => {
        const entry = item as Record<string, unknown>;
        return {
          id: String(entry.id ?? `${index}`),
          title: String(entry.title ?? "").trim(),
          description: String(entry.description ?? "").trim() || undefined,
          imageUrl: normalizeHttpUrl(String(entry.imageUrl ?? "")) || undefined,
          url: normalizeHttpUrl(String(entry.url ?? "")) || undefined,
          visible: entry.visible === false ? false : true,
          sortOrder: Number.isFinite(entry.sortOrder) ? Number(entry.sortOrder) : index,
        };
      })
    : [];

  const companyProfile = companyProfileModule?.config?.companyProfile && typeof companyProfileModule.config.companyProfile === "object"
    ? {
        title: String(companyProfileModule.config.companyProfile.title ?? "").trim() || "الملف التعريفي",
        description: String(companyProfileModule.config.companyProfile.description ?? "").trim(),
        ctaLabel: String(companyProfileModule.config.companyProfile.ctaLabel ?? "").trim() || "عرض الملف التعريفي",
        pdfUrl: normalizeHttpUrl(String(companyProfileModule.config.companyProfile.pdfUrl ?? "")) || "",
        pdfFileName: String(companyProfileModule.config.companyProfile.pdfFileName ?? "").trim(),
        pdfFileSize: Number.isFinite(companyProfileModule.config.companyProfile.pdfFileSize)
          ? Number(companyProfileModule.config.companyProfile.pdfFileSize)
          : 0,
        visible: companyProfileModule.config.companyProfile.visible === false ? false : true,
      }
    : null;

  const primaryCtaLabel = getPrimaryCtaLabel(businessKind, mappedBusiness);
  const orderedEnabledModules = [...pageModules].filter((module) => module.enabled).sort((left, right) => left.sortOrder - right.sortOrder);
  const showServicesSection = isModuleEnabled(pageModules, "services") && mappedBusiness.services.length > 0;
  const showProductsSection = isModuleEnabled(pageModules, "products") && mappedBusiness.products.length > 0;
  const showExternalStore = businessKind === "store" && isModuleEnabled(pageModules, "externalStore");
  const showOffersSection = mappedBusiness.offers.length > 0;
  const showHoursSection = isModuleEnabled(pageModules, "hours") && mappedBusiness.openingHours.length > 0;
  const showLocationSection = isModuleEnabled(pageModules, "location") && hasPreciseLocation;
  const showContactTeam = isModuleEnabled(pageModules, "contactTeam") && (salesTeam.length > 0 || customerServiceTeam.length > 0);
  const showPortfolio = isModuleEnabled(pageModules, "portfolio") && portfolioItems.some((item) => item.visible !== false && item.title);
  const showInquiry = isModuleEnabled(pageModules, "inquiry") && Boolean(mappedBusiness.whatsapp || mappedBusiness.phone);
  const showContact = isModuleEnabled(pageModules, "contact") && normalizedSocialLinks.length > 0;

  const careersEnabled = contactModule?.config?.careersEnabled === true;
  const careersEmail = String(contactModule?.config?.careersEmail ?? "").trim();
  const careersExternalUrl = normalizeHttpUrl(contactModule?.config?.careersExternalUrl);
  const careersLabel = String(contactModule?.config?.careersLabel ?? "").trim() || "انضم إلى فريقنا";
  const careersMailto = isValidEmail(careersEmail)
    ? `mailto:${careersEmail}?subject=${encodeURIComponent(`طلب توظيف لدى ${mappedBusiness.name}`)}`
    : null;
  const careersHref = careersEnabled ? careersExternalUrl || careersMailto : null;

  const businessLinkEnabled = contactModule?.config?.businessLinkEnabled === true;
  const websiteType = contactModule?.config?.websiteType === "ONLINE_STORE"
    ? "ONLINE_STORE"
    : (contactModule?.config?.businessLinkType === "store" ? "ONLINE_STORE" : "WEBSITE");
  const websiteUrl = normalizeHttpUrl(contactModule?.config?.websiteUrl || contactModule?.config?.businessLinkUrl);
  const businessLinkLabel = String(contactModule?.config?.businessLinkLabel ?? "").trim();
  const businessLinkDefaultLabel = websiteType === "ONLINE_STORE" ? "المتجر الإلكتروني" : "الموقع الإلكتروني";
  const businessLinkActionLabel = businessLinkLabel || businessLinkDefaultLabel;
  const businessLinkHref = businessLinkEnabled && websiteUrl ? websiteUrl : null;
  const showAboutSection = isModuleEnabled(pageModules, "about") && Boolean((mappedBusiness.description ?? "").trim());

  const actions: ActionItem[] = [];
  if (mappedBusiness.whatsapp) {
    actions.push({ key: "whatsapp", label: "واتساب", href: `https://wa.me/${mappedBusiness.whatsapp}`, external: true, icon: "whatsapp" });
  }
  if (mappedBusiness.phone) {
    actions.push({ key: "call", label: "اتصال", href: `tel:${mappedBusiness.phone}`, icon: "call" });
  }
  if (mapHref) {
    actions.push({ key: "directions", label: "الاتجاهات", href: mapHref, external: true, icon: "directions" });
  }
  if (businessLinkHref) {
    actions.push({
      key: "business-link",
      label: businessLinkActionLabel,
      href: businessLinkHref,
      external: true,
      icon: websiteType === "ONLINE_STORE" ? "store" : "website",
    });
  }
  if (showExternalStore && externalStoreUrl && (!businessLinkHref || businessLinkHref !== externalStoreUrl)) {
    actions.push({ key: "store", label: "المتجر", href: externalStoreUrl, external: true, icon: "store" });
  }
    const showCompanyProfile = isModuleEnabled(pageModules, "companyProfile") && Boolean(companyProfile?.pdfUrl) && companyProfile?.visible !== false;

  if (careersHref) {
    actions.push({ key: "careers", label: careersLabel, href: careersHref, external: Boolean(careersExternalUrl), icon: "careers" });
  }
  const contactNavTarget = showContactTeam ? "#contact-team-section" : actions.length > 0 ? "#business-actions-section" : null;

  const heroMeta = [
    [mappedBusiness.city, mappedBusiness.district].filter(Boolean).join(" • "),
    openStatus.label,
    openStatus.detail,
  ].filter(Boolean) as string[];

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: mappedBusiness.name,
    ...(mappedBusiness.description ? { description: mappedBusiness.description } : {}),
    ...(publicUrl ? { url: publicUrl } : {}),
    ...(mappedBusiness.phone ? { telephone: mappedBusiness.phone } : {}),
    ...(mappedBusiness.city || mappedBusiness.district || mappedBusiness.address
      ? {
          address: {
            "@type": "PostalAddress",
            ...(mappedBusiness.city ? { addressLocality: mappedBusiness.city } : {}),
            ...(mappedBusiness.district ? { addressRegion: mappedBusiness.district } : {}),
            ...(mappedBusiness.address ? { streetAddress: mappedBusiness.address } : {}),
          },
        }
      : {}),
    ...(mappedBusiness.coverUrl || mappedBusiness.logoUrl ? { image: mappedBusiness.coverUrl ?? mappedBusiness.logoUrl } : {}),
  };

  const shellClass = darkMode
    ? "bg-[radial-gradient(circle_at_top_right,#16234a_0%,transparent_42%),linear-gradient(180deg,#070d1d_0%,#0a1224_62%,#0d1730_100%)] text-white"
    : "bg-[radial-gradient(circle_at_top_right,#e6ecff_0%,transparent_44%),linear-gradient(180deg,#f5f7ff_0%,#f4f8ff_100%)] text-slate-900";

  const surfaceClass = darkMode
    ? "border border-white/10 bg-[#111a33]/72"
    : "border border-[#e8ebf7] bg-white";

  const compactSurfaceClass = darkMode
    ? "border border-white/10 bg-[#101a31]/78"
    : "border border-[#e8ebf7] bg-[#fbfcff]";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const renderInquirySection = () => {
    if (!showInquiry) {
      return null;
    }

    const buttonLabel = businessKind === "services" ? "استفسر الآن" : "استفسار";
    const detailText =
      businessKind === "restaurant"
        ? "هل ترغب بالسؤال قبل الحجز؟ أرسل استفسارك مباشرة."
        : businessKind === "store"
          ? "للاستفسارات قبل الطلب، تواصل معنا مباشرة."
          : "أرسل سؤالك وسنحوّله إلى واتساب مباشرة.";
    const sheetTitle = businessKind === "store" ? "استفسار عن منتج" : "استفسار";

    return (
      <section id="inquiry-section" className={`rounded-2xl border p-4 ${compactSurfaceClass}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className={`text-base font-black ${darkMode ? "text-white" : "text-[#1f2552]"}`}>{getInquiryLabel(businessKind)}</h2>
            <p className={`mt-1 text-sm ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{detailText}</p>
          </div>
          <div className="w-full sm:w-auto">
            <PublicSmartActionSheet
              businessName={mappedBusiness.name}
              activity={activityProfile}
              whatsapp={mappedBusiness.whatsapp}
              phone={mappedBusiness.phone}
              mode="inquiry"
              buttonLabel={buttonLabel}
              sheetTitle={sheetTitle}
              sheetDescription="اكتب استفسارك وسيتم فتح واتساب مباشرة."
              buttonClassName="flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-black text-white"
              buttonStyle={{ backgroundColor: accentColor }}
            />
          </div>
        </div>
      </section>
    );
  };

  const renderModuleSection = (moduleId: string) => {
    switch (moduleId) {
      case "services":
        if (!showServicesSection) return null;
        return (
          <PublicServicesSection
            services={mappedBusiness.services}
            accentColor={accentColor}
            whatsapp={mappedBusiness.whatsapp}
            phone={mappedBusiness.phone}
            businessName={mappedBusiness.name}
            title={serviceSectionTitle || (businessKind === "restaurant" ? "القائمة" : "الخدمات")}
            darkMode={darkMode}
          />
        );
      case "products":
        if (!showProductsSection || businessKind !== "store") return null;
        return (
          <PublicExternalStoreSection
            products={featuredProducts}
            productExternalLinks={Object.fromEntries(Object.entries(productExternalLinks).map(([key, value]) => [key, value ?? ""]))}
            externalStoreUrl={showExternalStore ? externalStoreUrl : null}
            accentColor={accentColor}
            darkMode={darkMode}
            title="منتجات مميزة"
          />
        );
      case "inquiry":
        return renderInquirySection();
      case "location":
        if (!showLocationSection) return null;
        return <PublicLocationSection city={mappedBusiness.city} district={mappedBusiness.district} address={mappedBusiness.address} mapHref={mapHref} darkMode={darkMode} compact />;
      case "hours":
        if (!showHoursSection) return null;
        return <PublicHoursSection hours={mappedBusiness.openingHours} statusLabel={openStatus.label} statusDetail={openStatus.detail} fallbackText={mappedBusiness.workingHours} accentColor={accentColor} darkMode={darkMode} compact />;
      case "portfolio":
        return showPortfolio ? <PublicPortfolioSection items={portfolioItems} title={portfolioTitle} darkMode={darkMode} /> : null;
      case "companyProfile":
        return showCompanyProfile && companyProfile ? <PublicCompanyProfileSection companyProfile={companyProfile} darkMode={darkMode} /> : null;
      case "contactTeam":
        return showContactTeam ? <PublicContactTeamSection salesTeam={salesTeam} customerServiceTeam={customerServiceTeam} darkMode={darkMode} /> : null;
      case "about":
        return showAboutSection ? <PublicAboutSection description={mappedBusiness.description} businessType={mappedBusiness.businessType} city={mappedBusiness.city} district={mappedBusiness.district} address={mappedBusiness.address} establishedYear={mappedBusiness.establishedYear} website={null} phone={mappedBusiness.phone} whatsapp={mappedBusiness.whatsapp} isVerified={mappedBusiness.isVerified} statusLabel={openStatus.label} darkMode={darkMode} /> : null;
      case "contact":
        return showContact ? <PublicSocialSection links={normalizedSocialLinks} title="روابط إضافية" darkMode={darkMode} /> : null;
      default:
        return null;
    }
  };

  return (
    <main dir="rtl" style={{ "--hee-accent": accentColor } as React.CSSProperties} className={`min-h-screen pb-28 md:pb-8 ${shellClass}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      <div id="top" className="mx-auto w-full max-w-[1240px] px-3 py-3 sm:px-5 sm:py-5 lg:px-8">
        <section className={`overflow-hidden rounded-[30px] border shadow-[0_32px_80px_-36px_rgba(15,23,42,0.25)] ${surfaceClass}`}>
          <div className="relative isolate overflow-hidden">
            <div className="relative h-[132px] sm:h-[170px] lg:h-[214px]">
              {mappedBusiness.coverUrl ? (
                <Image
                  src={mappedBusiness.coverUrl}
                  alt="غلاف النشاط"
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 95vw, 1240px"
                  className="object-cover object-center"
                  priority
                  unoptimized
                />
              ) : (
                <div className={`h-full w-full ${darkMode ? "bg-[linear-gradient(120deg,#1a294f,#0d1730)]" : "bg-[linear-gradient(120deg,#e9efff,#f4ecff)]"}`} />
              )}
              <div className={`absolute inset-0 ${darkMode ? "bg-[linear-gradient(180deg,rgba(6,12,26,0.18)_0%,rgba(6,12,26,0.55)_100%)]" : "bg-[linear-gradient(180deg,rgba(6,12,26,0.12)_0%,rgba(6,12,26,0.36)_100%)]"}`} />

              <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between p-2.5 sm:p-4">
                <div className="flex items-center gap-2">
                  <PublicFavoriteButton
                    businessId={mappedBusiness.id}
                    businessName={mappedBusiness.name}
                    variant="pill"
                    className={darkMode ? "border-white/20 bg-black/35 text-white" : "border-white/70 bg-white/90 text-slate-700"}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setSharePanelOpen((value) => !value)}
                  className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-sm font-bold sm:h-11 ${darkMode ? "border-white/20 bg-black/35 text-white" : "border-white/70 bg-white/90 text-slate-700"}`}
                >
                  <Share2 className="h-4 w-4" />
                  مشاركة
                </button>
              </div>
            </div>

            <div className="relative z-20 px-3 pb-3 sm:px-4 sm:pb-4 lg:px-5 lg:pb-5">
              <div className={`-mt-8 rounded-[24px] border p-4 shadow-[0_18px_45px_-24px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:-mt-10 sm:p-5 lg:-mt-12 lg:p-6 ${darkMode ? "border-white/10 bg-slate-950/78" : "border-[#ebeffc] bg-white/92"}`}>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-center xl:grid-cols-[minmax(0,1fr)_340px]">
                  <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                    <div className={`mt-[-22px] flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[20px] border text-2xl font-black shadow-[0_18px_36px_-22px_rgba(24,30,84,0.45)] sm:mt-[-26px] sm:h-20 sm:w-20 ${darkMode ? "border-white/15 bg-[#0f1930] text-white" : "border-white bg-white text-[#1f2552]"}`}>
                      {mappedBusiness.logoUrl ? <Image src={mappedBusiness.logoUrl} alt={mappedBusiness.name} width={160} height={160} className="h-full w-full object-cover" /> : mappedBusiness.name.charAt(0)}
                    </div>

                    <div id="request-section" className="min-w-0 flex-1 space-y-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h1 className={`text-lg font-black tracking-tight sm:text-2xl lg:text-[30px] ${darkMode ? "text-white" : "text-[#1f2552]"}`}>{mappedBusiness.name}</h1>
                        {mappedBusiness.isVerified ? <PublicVerifiedBadge size={18} /> : null}
                      </div>

                      {mappedBusiness.businessType ? <p className={`text-sm font-semibold ${darkMode ? "text-slate-200" : "text-slate-600"}`}>{mappedBusiness.businessType}</p> : null}
                      {mappedBusiness.description ? <p className={`max-w-[68ch] line-clamp-3 text-sm leading-6 ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{mappedBusiness.description}</p> : null}

                      {heroMeta.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          {heroMeta.map((item, index) => (
                            <span key={`${item}-${index}`} className={`rounded-full px-2.5 py-1 ${darkMode ? "border border-white/10 bg-white/5 text-slate-200" : "border border-[#e6eaf8] bg-[#f8faff] text-slate-600"}`}>
                              {item}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="w-full space-y-2.5 lg:flex-none">
                    {businessKind === "store" ? (
                      <a
                        href={externalStoreUrl ?? "#products-section"}
                        target={externalStoreUrl ? "_blank" : undefined}
                        rel={externalStoreUrl ? "noreferrer noopener" : undefined}
                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black text-white shadow-[0_16px_30px_-18px_rgba(0,0,0,0.4)] sm:h-12"
                        style={{ backgroundColor: accentColor }}
                        id="external-store-link"
                      >
                        <MessageCircle className="h-4 w-4" />
                        {primaryCtaLabel}
                      </a>
                    ) : (
                      <PublicSmartActionSheet
                        businessName={mappedBusiness.name}
                        activity={activityProfile}
                        whatsapp={mappedBusiness.whatsapp}
                        phone={mappedBusiness.phone}
                        mode="request"
                        buttonLabel={primaryCtaLabel}
                        buttonClassName="flex h-11 w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black text-white shadow-[0_16px_30px_-18px_rgba(0,0,0,0.4)] sm:h-12"
                        buttonStyle={{ backgroundColor: accentColor }}
                        sheetTitle={businessKind === "restaurant" ? "طلب / حجز" : "طلب خدمة"}
                        sheetDescription={businessKind === "restaurant" ? "أرسل تفاصيل الطلب أو الحجز وسيتم فتح واتساب مباشرة." : "أرسل تفاصيل الخدمة وسيتم فتح واتساب مباشرة."}
                      />
                    )}

                    <div className={`rounded-2xl border p-2 ${darkMode ? "border-white/10 bg-slate-900/50" : "border-[#edf2ff] bg-[#f9fbff]"}`}>
                      <PublicBusinessActions items={actions} darkMode={darkMode} maxDesktopColumns={3} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {sharePanelOpen ? (
          <section className={`mt-4 rounded-2xl border p-3 ${compactSurfaceClass}`}>
            <div className="grid gap-3 md:grid-cols-[120px_minmax(0,1fr)] md:items-center">
              <div className="mx-auto h-28 w-28 overflow-hidden rounded-xl border border-white/15 bg-white p-1.5">
                <img src={qrDataUrl} alt="QR" className="h-full w-full object-contain" />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={copyLink} className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border text-sm font-bold ${compactSurfaceClass}`}>
                  <Copy className="h-4 w-4" />
                  نسخ الرابط
                </button>
                <a href={qrDataUrl} download="hee-qr.png" className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border text-sm font-bold ${compactSurfaceClass}`}>
                  <Download className="h-4 w-4" />
                  تنزيل QR
                </a>
                <PublicShareButton
                  title={mappedBusiness.name}
                  text={mappedBusiness.description ?? mappedBusiness.businessType}
                  url={publicUrl}
                  label="مشاركة الصفحة"
                  fullWidth
                  className={`rounded-xl border ${darkMode ? "border-white/10 bg-white/5 text-white" : "border-[#e8ebf7] bg-white text-slate-700"}`}
                />
                <div className="sm:col-span-2">
                  <PublicSaveContact
                    businessName={mappedBusiness.name}
                    phone={mappedBusiness.phone}
                    whatsapp={mappedBusiness.whatsapp}
                    email={mappedBusiness.email}
                    website={mappedBusiness.website}
                    address={mappedBusiness.address}
                    city={mappedBusiness.city}
                    publicUrl={publicUrl}
                  />
                </div>
              </div>
            </div>
            {copied ? <p className={`mt-2 text-xs ${darkMode ? "text-emerald-300" : "text-emerald-700"}`}>تم نسخ الرابط</p> : null}
          </section>
        ) : null}

        <div className="mt-4 space-y-4">
          {orderedEnabledModules.map((module) => (
            <div key={module.id}>{renderModuleSection(module.id)}</div>
          ))}

          {showOffersSection ? <PublicOffersSection offers={mappedBusiness.offers} accentColor={accentColor} whatsapp={mappedBusiness.whatsapp} phone={mappedBusiness.phone} businessName={mappedBusiness.name} darkMode={darkMode} /> : null}

          <PublicReviewsSummary slug={mappedBusiness.slug} />

          <footer className={`pb-6 pt-2 text-center text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
            <button type="button" onClick={() => setSharePanelOpen((value) => !value)} className="inline-flex items-center gap-1 rounded-full border border-transparent px-2 py-1 hover:border-current">
              <QrCode className="h-3.5 w-3.5" />
              أدوات المشاركة
            </button>
            <a href="https://hee.sa" target="_blank" rel="noreferrer" className={`mr-3 ${darkMode ? "hover:text-slate-300" : "hover:text-slate-700"}`}>صُنع بواسطة HEE</a>
          </footer>
        </div>
      </div>

      <PublicStickyMobileActions
        businessKind={businessKind}
        servicesLabel={serviceSectionTitle || (businessKind === "restaurant" ? "القائمة" : "الخدمات")}
        contactHref={contactNavTarget}
        hasOffers={showOffersSection}
        hasLocation={Boolean(showLocationSection)}
        hasGallery={false}
        hasReviews={false}
        hasServices={showServicesSection}
        hasProducts={showProductsSection}
        hasContact={Boolean(mappedBusiness.whatsapp || mappedBusiness.phone || mapHref)}
      />
    </main>
  );
}

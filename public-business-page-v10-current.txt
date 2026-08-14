"use client";

import { useState } from "react";
import { Building2, Clock3, Copy, Download, FileText, MapPin, MessageCircle, Phone, Share2, Sparkles, Users, Wrench } from "lucide-react";
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
  const branchSummary = [mappedBusiness.city, mappedBusiness.district, mappedBusiness.address].filter(Boolean).join(" • ") || null;
  const branchDisplay = branchSummary ? { label: "فرع واحد", detail: branchSummary } : null;

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
    ...(mappedBusiness.logoUrl ? { image: mappedBusiness.logoUrl } : {}),
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

  const visiblePortfolio = portfolioItems.filter((item) => item.visible !== false && item.title).slice(0, 4);
  const visibleTeam = [...salesTeam, ...customerServiceTeam].filter((member) => member.visible !== false && member.name).slice(0, 5);
  const compactServices = mappedBusiness.services.slice(0, 4);
  const addressText = [mappedBusiness.city, mappedBusiness.district].filter(Boolean).join("، ") || mappedBusiness.address || "";

const mobileCoreModules = new Set(["services", "portfolio", "companyProfile", "contactTeam", "about", "location", "hours", "contact"]);
  const desktopCoreModules = new Set(["services", "portfolio", "companyProfile", "contactTeam", "about", "location", "hours", "contact"]);

  const renderRemainingModules = (excluded: Set<string>) =>
    orderedEnabledModules
      .filter((module) => !excluded.has(module.id))
      .map((module) => <div key={module.id}>{renderModuleSection(module.id)}</div>);

  const Identity = ({ desktop = false }: { desktop?: boolean }) => (
    <section className={desktop ? "flex items-center gap-5" : "flex items-start gap-3"}>
      <div className={desktop
        ? "flex h-[88px] w-[88px] shrink-0 items-center justify-center overflow-hidden rounded-[22px] bg-[#f2efff]"
        : "flex h-[64px] w-[64px] shrink-0 items-center justify-center overflow-hidden rounded-[18px] bg-[#f2efff]"}>
        {mappedBusiness.logoUrl ? (
          <Image src={mappedBusiness.logoUrl} alt={mappedBusiness.name} width={96} height={96} className="h-full w-full object-contain" unoptimized />
        ) : (
          <span className={desktop ? "text-3xl font-black text-[#5D43EF]" : "text-xl font-black text-[#5D43EF]"}>
            {mappedBusiness.name.charAt(0)}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className={desktop ? "text-[28px] font-black leading-tight text-[#20173f]" : "text-[18px] font-black leading-7 text-[#20173f]"}>
                {mappedBusiness.name}
              </h1>
              {mappedBusiness.isVerified ? (
                <span className="rounded-full bg-[#eee9ff] px-2.5 py-1 text-[10px] font-black text-[#5D43EF]">موثق ✓</span>
              ) : null}
            </div>
            <p className={desktop ? "mt-1 text-sm font-bold text-[#756f82]" : "mt-0.5 text-[11px] font-bold text-[#756f82]"}>
              {mappedBusiness.businessType}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#eaf8ef] px-2.5 py-1 text-[10px] font-black text-[#16864a]">{openStatus.label}</span>
              {addressText ? <span className="text-[10px] font-bold text-[#777080]">{addressText}</span> : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => setSharePanelOpen((value) => !value)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#e8e3f1] bg-white text-[#5138a8]"
              aria-label="مشاركة">
              <Share2 className="h-4 w-4" />
            </button>
            <PublicFavoriteButton businessId={mappedBusiness.id} businessName={mappedBusiness.name} variant="pill"
              className="h-9 border-[#e8e3f1] bg-white px-2 text-[#5138a8]" />
          </div>
        </div>
      </div>
    </section>
  );

  const QuickActions = ({ desktop = false }: { desktop?: boolean }) => (
    <div className={desktop ? "grid grid-cols-4 gap-3" : "grid grid-cols-4 gap-2"}>
      <a href={mappedBusiness.whatsapp ? `https://wa.me/${mappedBusiness.whatsapp}` : "#"} target={mappedBusiness.whatsapp ? "_blank" : undefined}
        rel="noreferrer noopener" className="flex min-h-[62px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-[#ece7f5] bg-white text-[11px] font-black text-[#332657]">
        <MessageCircle className="h-5 w-5 text-[#5D43EF]" />واتساب
      </a>
      <a href={mappedBusiness.phone ? `tel:${mappedBusiness.phone}` : "#"}
        className="flex min-h-[62px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-[#ece7f5] bg-white text-[11px] font-black text-[#332657]">
        <Phone className="h-5 w-5 text-[#5D43EF]" />اتصال
      </a>
      <a href={mapHref || "#"} target={mapHref ? "_blank" : undefined} rel="noreferrer noopener"
        className="flex min-h-[62px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-[#ece7f5] bg-white text-[11px] font-black text-[#332657]">
        <MapPin className="h-5 w-5 text-[#5D43EF]" />الموقع
      </a>
      <button type="button" onClick={() => setSharePanelOpen((value) => !value)}
        className="flex min-h-[62px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-[#ece7f5] bg-white text-[11px] font-black text-[#332657]">
        <Share2 className="h-5 w-5 text-[#5D43EF]" />مشاركة
      </button>
    </div>
  );

  const PrimaryAction = ({ desktop = false }: { desktop?: boolean }) => (
    <PublicSmartActionSheet
      businessName={mappedBusiness.name}
      activity={activityProfile}
      whatsapp={mappedBusiness.whatsapp}
      phone={mappedBusiness.phone}
      mode="request"
      buttonLabel={primaryCtaLabel}
      sheetTitle={primaryCtaLabel}
      sheetDescription="أرسل طلبك مباشرة."
      buttonClassName={desktop
        ? "flex h-12 w-full items-center justify-center rounded-2xl px-5 text-sm font-black text-white"
        : "flex h-11 w-full items-center justify-center rounded-xl px-4 text-[13px] font-black text-white"}
      buttonStyle={{ backgroundColor: accentColor }}
    />
  );

  const ServicesGrid = ({ desktop = false }: { desktop?: boolean }) => {
    if (!showServicesSection) return null;
    const items = desktop ? mappedBusiness.services.slice(0, 8) : mappedBusiness.services.slice(0, 4);
    const icons = [Building2, Wrench, Sparkles, Users];
    return (
      <section id="services-section" className={desktop ? "py-7" : "py-5"}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className={desktop ? "text-[24px] font-black text-[#20173f]" : "text-[18px] font-black text-[#20173f]"}>{serviceSectionTitle || "خدماتنا"}</h2>
          <span className="text-[11px] font-black text-[#5D43EF]">عرض الكل</span>
        </div>
        <div className={desktop ? "grid grid-cols-4 gap-4" : "grid grid-cols-4 gap-2"}>
          {items.map((service, index) => {
            const ServiceIcon = icons[index % icons.length];
            return (
              <article key={service.id} className={desktop
                ? "rounded-[20px] border border-[#eeeaf5] bg-white p-4 text-center shadow-[0_10px_30px_-26px_rgba(47,28,90,.4)]"
                : "rounded-[16px] border border-[#eeeaf5] bg-white px-2 py-3 text-center"}>
                <div className={desktop
                  ? "mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f0ecff] text-[#5D43EF]"
                  : "mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0ecff] text-[#5D43EF]"}>
                  <ServiceIcon className={desktop ? "h-5 w-5" : "h-4 w-4"} />
                </div>
                <h3 className={desktop ? "mt-3 line-clamp-2 min-h-10 text-[13px] font-black leading-5" : "mt-2 line-clamp-2 min-h-8 text-[10px] font-black leading-4"}>
                  {service.name}
                </h3>
                {service.price != null ? <p className="mt-1 text-[10px] font-black text-[#5D43EF]">من {service.price} ر.س</p> : null}
              </article>
            );
          })}
        </div>
      </section>
    );
  };

  const PortfolioGrid = ({ desktop = false }: { desktop?: boolean }) => {
    if (!showPortfolio) return null;
    const items = desktop ? portfolioItems.filter((item) => item.visible !== false && item.title).slice(0, 6) : visiblePortfolio;
    return (
      <section id="portfolio-section" className={desktop ? "py-7" : "py-5"}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className={desktop ? "text-[24px] font-black text-[#20173f]" : "text-[18px] font-black text-[#20173f]"}>{portfolioTitle}</h2>
          <span className="text-[11px] font-black text-[#5D43EF]">عرض الكل</span>
        </div>
        <div className={desktop ? "grid grid-cols-3 gap-4" : "grid grid-cols-2 gap-2.5"}>
          {items.map((item) => (
            <a key={item.id} href={item.url || "#"} target={item.url ? "_blank" : undefined} rel="noreferrer noopener"
              className={desktop ? "group relative aspect-[1.65/1] overflow-hidden rounded-[20px] bg-[#ebe7f2]" : "group relative aspect-[1.45/1] overflow-hidden rounded-[16px] bg-[#ebe7f2]"}>
              {item.imageUrl ? (
                <Image src={item.imageUrl} alt={item.title} fill className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" unoptimized />
              ) : (
                <div className="absolute inset-0 bg-[linear-gradient(135deg,#eff1f8,#e7f5f2)]" />
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-3 pb-3 pt-10 text-right text-[11px] font-black text-white">
                {item.title}
              </div>
            </a>
          ))}
        </div>
      </section>
    );
  };

  const AboutProfile = ({ desktop = false }: { desktop?: boolean }) => (
    <section className={desktop ? "grid grid-cols-[1.45fr_.8fr] gap-4 py-7" : "grid grid-cols-2 gap-2.5 py-5"}>
      {showAboutSection ? (
        <div className={desktop ? "rounded-[22px] border border-[#eeeaf5] bg-white p-6" : "rounded-[18px] border border-[#eeeaf5] bg-white p-4"}>
          <h2 className={desktop ? "text-[20px] font-black text-[#4f37ad]" : "text-[15px] font-black text-[#4f37ad]"}>نبذة عن المؤسسة</h2>
          <p className={desktop ? "mt-3 line-clamp-4 text-[13px] leading-7 text-[#686171]" : "mt-2 line-clamp-4 text-[10px] leading-5 text-[#686171]"}>
            {mappedBusiness.description}
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[#f0edf5] pt-4 text-center">
            <div><b className="block text-[16px]">98%</b><span className="text-[9px] text-[#756f82]">المصداقية</span></div>
            <div><b className="block text-[16px]">{mappedBusiness.services.length}+</b><span className="text-[9px] text-[#756f82]">خدمة</span></div>
            <div><b className="block text-[16px]">5+</b><span className="text-[9px] text-[#756f82]">سنوات خبرة</span></div>
          </div>
        </div>
      ) : <div />}

      {showCompanyProfile && companyProfile ? (
        <a href={companyProfile.pdfUrl} target="_blank" rel="noreferrer noopener"
          className={desktop
            ? "flex min-h-[220px] flex-col justify-between rounded-[22px] bg-gradient-to-br from-[#3d1d98] to-[#6948df] p-6 text-white"
            : "flex min-h-[170px] flex-col justify-between rounded-[18px] bg-gradient-to-br from-[#3d1d98] to-[#6948df] p-4 text-white"}>
          <div className="flex items-center justify-between"><FileText className="h-5 w-5" /><Download className="h-4 w-4" /></div>
          <div>
            <h2 className={desktop ? "text-[20px] font-black" : "text-[14px] font-black"}>{companyProfile.title}</h2>
            <p className={desktop ? "mt-2 line-clamp-2 text-[11px] leading-5 text-white/80" : "mt-1 line-clamp-2 text-[9px] leading-4 text-white/80"}>{companyProfile.description}</p>
          </div>
          <span className="rounded-xl bg-white px-3 py-2 text-center text-[10px] font-black text-[#4d32ad]">{companyProfile.ctaLabel}</span>
        </a>
      ) : null}
    </section>
  );

  const TeamStrip = ({ desktop = false }: { desktop?: boolean }) => {
    if (!showContactTeam) return null;
    const members = [...salesTeam, ...customerServiceTeam].filter((member) => member.visible !== false && member.name);
    return (
      <section id="contact-team-section" className={desktop ? "py-7" : "py-5"}>
        <h2 className={desktop ? "mb-5 text-[24px] font-black text-[#20173f]" : "mb-4 text-[18px] font-black text-[#20173f]"}>تواصل مع فريقنا</h2>
        <div className={desktop ? "flex flex-wrap gap-6" : "flex gap-4 overflow-x-auto pb-1"}>
          {members.map((member) => (
            <a key={member.id}
              href={member.whatsapp ? `https://wa.me/${member.whatsapp}` : member.phone ? `tel:${member.phone}` : "#"}
              target={member.whatsapp ? "_blank" : undefined} rel="noreferrer noopener"
              className={desktop ? "w-[112px] text-center" : "w-[74px] shrink-0 text-center"}>
              <div className={desktop ? "mx-auto flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-full bg-[#eee9ff]" : "mx-auto flex h-[56px] w-[56px] items-center justify-center overflow-hidden rounded-full bg-[#eee9ff]"}>
                {member.photoUrl ? <Image src={member.photoUrl} alt={member.name} width={80} height={80} className="h-full w-full object-cover" unoptimized /> : <span className="text-lg font-black text-[#5D43EF]">{member.name.charAt(0)}</span>}
              </div>
              <b className="mt-2 block truncate text-[11px]">{member.name}</b>
              {member.title ? <span className="mt-0.5 block truncate text-[9px] text-[#7b7485]">{member.title}</span> : null}
            </a>
          ))}
        </div>
      </section>
    );
  };

  const InfoRow = ({ desktop = false }: { desktop?: boolean }) => (
    <section className={desktop ? "grid grid-cols-3 gap-4 py-7" : "grid grid-cols-3 gap-2 py-5"}>
      <a href={mappedBusiness.whatsapp ? `https://wa.me/${mappedBusiness.whatsapp}` : "#"} target={mappedBusiness.whatsapp ? "_blank" : undefined} rel="noreferrer noopener"
        className="rounded-[18px] border border-[#eeeaf5] bg-white p-4 text-center">
        <MessageCircle className="mx-auto h-5 w-5 text-[#5D43EF]" /><b className="mt-2 block text-[11px]">تواصل</b><span className="mt-1 block text-[9px] text-emerald-600">راسلنا الآن</span>
      </a>
      <div className="rounded-[18px] border border-[#eeeaf5] bg-white p-4 text-center">
        <Clock3 className="mx-auto h-5 w-5 text-[#5D43EF]" /><b className="mt-2 block text-[11px]">ساعات العمل</b><span className="mt-1 block text-[9px] text-emerald-600">{openStatus.label}</span>
      </div>
      <a href={mapHref || "#"} target={mapHref ? "_blank" : undefined} rel="noreferrer noopener"
        className="rounded-[18px] border border-[#eeeaf5] bg-white p-4 text-center">
        <MapPin className="mx-auto h-5 w-5 text-[#5D43EF]" /><b className="mt-2 block text-[11px]">موقعنا</b><span className="mt-1 block text-[9px] text-[#5D43EF]">الاتجاهات</span>
      </a>
    </section>
  );

  const SharePanel = () => sharePanelOpen ? (
    <section className="mt-3 flex items-center gap-3 rounded-[18px] border border-[#ece6fa] bg-white p-3">
      <img src={qrDataUrl} alt="QR" className="h-16 w-16 rounded-xl border border-[#eee9f6] p-1" />
      <button type="button" onClick={copyLink} className="flex-1 rounded-xl bg-[#f2eeff] px-3 py-3 text-[11px] font-black text-[#4d36a8]">
        <Copy className="ml-2 inline h-4 w-4" />{copied ? "تم النسخ" : "نسخ رابط الصفحة"}
      </button>
    </section>
  ) : null;

  const MobileBusinessProfile = () => (
    <div className="md:hidden">
      <div className="mx-auto w-full max-w-[430px] px-3 pb-5 pt-3">
        <section className="rounded-[22px] border border-[#ebe7f2] bg-white p-4 shadow-[0_14px_38px_-34px_rgba(49,30,91,.5)]">
          <Identity />
          {mappedBusiness.description ? <p className="mt-3 border-t border-[#f0edf5] pt-3 text-[11px] leading-6 text-[#686171]">{mappedBusiness.description}</p> : null}
        </section>

        <div className="mt-3"><PrimaryAction /></div>
        <div className="mt-2"><QuickActions /></div>
        <SharePanel />

        <ServicesGrid />
        <div className="h-px bg-[#ece8f2]" />
        <PortfolioGrid />
        <div className="h-px bg-[#ece8f2]" />
        <AboutProfile />

        {branchDisplay ? (
          <details className="mb-1 rounded-[18px] border border-[#eeeaf5] bg-white px-4 py-3">
            <summary className="cursor-pointer list-none text-[12px] font-black text-[#2e2446]">
              <span className="text-[10px] text-[#81798d]">فروعنا · </span>{branchDisplay.label}<span className="float-left text-[#5D43EF]">⌄</span>
            </summary>
            <p className="mt-2 text-[10px] leading-5 text-[#6d6678]">{branchDisplay.detail}</p>
          </details>
        ) : null}

        <TeamStrip />
        <InfoRow />
        <div className="space-y-3">{renderRemainingModules(mobileCoreModules)}</div>

        {normalizedSocialLinks.length > 0 ? (
          <footer className="mt-5 flex items-center justify-between border-t border-[#ebe7f2] py-4">
            <div className="flex gap-2">
              {normalizedSocialLinks.slice(0, 5).map((link) => (
                <a key={link.href} href={link.href} target="_blank" rel="noreferrer noopener"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#e7e1f2] text-[9px] font-black text-[#4b368f]">
                  {link.label.slice(0, 1)}
                </a>
              ))}
            </div>
            <span className="text-[9px] font-black text-[#5D43EF]">HEE</span>
          </footer>
        ) : null}
      </div>
    </div>
  );

  const DesktopBusinessProfile = () => (
    <div className="hidden md:block">
      <div className="mx-auto w-full max-w-[1180px] px-8 py-8">
        <header className="grid grid-cols-[1fr_360px] items-start gap-8 border-b border-[#e9e5ef] pb-7">
          <div>
            <Identity desktop />
            {mappedBusiness.description ? <p className="mr-[108px] mt-3 max-w-[720px] text-[13px] leading-7 text-[#686171]">{mappedBusiness.description}</p> : null}
          </div>
          <div className="space-y-3">
            <PrimaryAction desktop />
            <QuickActions desktop />
          </div>
        </header>

        <SharePanel />
        <ServicesGrid desktop />
        <div className="h-px bg-[#e9e5ef]" />
        <PortfolioGrid desktop />
        <div className="h-px bg-[#e9e5ef]" />
        <AboutProfile desktop />

        {branchDisplay ? (
          <details className="rounded-[18px] border border-[#eeeaf5] bg-white px-5 py-4">
            <summary className="cursor-pointer list-none text-[13px] font-black text-[#2e2446]">
              <span className="text-[11px] text-[#81798d]">فروعنا · </span>{branchDisplay.label}<span className="float-left text-[#5D43EF]">⌄</span>
            </summary>
            <p className="mt-2 text-[11px] leading-6 text-[#6d6678]">{branchDisplay.detail}</p>
          </details>
        ) : null}

        <TeamStrip desktop />
        <InfoRow desktop />
        <div className="space-y-4">{renderRemainingModules(desktopCoreModules)}</div>

        <footer className="mt-8 flex items-center justify-between border-t border-[#e9e5ef] py-5">
          <div className="flex gap-2">
            {normalizedSocialLinks.slice(0, 6).map((link) => (
              <a key={link.href} href={link.href} target="_blank" rel="noreferrer noopener"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#e7e1f2] text-[10px] font-black text-[#4b368f]">
                {link.label.slice(0, 1)}
              </a>
            ))}
          </div>
          <span className="text-[10px] font-black text-[#5D43EF]">صفحة أعمال ذكية من HEE</span>
        </footer>
      </div>
    </div>
  );

  return (
    <main
      dir="rtl"
      data-renderer="public-business-page-v10-real-split-renderer"
      style={{ "--hee-accent": accentColor } as React.CSSProperties}
      className="min-h-screen bg-[#faf9fc] pb-[72px] text-[#211642] md:pb-0"
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      {/* No cover/hero. Mobile and desktop are deliberately separate render trees. */}
      <MobileBusinessProfile />
      <DesktopBusinessProfile />

      <PublicStickyMobileActions
        businessKind={businessKind}
        servicesLabel={serviceSectionTitle || "الخدمات"}
        contactHref={contactNavTarget}
        hasOffers={showOffersSection}
        hasLocation={Boolean(showLocationSection)}
        hasGallery={Boolean(showPortfolio)}
        hasReviews={false}
        hasServices={showServicesSection}
        hasProducts={showProductsSection}
        hasContact={Boolean(mappedBusiness.whatsapp || mappedBusiness.phone || mapHref)}
      />
    </main>
  );
}

"use client";

import { useState } from "react";
import { Copy, Download, MapPin, MessageCircle, Phone, QrCode, Share2 } from "lucide-react";
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

  const profileMetrics = [
    { label: "خدماتنا", value: `${mappedBusiness.services.length ?? 0}` },
    { label: "أعمالنا", value: `${portfolioItems.length ?? 0}` },
    { label: "الساعات", value: `${mappedBusiness.openingHours.length ?? 0}` },
  ];

  const branchItems = [
    { city: mappedBusiness.city || "جدة", district: mappedBusiness.district || "حي الروضة", address: mappedBusiness.address || "حي الروضة، جدة" },
  ];

  return (
    <main dir="rtl" data-renderer="public-business-page-v2" style={{ "--hee-accent": accentColor } as React.CSSProperties} className="min-h-screen bg-[#f5f3fb] px-0 py-0 text-[#1e1a2e] lg:flex lg:items-start lg:justify-center lg:py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      <div className="mx-auto w-full max-w-[440px] px-3 py-3 md:px-4 lg:max-w-[430px] lg:px-0 lg:py-0">
        <section className="relative overflow-hidden rounded-[32px] border border-[#eee7ff] bg-white shadow-[0_35px_85px_-38px_rgba(91,71,155,0.35)] lg:shadow-[0_30px_70px_-34px_rgba(82,63,163,0.38)]">
          <div className="relative h-[420px] overflow-hidden md:h-[500px]">
            {mappedBusiness.coverUrl ? (
              <Image src={mappedBusiness.coverUrl} alt={mappedBusiness.name} fill sizes="100vw" className="object-cover object-center" priority unoptimized />
            ) : (
              <div className="h-full w-full bg-[linear-gradient(135deg,#dfe4ff_0%,#f8f3ff_35%,#dfe6ff_100%)]" />
            )}
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,12,20,0.42)_0%,rgba(17,15,23,0.20)_42%,rgba(17,15,23,0.35)_100%)]" />

            <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 pt-4 md:px-5 md:pt-5">
              <div className="flex items-center gap-2">
                <PublicFavoriteButton
                  businessId={mappedBusiness.id}
                  businessName={mappedBusiness.name}
                  variant="pill"
                  className="border border-white/25 bg-white/15 text-white backdrop-blur-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setSharePanelOpen((value) => !value)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white shadow-sm backdrop-blur-sm md:h-11 md:w-11">
                  <Share2 className="h-4 w-4" />
                </button>
                <div className="flex h-10 items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 text-sm font-black text-white backdrop-blur-sm md:h-11">
                  <span className="text-lg leading-none">HEE</span>
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[10px]">☰</span>
                </div>
              </div>
            </div>

            <div className="absolute inset-x-0 top-28 z-20 px-4 md:top-24 md:px-6">
              <div className="flex items-start justify-between gap-4">
                <div className="max-w-[72%] md:max-w-[62%]">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-[#1c1b2d]/40 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm md:text-[11px]">
                    <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    {mappedBusiness.isVerified ? "منشور" : "مؤكد"}
                  </div>

                  <h1 className="text-[30px] font-black leading-[1.1] tracking-[-0.03em] text-white md:text-[52px]">
                    {mappedBusiness.name}
                  </h1>

                  {mappedBusiness.businessType ? (
                    <p className="mt-2 text-sm font-semibold text-white/90 md:text-lg">
                      {mappedBusiness.businessType}
                    </p>
                  ) : null}

                  {mappedBusiness.description ? (
                    <p className="mt-3 max-w-[38ch] text-sm leading-7 text-white/85 md:text-base">
                      {mappedBusiness.description}
                    </p>
                  ) : null}

                  <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-white/90 md:text-xs">
                    {mappedBusiness.city ? <span className="rounded-full bg-white/10 px-2 py-1">{mappedBusiness.city}</span> : null}
                    {mappedBusiness.district ? <span className="rounded-full bg-white/10 px-2 py-1">{mappedBusiness.district}</span> : null}
                    {openStatus.label ? <span className="rounded-full bg-white/10 px-2 py-1">{openStatus.label}</span> : null}
                  </div>
                </div>

                <div className="relative mt-8 shrink-0 md:mt-0">
                  <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[26px] border-4 border-white bg-white shadow-[0_22px_45px_-24px_rgba(24,30,84,0.6)] md:h-32 md:w-32">
                    {mappedBusiness.logoUrl ? (
                      <Image src={mappedBusiness.logoUrl} alt={mappedBusiness.name} width={160} height={160} className="h-full w-full object-cover" unoptimized />
                    ) : (
                      <span className="text-2xl font-black text-[#4d3ea5] md:text-4xl">{mappedBusiness.name.charAt(0)}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-20 -mt-1 rounded-t-[28px] bg-white px-3 pb-3 pt-4 md:px-5 md:pb-4">
            <div className="grid gap-2 md:grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr_0.9fr]">
              <button type="button" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#5f47d7] px-4 text-sm font-black text-white shadow-[0_18px_40px_-18px_rgba(95,71,215,0.7)]">
                <MessageCircle className="h-4 w-4" />
                اطلب الخدمة الآن
              </button>
              <a href={mappedBusiness.whatsapp ? `https://wa.me/${mappedBusiness.whatsapp}` : '#'} target={mappedBusiness.whatsapp ? '_blank' : undefined} rel={mappedBusiness.whatsapp ? 'noreferrer noopener' : undefined} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#e9e3ff] bg-[#f5f2ff] text-sm font-bold text-[#3a2d80]">
                <MessageCircle className="h-4 w-4" />
                واتساب
              </a>
              <a href={mappedBusiness.phone ? `tel:${mappedBusiness.phone}` : '#'} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#e9e3ff] bg-[#f5f2ff] text-sm font-bold text-[#3a2d80]">
                <Phone className="h-4 w-4" />
                اتصال
              </a>
              {mapHref ? (
                <a href={mapHref} target="_blank" rel="noreferrer noopener" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#e9e3ff] bg-[#f5f2ff] text-sm font-bold text-[#3a2d80]">
                  <MapPin className="h-4 w-4" />
                  الموقع
                </a>
              ) : (
                <span className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#e9e3ff] bg-[#f5f2ff] text-sm font-bold text-[#3a2d80] opacity-80">
                  <MapPin className="h-4 w-4" />
                  الموقع
                </span>
              )}
              <button type="button" onClick={() => setSharePanelOpen((value) => !value)} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#e9e3ff] bg-[#f5f2ff] text-sm font-bold text-[#3a2d80]">
                <Share2 className="h-4 w-4" />
                مشاركة
              </button>
            </div>
          </div>
        </section>

        {sharePanelOpen ? (
          <section className="mt-4 rounded-[26px] border border-[#ece4ff] bg-white p-4 shadow-[0_18px_40px_-28px_rgba(92,73,160,0.3)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="mx-auto h-28 w-28 overflow-hidden rounded-2xl border border-[#efe8ff] bg-white p-2">
                <img src={qrDataUrl} alt="QR" className="h-full w-full object-contain" />
              </div>
              <div className="grid flex-1 gap-2 md:grid-cols-2">
                <button type="button" onClick={copyLink} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#e5dffc] bg-[#f7f4ff] text-sm font-bold text-[#3a2d80]">
                  <Copy className="h-4 w-4" />
                  نسخ الرابط
                </button>
                <a href={qrDataUrl} download="hee-qr.png" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#e5dffc] bg-[#f7f4ff] text-sm font-bold text-[#3a2d80]">
                  <Download className="h-4 w-4" />
                  تنزيل QR
                </a>
                <PublicShareButton title={mappedBusiness.name} text={mappedBusiness.description ?? mappedBusiness.businessType} url={publicUrl} label="مشاركة الصفحة" fullWidth className="rounded-xl border border-[#e5dffc] bg-[#f7f4ff] text-sm font-bold text-[#3a2d80]" />
                <PublicSaveContact businessName={mappedBusiness.name} phone={mappedBusiness.phone} whatsapp={mappedBusiness.whatsapp} email={mappedBusiness.email} website={mappedBusiness.website} address={mappedBusiness.address} city={mappedBusiness.city} publicUrl={publicUrl} />
              </div>
            </div>
          </section>
        ) : null}

        <section className="mt-6 rounded-[28px] border border-[#ebe3f9] bg-white p-4 shadow-[0_20px_45px_-30px_rgba(80,60,160,0.24)] md:p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-[26px] font-black text-[#2a1c52]">خدماتنا</h2>
            <button type="button" className="text-sm font-bold text-[#5f47d7]">عرض الكل</button>
          </div>

          {showServicesSection && mappedBusiness.services.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {mappedBusiness.services.slice(0, 4).map((service) => (
                <article key={service.id} className="rounded-[24px] border border-[#ece7ff] bg-[#f8f6ff] p-3 shadow-[0_16px_30px_-32px_rgba(68,59,135,0.55)]">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#efe9ff] text-xl text-[#5f47d7]">
                    {service.name.trim().charAt(0) || "•"}
                  </div>
                  <h3 className="text-lg font-black text-[#2a1c52]">{service.name}</h3>
                  <p className="mt-2 text-sm leading-7 text-[#5f6077]">{service.description || "خدمة متخصصة حسب احتياج العميل"}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                    {service.price ? <span className="rounded-full bg-[#efe9ff] px-2 py-1 font-bold text-[#5f47d7]">{service.price.toLocaleString("ar-SA")} ر.س</span> : null}
                    {service.durationMinutes ? <span className="rounded-full bg-[#f1f5ff] px-2 py-1 text-[#46526d]">{service.durationMinutes} دقيقة</span> : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#dcd5f3] bg-[#faf8ff] p-4 text-sm text-[#686a7f]">لا توجد خدمات حالياً.</div>
          )}
        </section>

        {showPortfolio && portfolioItems.length > 0 ? (
          <section className="mt-6 rounded-[28px] border border-[#ebe3f9] bg-white p-4 shadow-[0_20px_45px_-30px_rgba(80,60,160,0.24)] md:p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-[26px] font-black text-[#2a1c52]">أعمالنا</h2>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setSharePanelOpen((value) => !value)} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#e4dffa] bg-[#f7f4ff] text-[#422d8b]">‹</button>
                <button type="button" onClick={() => setSharePanelOpen((value) => !value)} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#e4dffa] bg-[#f7f4ff] text-[#422d8b]">›</button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {portfolioItems.slice(0, 4).map((item) => (
                <article key={item.id} className="overflow-hidden rounded-[24px] border border-[#ece7ff] bg-[#fbfaff]">
                  {item.imageUrl ? (
                    <div className="relative h-48 w-full">
                      <Image src={item.imageUrl} alt={item.title} fill sizes="(max-width: 768px) 100vw, 25vw" className="object-cover" unoptimized />
                    </div>
                  ) : null}
                  <div className="p-3">
                    <p className="text-base font-black text-[#2a1c52]">{item.title}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {showAboutSection || showCompanyProfile ? (
          <section className="mt-6 grid gap-4 lg:grid-cols-[1.45fr_0.85fr]">
            {showAboutSection ? (
              <div className="rounded-[28px] border border-[#ebe3f9] bg-white p-4 shadow-[0_20px_45px_-30px_rgba(80,60,160,0.24)] md:p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-[26px] font-black text-[#2a1c52]">نبذة عن المؤسسة</h2>
                </div>
                <p className="text-base leading-8 text-[#545d77]">{mappedBusiness.description}</p>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {profileMetrics.map((metric) => (
                    <div key={metric.label} className="rounded-2xl bg-[#f7f4ff] p-3 text-center">
                      <div className="text-[22px] font-black text-[#2a1c52]">{metric.value}</div>
                      <div className="mt-1 text-sm text-[#5d6079]">{metric.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {showCompanyProfile && companyProfile ? (
              <div className="rounded-[28px] bg-[#5f47d7] p-4 text-white shadow-[0_30px_55px_-28px_rgba(90,71,213,0.7)] md:p-5">
                <div className="flex h-full flex-col justify-between">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="text-[16px] font-bold text-white/90">PDF</div>
                    <div className="rounded-full bg-white/15 px-2 py-1 text-xs font-bold">الملف التعريفي</div>
                  </div>
                  <div className="flex-1">
                    <p className="text-[24px] font-black leading-tight">{companyProfile.title}</p>
                    <p className="mt-3 max-w-[26ch] text-sm leading-7 text-white/85">{companyProfile.description || "ملف المؤسسة يتضمن خدماتنا ومؤهلاتنا."}</p>
                  </div>
                  <a href={companyProfile.pdfUrl} target="_blank" rel="noreferrer noopener" className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-black text-[#4b38a8]">
                    <Download className="h-4 w-4" />
                    {companyProfile.ctaLabel || "عرض الملف التعريفي"}
                  </a>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {branchDisplay ? (
          <section className="mt-6 rounded-[28px] border border-[#ebe3f9] bg-white p-4 shadow-[0_20px_45px_-30px_rgba(80,60,160,0.24)] md:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#6f7193]">فروعنا</p>
                <h2 className="mt-1 text-[26px] font-black text-[#2a1c52]">{branchDisplay.label}</h2>
              </div>
              <button type="button" onClick={() => setSharePanelOpen((value) => !value)} className="inline-flex h-11 items-center justify-center rounded-full border border-[#e4dffa] bg-[#f7f4ff] px-4 text-sm font-bold text-[#3a2d80]">
                عرض جميع الفروع
              </button>
            </div>
            <p className="mt-3 text-base text-[#5e617a]">{branchDisplay.detail}</p>
          </section>
        ) : null}

        {showContactTeam ? (
          <section className="mt-6 rounded-[28px] border border-[#ebe3f9] bg-white p-4 shadow-[0_20px_45px_-30px_rgba(80,60,160,0.24)] md:p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-[26px] font-black text-[#2a1c52]">تواصل مع فريقنا</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {[...salesTeam.slice(0, 2), ...customerServiceTeam.slice(0, 2)].map((member) => (
                <article key={member.id} className="rounded-[22px] border border-[#ece7ff] bg-[#f8f6ff] p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-[#5f47d7] text-lg font-black text-white">
                      {member.name?.charAt(0) || 'م'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-black text-[#2a1c52]">{member.name}</p>
                      <p className="text-sm text-[#5e617a]">{member.title || 'فريق الدعم'}</p>
                    </div>
                    <a href={member.whatsapp ? `https://wa.me/${member.whatsapp}` : '#'} target={member.whatsapp ? '_blank' : undefined} rel={member.whatsapp ? 'noreferrer noopener' : undefined} className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#ebf9ef] text-[#15803d]">
                      <MessageCircle className="h-4 w-4" />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {(showLocationSection || showHoursSection || showInquiry) ? (
          <section className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr_0.9fr]">
            {showLocationSection ? (
              <div className="rounded-[28px] border border-[#ebe3f9] bg-white p-4 shadow-[0_20px_45px_-30px_rgba(80,60,160,0.24)] md:p-5">
                <h2 className="text-[26px] font-black text-[#2a1c52]">موقعنا</h2>
                <div className="mt-3 overflow-hidden rounded-[18px] border border-[#ece7ff] bg-[#f5f7ff]">
                  <div className="flex h-36 items-center justify-center bg-[radial-gradient(circle_at_center,#dfeaff,#edf0ff_62%,#edf0ff_100%)] text-3xl text-[#5f47d7]">⌖</div>
                </div>
                <p className="mt-3 text-base leading-8 text-[#5e617a]">{mappedBusiness.address || [mappedBusiness.city, mappedBusiness.district].filter(Boolean).join(' • ')}</p>
                {mapHref ? <a href={mapHref} target="_blank" rel="noreferrer noopener" className="mt-3 inline-flex h-10 items-center justify-center rounded-xl bg-[#5f47d7] px-4 text-sm font-black text-white">الاتجاهات</a> : null}
              </div>
            ) : null}

            {showHoursSection ? (
              <div className="rounded-[28px] border border-[#ebe3f9] bg-white p-4 shadow-[0_20px_45px_-30px_rgba(80,60,160,0.24)] md:p-5">
                <h2 className="text-[26px] font-black text-[#2a1c52]">ساعات العمل</h2>
                <div className="mt-3 rounded-2xl bg-[#f7f4ff] p-3 text-[#3d2d71]">
                  <div className="text-sm font-bold">{openStatus.label}</div>
                  <div className="mt-1 text-sm text-[#5d6079]">{openStatus.detail}</div>
                </div>
                <div className="mt-4 space-y-2 text-sm text-[#5d6079]">
                  {mappedBusiness.openingHours.slice(0, 7).map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between border-b border-dashed border-[#eee8ff] pb-2 last:border-b-0 last:pb-0">
                      <span>{['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'][entry.dayOfWeek] ?? `يوم ${entry.dayOfWeek + 1}`}</span>
                      <span>{entry.isClosed ? 'مغلق' : [entry.opensAt, entry.closesAt].filter(Boolean).join(' - ') || 'مفتوح'}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {showInquiry ? (
              <div className="rounded-[28px] border border-[#ebe3f9] bg-white p-4 shadow-[0_20px_45px_-30px_rgba(80,60,160,0.24)] md:p-5">
                <h2 className="text-[26px] font-black text-[#2a1c52]">تواصل سريع</h2>
                <p className="mt-3 text-base leading-8 text-[#5e617a]">للاستفسارات أو الطلبات، تواصل معنا مباشرة.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {mappedBusiness.whatsapp ? (
                    <a href={`https://wa.me/${mappedBusiness.whatsapp}`} target="_blank" rel="noreferrer noopener" className="inline-flex h-11 items-center justify-center rounded-xl bg-[#5f47d7] px-4 text-sm font-black text-white">واتساب</a>
                  ) : null}
                  {mappedBusiness.phone ? (
                    <a href={`tel:${mappedBusiness.phone}`} className="inline-flex h-11 items-center justify-center rounded-xl border border-[#e4dffa] bg-[#f7f4ff] px-4 text-sm font-black text-[#3a2d80]">اتصال</a>
                  ) : null}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {normalizedSocialLinks.length > 0 ? (
          <footer className="mt-6 rounded-[28px] border border-[#ebe3f9] bg-white p-4 shadow-[0_20px_45px_-30px_rgba(80,60,160,0.24)] md:p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {normalizedSocialLinks.map((link) => (
                  <a key={link.href} href={link.href} target="_blank" rel="noreferrer noopener" className="inline-flex h-10 items-center justify-center rounded-full border border-[#e4dffa] bg-[#f7f4ff] px-3 text-sm font-bold text-[#47378d]">
                    {link.label}
                  </a>
                ))}
              </div>
              <div className="text-sm text-[#5e617a]">
                <span className="font-black text-[#2a1c52]">HEE</span> — أنشئ صفحتك على HEE
              </div>
            </div>
          </footer>
        ) : (
          <footer className="mt-6 rounded-[28px] border border-[#ebe3f9] bg-white p-4 shadow-[0_20px_45px_-30px_rgba(80,60,160,0.24)] md:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-[#5e617a]">HEE</div>
              <div className="text-sm text-[#5e617a]">أنشئ صفحتك على HEE</div>
            </div>
          </footer>
        )}
      </div>

      <PublicStickyMobileActions
        businessKind={businessKind}
        servicesLabel={serviceSectionTitle || (businessKind === "restaurant" ? "القائمة" : "الخدمات")}
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

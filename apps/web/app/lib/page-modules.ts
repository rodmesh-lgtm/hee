import { resolveActivityId, type ActivityId } from "./activity-engine";

export type PageModuleId =
  | "products"
  | "services"
  | "request"
  | "inquiry"
  | "location"
  | "hours"
  | "about"
  | "contact"
  | "links"
  | "externalStore"
  | "contactTeam"
  | "portfolio"
  | "companyProfile";

export type ContactTeamMember = {
  id: string;
  photoUrl?: string;
  name: string;
  title?: string;
  whatsapp?: string;
  phone?: string;
  email?: string;
  visible?: boolean;
  sortOrder?: number;
};

export type PortfolioItem = {
  id: string;
  imageUrl?: string;
  title: string;
  description?: string;
  url?: string;
  ctaLabel?: string;
  visible?: boolean;
  sortOrder?: number;
};

export type CompanyProfileConfig = {
  title?: string;
  description?: string;
  ctaLabel?: string;
  pdfUrl?: string;
  pdfStorageKey?: string;
  pdfFileName?: string;
  pdfFileSize?: number;
  visible?: boolean;
};

export type PageModuleConfig = {
  title?: string;
  ctaLabel?: string;
  sheetTitle?: string;
  sheetDescription?: string;
  showPrice?: boolean;
  showUnit?: boolean;
  careersEnabled?: boolean;
  careersEmail?: string;
  careersExternalUrl?: string;
  careersLabel?: string;
  websiteType?: "WEBSITE" | "ONLINE_STORE";
  websiteUrl?: string;
  businessLinkEnabled?: boolean;
  businessLinkType?: "website" | "store";
  businessLinkUrl?: string;
  businessLinkLabel?: string;
  serviceSectionTitle?: string;
  externalStoreUrl?: string;
  featuredProductIds?: string[];
  productExternalLinks?: Record<string, string>;
  salesTeam?: ContactTeamMember[];
  customerServiceTeam?: ContactTeamMember[];
  portfolioItems?: PortfolioItem[];
  companyProfile?: CompanyProfileConfig;
};

export type PageModuleState = {
  id: PageModuleId;
  enabled: boolean;
  sortOrder: number;
  config: PageModuleConfig;
};

export const PAGE_MODULE_IDS: PageModuleId[] = [
  "products",
  "services",
  "request",
  "inquiry",
  "location",
  "hours",
  "about",
  "contact",
  "links",
  "externalStore",
  "portfolio",
  "companyProfile",
  "contactTeam",
];

export const PAGE_MODULE_LABELS: Record<PageModuleId, string> = {
  products: "المنتجات",
  services: "الخدمات",
  request: "طلب / حجز",
  inquiry: "استفسار",
  location: "الموقع",
  hours: "ساعات العمل",
  about: "نبذة عن النشاط",
  contact: "التواصل",
  links: "روابط إضافية",
  externalStore: "المتجر الإلكتروني",
  companyProfile: "الملف التعريفي",
  contactTeam: "فريق التواصل",
  portfolio: "أعمالنا",
};

function baseModuleConfig(id: PageModuleId): PageModuleConfig {
  switch (id) {
    case "products":
      return { title: PAGE_MODULE_LABELS.products, showPrice: true, showUnit: true };
    case "services":
      return { title: PAGE_MODULE_LABELS.services, showPrice: true };
    case "request":
      return { title: PAGE_MODULE_LABELS.request, ctaLabel: "اطلب الآن", sheetTitle: "طلب / حجز", sheetDescription: "أرسل تفاصيلك وسيتم فتح واتساب مباشرة." };
    case "inquiry":
      return { title: PAGE_MODULE_LABELS.inquiry, ctaLabel: "استفسر الآن", sheetTitle: "استفسار", sheetDescription: "اكتب ملاحظتك وسيتم تجهيز رسالة واتساب جاهزة." };
    case "location":
      return { title: PAGE_MODULE_LABELS.location };
    case "hours":
      return { title: PAGE_MODULE_LABELS.hours };
    case "about":
      return { title: PAGE_MODULE_LABELS.about };
    case "contact":
      return {
        title: PAGE_MODULE_LABELS.contact,
        careersEnabled: false,
        careersEmail: "",
        careersExternalUrl: "",
        careersLabel: "انضم إلى فريقنا",
        websiteType: "WEBSITE",
        websiteUrl: "",
        businessLinkEnabled: false,
        businessLinkType: "website",
        businessLinkUrl: "",
        businessLinkLabel: "",
      };
    case "links":
      return { title: PAGE_MODULE_LABELS.links };
    case "externalStore":
      return { title: PAGE_MODULE_LABELS.externalStore, externalStoreUrl: "" };
    case "companyProfile":
      return {
        title: PAGE_MODULE_LABELS.companyProfile,
        companyProfile: {
          title: "الملف التعريفي",
          description: "",
          ctaLabel: "عرض الملف التعريفي",
          pdfUrl: "",
          pdfStorageKey: "",
          pdfFileName: "",
          pdfFileSize: 0,
          visible: true,
        },
      };
    case "contactTeam":
      return { title: PAGE_MODULE_LABELS.contactTeam, salesTeam: [], customerServiceTeam: [] };
    case "portfolio":
      return { title: PAGE_MODULE_LABELS.portfolio, portfolioItems: [] };
  }
}

const ACTIVITY_PRESETS: Record<ActivityId, Partial<Record<PageModuleId, boolean>>> = {
  CLINIC: { services: true, request: true, inquiry: true, location: true, hours: true, about: true, contact: true, links: false, products: false },
  SALON: { services: true, request: true, inquiry: true, location: true, hours: true, about: true, contact: true, links: false, products: false, contactTeam: true, portfolio: true, companyProfile: true },
  WORKSHOP: { services: true, request: true, inquiry: true, location: true, hours: true, about: true, contact: true, links: false, products: false, contactTeam: true, portfolio: true, companyProfile: true },
  SERVICES: { services: true, request: true, inquiry: true, location: true, hours: true, about: true, contact: true, links: false, products: false, contactTeam: true, portfolio: true, companyProfile: true },
  RESTAURANT: { products: true, services: false, request: true, inquiry: true, location: true, hours: true, about: true, contact: true, links: false, contactTeam: true, portfolio: false, externalStore: false, companyProfile: false },
  GROCERY: { products: true, services: false, request: false, inquiry: true, location: true, hours: true, about: true, contact: true, links: false, contactTeam: true, portfolio: false, externalStore: true, companyProfile: false },
  RETAIL: { products: true, services: false, request: false, inquiry: true, location: true, hours: true, about: true, contact: true, links: false, contactTeam: true, portfolio: false, externalStore: true, companyProfile: false },
  REAL_ESTATE: { products: false, services: false, request: true, inquiry: true, location: true, hours: false, about: true, contact: true, links: false, contactTeam: true, portfolio: true, companyProfile: false },
  TRAINING: { products: false, services: true, request: true, inquiry: true, location: true, hours: true, about: true, contact: true, links: false, contactTeam: true, portfolio: true, companyProfile: true },
  GENERAL: { products: false, services: false, request: true, inquiry: true, location: true, hours: true, about: true, contact: true, links: false, contactTeam: true, portfolio: true, companyProfile: true },
};

function moduleEnabledByPreset(activityId: ActivityId, moduleId: PageModuleId) {
  return ACTIVITY_PRESETS[activityId][moduleId] ?? true;
}

export function getDefaultPageModules(businessType: string | null | undefined): PageModuleState[] {
  const activityId = resolveActivityId(businessType);

  return PAGE_MODULE_IDS.map((id, index) => ({
    id,
    enabled: moduleEnabledByPreset(activityId, id),
    sortOrder: index,
    config: baseModuleConfig(id),
  }));
}

function isPageModuleId(value: string): value is PageModuleId {
  return PAGE_MODULE_IDS.includes(value as PageModuleId);
}

function normalizeSafeHttpUrl(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return "";
  }

  if (raw.startsWith("/")) {
    return raw;
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(raw) && !/^https?:/i.test(raw)) {
    return "";
  }

  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    const parsed = new URL(candidate);
    if (!/^https?:$/i.test(parsed.protocol) || !parsed.hostname || /\s/.test(parsed.href)) {
      return "";
    }
    return parsed.toString();
  } catch {
    return "";
  }
}

function normalizeConfig(id: PageModuleId, raw: unknown) {
  const base = baseModuleConfig(id);
  if (!raw || typeof raw !== "object") {
    return base;
  }

  const source = raw as Partial<PageModuleConfig>;
  return {
    ...base,
    ...(typeof source.title === "string" ? { title: source.title } : {}),
    ...(typeof source.ctaLabel === "string" ? { ctaLabel: source.ctaLabel } : {}),
    ...(typeof source.sheetTitle === "string" ? { sheetTitle: source.sheetTitle } : {}),
    ...(typeof source.sheetDescription === "string" ? { sheetDescription: source.sheetDescription } : {}),
    ...(typeof source.showPrice === "boolean" ? { showPrice: source.showPrice } : {}),
    ...(typeof source.showUnit === "boolean" ? { showUnit: source.showUnit } : {}),
    ...(typeof source.careersEnabled === "boolean" ? { careersEnabled: source.careersEnabled } : {}),
    ...(typeof source.careersEmail === "string" ? { careersEmail: source.careersEmail } : {}),
    ...(typeof source.careersExternalUrl === "string" ? { careersExternalUrl: normalizeSafeHttpUrl(source.careersExternalUrl) } : {}),
    ...(typeof source.careersLabel === "string" ? { careersLabel: source.careersLabel } : {}),
    ...((source.websiteType === "WEBSITE" || source.websiteType === "ONLINE_STORE") ? { websiteType: source.websiteType } : {}),
    ...(typeof source.websiteUrl === "string" ? { websiteUrl: normalizeSafeHttpUrl(source.websiteUrl) } : {}),
    ...(typeof source.businessLinkEnabled === "boolean" ? { businessLinkEnabled: source.businessLinkEnabled } : {}),
    ...(source.businessLinkType === "website" || source.businessLinkType === "store" ? { businessLinkType: source.businessLinkType } : {}),
    ...(typeof source.businessLinkUrl === "string" ? { businessLinkUrl: normalizeSafeHttpUrl(source.businessLinkUrl) } : {}),
    ...(typeof source.businessLinkLabel === "string" ? { businessLinkLabel: source.businessLinkLabel } : {}),
    ...(typeof source.serviceSectionTitle === "string" ? { serviceSectionTitle: source.serviceSectionTitle } : {}),
    ...(typeof source.externalStoreUrl === "string" ? { externalStoreUrl: normalizeSafeHttpUrl(source.externalStoreUrl) } : {}),
    ...(Array.isArray(source.featuredProductIds)
      ? {
          featuredProductIds: source.featuredProductIds
            .map((entry) => String(entry).trim())
            .filter(Boolean)
            .slice(0, 3),
        }
      : {}),
    ...(source.productExternalLinks && typeof source.productExternalLinks === "object"
      ? {
          productExternalLinks: Object.fromEntries(
            Object.entries(source.productExternalLinks as Record<string, unknown>)
              .map(([key, value]) => [key, normalizeSafeHttpUrl(value)])
              .filter(([key, value]) => key.trim().length > 0 && value.length > 0),
          ),
        }
      : {}),
    ...(Array.isArray(source.salesTeam)
      ? {
          salesTeam: source.salesTeam.map((member, index) => {
            const item = member as Record<string, unknown>;
            return {
              id: String(item.id ?? crypto.randomUUID()),
              photoUrl: normalizeSafeHttpUrl(item.photoUrl) || undefined,
              name: String(item.name ?? "").trim(),
              title: String(item.title ?? "").trim() || undefined,
              whatsapp: String(item.whatsapp ?? "").trim() || undefined,
              phone: String(item.phone ?? "").trim() || undefined,
              email: String(item.email ?? "").trim() || undefined,
              visible: item.visible === false ? false : true,
              sortOrder: Number.isFinite(item.sortOrder) ? Number(item.sortOrder) : index,
            };
          }),
        }
      : {}),
    ...(Array.isArray(source.customerServiceTeam)
      ? {
          customerServiceTeam: source.customerServiceTeam.map((member, index) => {
            const item = member as Record<string, unknown>;
            return {
              id: String(item.id ?? crypto.randomUUID()),
              photoUrl: normalizeSafeHttpUrl(item.photoUrl) || undefined,
              name: String(item.name ?? "").trim(),
              title: String(item.title ?? "").trim() || undefined,
              whatsapp: String(item.whatsapp ?? "").trim() || undefined,
              phone: String(item.phone ?? "").trim() || undefined,
              email: String(item.email ?? "").trim() || undefined,
              visible: item.visible === false ? false : true,
              sortOrder: Number.isFinite(item.sortOrder) ? Number(item.sortOrder) : index,
            };
          }),
        }
      : {}),
    ...(Array.isArray(source.portfolioItems)
      ? {
          portfolioItems: source.portfolioItems.map((entry, index) => {
            const item = entry as Record<string, unknown>;
            return {
              id: String(item.id ?? crypto.randomUUID()),
              imageUrl: normalizeSafeHttpUrl(item.imageUrl) || undefined,
              title: String(item.title ?? "").trim(),
              description: String(item.description ?? "").trim() || undefined,
              url: normalizeSafeHttpUrl(item.url) || undefined,
              ctaLabel: String(item.ctaLabel ?? "").trim() || undefined,
              visible: item.visible === false ? false : true,
              sortOrder: Number.isFinite(item.sortOrder) ? Number(item.sortOrder) : index,
            };
          }),
        }
      : {}),
    ...(source.companyProfile && typeof source.companyProfile === "object"
      ? {
          companyProfile: {
            title: String((source.companyProfile as CompanyProfileConfig).title ?? "").trim() || "الملف التعريفي",
            description: String((source.companyProfile as CompanyProfileConfig).description ?? "").trim() || "",
            ctaLabel: String((source.companyProfile as CompanyProfileConfig).ctaLabel ?? "").trim() || "عرض الملف التعريفي",
            pdfUrl: normalizeSafeHttpUrl((source.companyProfile as CompanyProfileConfig).pdfUrl) || "",
            pdfStorageKey: String((source.companyProfile as CompanyProfileConfig).pdfStorageKey ?? "").trim(),
            pdfFileName: String((source.companyProfile as CompanyProfileConfig).pdfFileName ?? "").trim() || "",
            pdfFileSize: Number.isFinite((source.companyProfile as CompanyProfileConfig).pdfFileSize)
              ? Number((source.companyProfile as CompanyProfileConfig).pdfFileSize)
              : 0,
            visible: (source.companyProfile as CompanyProfileConfig).visible === false ? false : true,
          },
        }
      : {}),
  };
}

function parsePageModulesPayload(raw: unknown) {
  if (typeof raw !== "string") {
    return raw;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

export function normalizePageModulesInput(raw: unknown, businessType: string | null | undefined): PageModuleState[] {
  const defaults = getDefaultPageModules(businessType);
  const parsed = parsePageModulesPayload(raw);
  if (!Array.isArray(parsed)) {
    return defaults;
  }

  const byId = new Map<string, unknown>();
  for (const entry of parsed) {
    if (entry && typeof entry === "object" && "id" in entry) {
      const candidate = String((entry as { id?: unknown }).id ?? "");
      if (isPageModuleId(candidate)) {
        byId.set(candidate, entry);
      }
    }
  }

  return PAGE_MODULE_IDS.map((id, index) => {
    const existing = byId.get(id) as Partial<PageModuleState> | undefined;
    const isLegacyMissingCompanyProfile = id === "companyProfile" && !existing;
    return {
      id,
      enabled: typeof existing?.enabled === "boolean" ? existing.enabled : isLegacyMissingCompanyProfile ? true : defaults[index]?.enabled ?? true,
      sortOrder: typeof existing?.sortOrder === "number" ? existing.sortOrder : index,
      config: normalizeConfig(id, existing?.config),
    };
  }).sort((left, right) => left.sortOrder - right.sortOrder);
}

export function normalizePageModules(raw: unknown, businessType: string | null | undefined): PageModuleState[] {
  return normalizePageModulesInput(raw, businessType);
}

export function normalizePageModulesForPersistence(raw: unknown, businessType: string | null | undefined): PageModuleState[] {
  return normalizePageModulesInput(raw, businessType);
}

export function serializePageModules(modules: PageModuleState[]) {
  return modules.map((module, index) => ({
    id: module.id,
    enabled: module.enabled,
    sortOrder: index,
    config: module.config,
  }));
}
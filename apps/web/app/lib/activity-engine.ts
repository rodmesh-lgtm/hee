export type ActivityId =
  | "CLINIC"
  | "SALON"
  | "WORKSHOP"
  | "SERVICES"
  | "RESTAURANT"
  | "GROCERY"
  | "RETAIL"
  | "REAL_ESTATE"
  | "TRAINING"
  | "GENERAL";

export type ActionFieldKey =
  | "name"
  | "phone"
  | "date"
  | "time"
  | "service"
  | "vehicleType"
  | "product"
  | "quantity"
  | "message"
  | "notes";

export type ActivityProfile = {
  id: ActivityId;
  labelAr: string;
  aliases: string[];
  primaryActionLabel: string;
  requestTitle: string;
  formFields: ActionFieldKey[];
  recommendedModules: {
    booking: boolean;
    catalog: boolean;
  };
};

export const ACTION_FIELD_LABELS: Record<ActionFieldKey, string> = {
  name: "الاسم",
  phone: "رقم الجوال",
  date: "التاريخ المطلوب",
  time: "الوقت المطلوب",
  service: "الخدمة المطلوبة",
  vehicleType: "نوع السيارة",
  product: "المنتج",
  quantity: "الكمية",
  message: "الطلب / الاستفسار",
  notes: "ملاحظات",
};

export const ACTIVITY_PROFILES: Record<ActivityId, ActivityProfile> = {
  CLINIC: {
    id: "CLINIC",
    labelAr: "عيادة / مركز طبي",
    aliases: ["clinic", "medical", "doctor", "health", "عيادة", "مركز طبي", "طبي", "دكتور"],
    primaryActionLabel: "حجز موعد",
    requestTitle: "طلب حجز موعد جديد",
    formFields: ["name", "phone", "date", "time", "notes"],
    recommendedModules: { booking: true, catalog: false },
  },
  SALON: {
    id: "SALON",
    labelAr: "صالون / حلاق / تجميل",
    aliases: ["salon", "barber", "beauty", "spa", "صالون", "حلاق", "تجميل"],
    primaryActionLabel: "احجز موعدك",
    requestTitle: "طلب موعد جديد",
    formFields: ["name", "phone", "date", "time", "service", "notes"],
    recommendedModules: { booking: true, catalog: false },
  },
  WORKSHOP: {
    id: "WORKSHOP",
    labelAr: "ورشة / صيانة سيارات",
    aliases: ["workshop", "garage", "repair", "auto", "car", "ورشة", "صيانة", "سيارات"],
    primaryActionLabel: "حجز خدمة",
    requestTitle: "طلب حجز خدمة",
    formFields: ["name", "phone", "service", "vehicleType", "notes"],
    recommendedModules: { booking: true, catalog: false },
  },
  SERVICES: {
    id: "SERVICES",
    labelAr: "خدمات عامة / خدمات مهنية",
    aliases: ["services", "service", "agency", "consulting", "خدمات", "مهنية", "شركة خدمات"],
    primaryActionLabel: "طلب خدمة",
    requestTitle: "طلب خدمة جديد",
    formFields: ["name", "phone", "service", "notes"],
    recommendedModules: { booking: true, catalog: false },
  },
  RESTAURANT: {
    id: "RESTAURANT",
    labelAr: "مطعم / مقهى",
    aliases: ["restaurant", "cafe", "coffee", "food", "مطعم", "مقهى", "كافيه"],
    primaryActionLabel: "اطلب الآن",
    requestTitle: "طلب جديد",
    formFields: ["name", "phone", "product", "quantity", "notes"],
    recommendedModules: { booking: false, catalog: true },
  },
  GROCERY: {
    id: "GROCERY",
    labelAr: "خضار وفواكه / بقالة / أغذية",
    aliases: ["grocery", "market", "supermarket", "vegetable", "fruit", "بقالة", "خضار", "فواكه", "اغذية", "مواد غذائية"],
    primaryActionLabel: "طلب / استفسار",
    requestTitle: "طلب / استفسار جديد",
    formFields: ["name", "phone", "message", "notes"],
    recommendedModules: { booking: false, catalog: true },
  },
  RETAIL: {
    id: "RETAIL",
    labelAr: "متجر / بيع بالتجزئة",
    aliases: ["retail", "store", "shop", "متجر", "تجزئة", "محل"],
    primaryActionLabel: "تصفح المنتجات",
    requestTitle: "طلب استفسار عن المنتجات",
    formFields: ["name", "phone", "product", "quantity", "notes"],
    recommendedModules: { booking: false, catalog: true },
  },
  REAL_ESTATE: {
    id: "REAL_ESTATE",
    labelAr: "عقارات",
    aliases: ["real estate", "property", "broker", "عقار", "عقارات", "وساطة"],
    primaryActionLabel: "استفسر الآن",
    requestTitle: "استفسار عقاري جديد",
    formFields: ["name", "phone", "message", "notes"],
    recommendedModules: { booking: false, catalog: false },
  },
  TRAINING: {
    id: "TRAINING",
    labelAr: "تدريب / تعليم",
    aliases: ["training", "education", "course", "academy", "تدريب", "تعليم", "دورات", "اكاديمية"],
    primaryActionLabel: "التسجيل / الاستفسار",
    requestTitle: "طلب تسجيل / استفسار",
    formFields: ["name", "phone", "service", "message", "notes"],
    recommendedModules: { booking: true, catalog: false },
  },
  GENERAL: {
    id: "GENERAL",
    labelAr: "نشاط عام",
    aliases: ["general", "other", "misc", "عام", "اخرى", "أخرى"],
    primaryActionLabel: "تواصل معنا",
    requestTitle: "طلب تواصل جديد",
    formFields: ["name", "phone", "message", "notes"],
    recommendedModules: { booking: false, catalog: false },
  },
};

const EXPLICIT_ACTIVITY_KEYS = new Set<ActivityId>([
  "CLINIC",
  "SALON",
  "WORKSHOP",
  "SERVICES",
  "RESTAURANT",
  "GROCERY",
  "RETAIL",
  "REAL_ESTATE",
  "TRAINING",
  "GENERAL",
]);

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/أ|إ|آ/g, "ا")
    .replace(/ة/g, "ه");
}

export function resolveActivityId(businessType: string | null | undefined): ActivityId {
  if (!businessType) {
    return "GENERAL";
  }

  const raw = businessType.trim();
  const upperRaw = raw.toUpperCase().replace(/\s+/g, "_");
  if (EXPLICIT_ACTIVITY_KEYS.has(upperRaw as ActivityId)) {
    return upperRaw as ActivityId;
  }

  const normalized = normalizeText(raw);

  const bestMatch = (Object.values(ACTIVITY_PROFILES) as ActivityProfile[]).find((profile) =>
    profile.aliases.some((alias) => normalized.includes(normalizeText(alias))),
  );

  return bestMatch?.id ?? "GENERAL";
}

export function getActivityProfile(businessType: string | null | undefined): ActivityProfile {
  return ACTIVITY_PROFILES[resolveActivityId(businessType)];
}

export function activitySelectorOptions() {
  return [
    { value: "CLINIC", label: "عيادة" },
    { value: "RESTAURANT", label: "مطعم" },
    { value: "SALON", label: "صالون" },
    { value: "WORKSHOP", label: "ورشة / صيانة" },
    { value: "SERVICES", label: "خدمات" },
    { value: "GROCERY", label: "بقالة / أغذية" },
    { value: "RETAIL", label: "متجر" },
    { value: "REAL_ESTATE", label: "عقارات" },
    { value: "TRAINING", label: "تدريب" },
    { value: "GENERAL", label: "نشاط عام" },
  ];
}

export function buildActivityRequestMessage(input: {
  businessName: string;
  profile: ActivityProfile;
  values: Partial<Record<ActionFieldKey, string>>;
}) {
  const lines = [input.profile.requestTitle, "", `النشاط: ${input.businessName}`];

  for (const key of input.profile.formFields) {
    const value = input.values[key]?.trim();
    if (!value) continue;
    lines.push(`${ACTION_FIELD_LABELS[key]}: ${value}`);
  }

  return lines.join("\n");
}

export function buildProductRequestMessage(input: {
  businessName: string;
  productLines: Array<{ name: string; quantity: number; unit?: string | null; price: number }>;
}) {
  const lines = ["طلب منتجات جديد", "", `النشاط: ${input.businessName}`];

  input.productLines.forEach((item) => {
    const quantityLabel = `${item.quantity}`;
    const unitLabel = item.unit?.trim() ? ` ${item.unit.trim()}` : "";
    lines.push(`- ${item.name} × ${quantityLabel}${unitLabel}`);
  });

  const total = input.productLines.reduce((sum, item) => sum + item.price * item.quantity, 0);
  lines.push("", `الإجمالي التقريبي: ${new Intl.NumberFormat("ar-SA").format(total)} ر.س`);

  return lines.join("\n");
}

export function resolveCatalogEnabled(input: {
  acceptOnlineOrders: boolean;
  businessType: string | null | undefined;
  hasProducts: boolean;
}) {
  return input.hasProducts;
}

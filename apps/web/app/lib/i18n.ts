export const SUPPORTED_LOCALES = ["ar", "en", "zh-CN", "es", "ur"] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "ar";
export const LOCALE_COOKIE = "hee_locale";

export const LOCALE_META: Record<AppLocale, { label: string; nativeLabel: string; dir: "rtl" | "ltr"; htmlLang: string; intlLocale: string }> = {
  ar: { label: "Arabic", nativeLabel: "العربية", dir: "rtl", htmlLang: "ar", intlLocale: "ar-SA" },
  en: { label: "English", nativeLabel: "English", dir: "ltr", htmlLang: "en", intlLocale: "en-SA" },
  "zh-CN": { label: "Chinese (Mandarin)", nativeLabel: "中文", dir: "ltr", htmlLang: "zh-CN", intlLocale: "zh-CN" },
  es: { label: "Spanish", nativeLabel: "Español", dir: "ltr", htmlLang: "es", intlLocale: "es-SA" },
  ur: { label: "Urdu", nativeLabel: "اردو", dir: "rtl", htmlLang: "ur", intlLocale: "ur-PK" },
};

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function normalizeAppLocale(value: unknown): AppLocale {
  return isAppLocale(value) ? value : DEFAULT_LOCALE;
}

export const GLOBAL_MESSAGES: Record<AppLocale, {
  language: string;
  changeLanguage: string;
  currentLanguage: string;
  save: string;
}> = {
  ar: { language: "اللغة", changeLanguage: "تغيير اللغة", currentLanguage: "اللغة الحالية", save: "حفظ" },
  en: { language: "Language", changeLanguage: "Change language", currentLanguage: "Current language", save: "Save" },
  "zh-CN": { language: "语言", changeLanguage: "切换语言", currentLanguage: "当前语言", save: "保存" },
  es: { language: "Idioma", changeLanguage: "Cambiar idioma", currentLanguage: "Idioma actual", save: "Guardar" },
  ur: { language: "زبان", changeLanguage: "زبان تبدیل کریں", currentLanguage: "موجودہ زبان", save: "محفوظ کریں" },
};

export const SITE_MESSAGES: Record<AppLocale, { title: string; description: string; keywords: string[]; ogLocale: string }> = {
  ar: {
    title: "HEE | هوية أعمال رقمية",
    description: "HEE منصة هوية أعمال رقمية تساعد الشركات والمؤسسات والمتاجر ومقدمي الخدمات على إنشاء صفحة أعمال احترافية موثوقة وسهلة المشاركة.",
    keywords: ["HEE", "هوية أعمال رقمية", "صفحة أعمال", "هوية شركة", "ملف أعمال رقمي", "الشركات", "المؤسسات", "السعودية"],
    ogLocale: "ar_SA",
  },
  en: {
    title: "HEE | Digital Business Identity",
    description: "HEE helps businesses, organizations, stores and service providers create a professional, trusted and shareable digital business presence.",
    keywords: ["HEE", "digital business identity", "business profile", "company profile", "Saudi Arabia"],
    ogLocale: "en_SA",
  },
  "zh-CN": {
    title: "HEE | 数字商业身份",
    description: "HEE 帮助企业、机构、商店和服务提供商创建专业、可信且易于分享的数字商业主页。",
    keywords: ["HEE", "数字商业身份", "企业主页", "公司简介", "沙特阿拉伯"],
    ogLocale: "zh_CN",
  },
  es: {
    title: "HEE | Identidad empresarial digital",
    description: "HEE ayuda a empresas, organizaciones, tiendas y proveedores de servicios a crear una presencia empresarial digital profesional, confiable y fácil de compartir.",
    keywords: ["HEE", "identidad empresarial digital", "perfil empresarial", "perfil de empresa", "Arabia Saudita"],
    ogLocale: "es_SA",
  },
  ur: {
    title: "HEE | ڈیجیٹل کاروباری شناخت",
    description: "HEE کاروباروں، اداروں، دکانوں اور سروس فراہم کنندگان کو پیشہ ورانہ، قابلِ اعتماد اور آسانی سے شیئر ہونے والی ڈیجیٹل کاروباری موجودگی بنانے میں مدد دیتا ہے۔",
    keywords: ["HEE", "ڈیجیٹل کاروباری شناخت", "کاروباری صفحہ", "کمپنی پروفائل", "سعودی عرب"],
    ogLocale: "ur_PK",
  },
};

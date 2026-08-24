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

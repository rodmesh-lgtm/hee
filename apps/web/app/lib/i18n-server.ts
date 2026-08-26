import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, normalizeAppLocale, type AppLocale } from "./i18n";

export async function getRequestLocale(): Promise<AppLocale> {
  try {
    const store = await cookies();
    return normalizeAppLocale(store.get(LOCALE_COOKIE)?.value ?? DEFAULT_LOCALE);
  } catch {
    return DEFAULT_LOCALE;
  }
}

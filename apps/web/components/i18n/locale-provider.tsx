"use client";

import { createContext, useContext, useCallback, type ReactNode } from "react";
import { DEFAULT_LOCALE, LOCALE_META, type AppLocale } from "../../app/lib/i18n";
import { uiText } from "../../app/lib/ui-i18n";

const LocaleContext = createContext<AppLocale>(DEFAULT_LOCALE);

export function LocaleProvider({ locale, children }: { locale: AppLocale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useI18n() {
  const locale = useContext(LocaleContext);
  const t = useCallback((text: string) => uiText(locale, text), [locale]);
  return { locale, t, dir: LOCALE_META[locale].dir, intlLocale: LOCALE_META[locale].intlLocale };
}

/** Explicit UI-copy boundary. Business-authored text does not pass through this component. */
export function UiText({ children }: { children: string }) {
  const { t } = useI18n();
  return t(children);
}

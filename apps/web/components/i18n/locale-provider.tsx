"use client";

import { cloneElement, createContext, useContext, useCallback, type ReactElement, type ReactNode } from "react";
import { DEFAULT_LOCALE, LOCALE_META, type AppLocale } from "../../app/lib/i18n";
import { localizeUiAttributes, uiFormat, uiText } from "../../app/lib/ui-i18n";

const LocaleContext = createContext<AppLocale>(DEFAULT_LOCALE);

export function LocaleProvider({ locale, children }: { locale: AppLocale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useI18n() {
  const locale = useContext(LocaleContext);
  const t = useCallback((text: string) => uiText(locale, text), [locale]);
  const f = useCallback((text: string, values: Record<string, string | number | bigint>) => uiFormat(locale, text, values), [locale]);
  return { locale, t, f, dir: LOCALE_META[locale].dir, intlLocale: LOCALE_META[locale].intlLocale };
}

/** Explicit UI-copy boundary. Business-authored text does not pass through this component. */
export function UiText({ children }: { children: string }) {
  const { t } = useI18n();
  return t(children);
}

/** Translate only presentation attributes; values, names, refs and actions are preserved. */
export function UiAttributes({ children }: { children: ReactElement<Record<string, unknown>> }) {
  const { locale } = useI18n();
  return cloneElement(children, localizeUiAttributes(locale, children.props));
}

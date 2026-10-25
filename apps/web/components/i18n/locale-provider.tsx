"use client";

import { cloneElement, createContext, useContext, useCallback, useMemo, type ReactElement, type ReactNode } from "react";
import { DEFAULT_LOCALE, LOCALE_META, type AppLocale } from "../../app/lib/i18n";
import { formattedUiText, translatedUiAttributes, translatedUiText, type UiMessages } from "../../app/lib/i18n-presentation";

const EMPTY_MESSAGES:UiMessages=Object.freeze({});
const LocaleContext = createContext<{locale:AppLocale;messages:UiMessages}>({locale:DEFAULT_LOCALE,messages:EMPTY_MESSAGES});

export function LocaleProvider({ locale, messages=EMPTY_MESSAGES, children }: { locale: AppLocale; messages?:UiMessages; children: ReactNode }) {
  const value=useMemo(()=>({locale,messages}),[locale,messages]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useI18n() {
  const {locale,messages} = useContext(LocaleContext);
  const t = useCallback((text: string) => translatedUiText(messages, text), [messages]);
  const f = useCallback((text: string, values: Record<string, string | number | bigint>) => formattedUiText(messages, text, values), [messages]);
  return { locale, t, f, dir: LOCALE_META[locale].dir, intlLocale: LOCALE_META[locale].intlLocale };
}

/** Explicit UI-copy boundary. Business-authored text does not pass through this component. */
export function UiText({ children }: { children: string }) {
  const { t } = useI18n();
  return t(children);
}

/** Translate only presentation attributes; values, names, refs and actions are preserved. */
export function UiAttributes({ children, direction = false }: { children: ReactElement<Record<string, unknown>>; direction?: boolean }) {
  const {locale,messages}=useContext(LocaleContext);
  const props = translatedUiAttributes(messages, children.props);
  return cloneElement(children, direction ? { ...props, dir: LOCALE_META[locale].dir } : props);
}

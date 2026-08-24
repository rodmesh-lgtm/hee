"use client";

import { Languages } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { setLocaleAction } from "../app/actions/locale";
import { GLOBAL_MESSAGES, LOCALE_META, SUPPORTED_LOCALES, type AppLocale } from "../app/lib/i18n";

export function LanguageSwitcher({ locale }: { locale: AppLocale }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const query = search.toString();
  const returnTo = `${pathname || "/"}${query ? `?${query}` : ""}`;
  const messages = GLOBAL_MESSAGES[locale];
  const hasMobileDashboardNav = pathname === "/dashboard" || pathname.startsWith("/dashboard/");

  return (
    <details
      className={`group fixed left-4 z-[90] ${hasMobileDashboardNav ? "bottom-20 lg:bottom-4" : "bottom-4"}`}
      dir={LOCALE_META[locale].dir}
    >
      <summary
        aria-label={messages.changeLanguage}
        className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 text-xs font-bold text-slate-700 shadow-lg backdrop-blur transition hover:border-violet-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
      >
        <Languages className="h-4 w-4 text-violet-600" aria-hidden="true" />
        <span>{LOCALE_META[locale].nativeLabel}</span>
      </summary>
      <div className="absolute bottom-14 left-0 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
        <p className="px-2 pb-2 pt-1 text-[10px] font-bold text-slate-400">{messages.changeLanguage}</p>
        <div className="grid gap-1">
          {SUPPORTED_LOCALES.map((item) => (
            <form key={item} action={setLocaleAction}>
              <input type="hidden" name="locale" value={item} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <button
                type="submit"
                aria-current={item === locale ? "true" : undefined}
                className={`flex min-h-10 w-full items-center justify-between rounded-xl px-3 text-start text-xs font-bold transition ${item === locale ? "bg-violet-50 text-violet-700" : "text-slate-600 hover:bg-slate-50"}`}
              >
                <span>{LOCALE_META[item].nativeLabel}</span>
                {item === locale ? <span aria-hidden="true">✓</span> : null}
              </button>
            </form>
          ))}
        </div>
      </div>
    </details>
  );
}

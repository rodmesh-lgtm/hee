"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { isAppLocale, LOCALE_COOKIE, localeCookieDomain, safeLocaleReturnTo } from "../lib/i18n";

export async function setLocaleAction(formData: FormData) {
  const locale = formData.get("locale");
  if (!isAppLocale(locale)) redirect(safeLocaleReturnTo(formData.get("returnTo")));

  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" || String(process.env.VERCEL_ENV ?? "").toLowerCase() === "production",
    path: "/",
    domain: localeCookieDomain((await headers()).get("host")),
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect(safeLocaleReturnTo(formData.get("returnTo")));
}

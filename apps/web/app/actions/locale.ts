"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAppLocale, LOCALE_COOKIE } from "../lib/i18n";

function safeReturnTo(value: FormDataEntryValue | null) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw.startsWith("/") || raw.startsWith("//") || /[\r\n]/.test(raw)) return "/";
  return raw;
}

export async function setLocaleAction(formData: FormData) {
  const locale = formData.get("locale");
  if (!isAppLocale(locale)) redirect(safeReturnTo(formData.get("returnTo")));

  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" || String(process.env.VERCEL_ENV ?? "").toLowerCase() === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect(safeReturnTo(formData.get("returnTo")));
}

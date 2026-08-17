import { headers } from "next/headers";

export const RESERVED_PUBLIC_SLUGS = new Set([
  "",
  "about",
  "admin",
  "api",
  "auth",
  "b",
  "blog",
  "business",
  "contact",
  "dashboard",
  "demo",
  "docs",
  "faq",
  "home",
  "index",
  "login",
  "logout",
  "onboarding",
  "preview",
  "pricing",
  "privacy",
  "register",
  "settings",
  "signup",
  "support",
  "terms",
  "_next",
]);

export function normalizePublicSlug(value: string) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function isReservedPublicSlug(value: string) {
  const normalized = normalizePublicSlug(value);
  if (!normalized) return true;
  if (normalized.length < 4) return true;
  if (RESERVED_PUBLIC_SLUGS.has(normalized)) return true;
  if (normalized.startsWith("_")) return true;
  return normalized.startsWith("api-") || normalized.startsWith("auth-") || normalized.startsWith("dashboard-") || normalized.startsWith("login-") || normalized.startsWith("signup-") || normalized.startsWith("settings-");
}

export function isValidPublicSlug(value: string) {
  const normalized = normalizePublicSlug(value);
  if (!normalized || normalized.length < 4) return false;
  if (!/^[a-z0-9-]+$/.test(normalized)) return false;
  if (normalized.startsWith("-") || normalized.endsWith("-")) return false;
  if (isReservedPublicSlug(normalized)) return false;
  return true;
}

export function getCanonicalPublicBaseUrl() {
  return "https://hee.sa";
}

export function getPublicBusinessUrl(slug: string) {
  const normalized = normalizePublicSlug(slug);
  return `${getCanonicalPublicBaseUrl()}/${normalized}`;
}

export async function getPublicBusinessUrlFromRequest(slug: string) {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "hee.sa";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const normalized = normalizePublicSlug(slug);

  if (host.includes("localhost") || host.includes("127.0.0.1") || host.includes("vercel.app")) {
    return `${protocol}://${host}/${normalized}`;
  }

  return `${protocol}://${host}/${normalized}`;
}

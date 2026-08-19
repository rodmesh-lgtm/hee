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

function safePreviewOrigin(rawHost: string, rawProto: string | null) {
  const host = rawHost.trim().toLowerCase();
  if (!host || /[\s\\/@]/.test(host)) return null;

  const hostname = host.startsWith("[")
    ? host.slice(0, host.indexOf("]") + 1)
    : host.split(":")[0];
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  const isVercelPreview = hostname.endsWith(".vercel.app");
  const isCodespace = hostname.endsWith(".app.github.dev");
  if (!isLocal && !isVercelPreview && !isCodespace) return null;

  const protocol = isLocal && rawProto === "http" ? "http" : "https";
  return `${protocol}://${host}`;
}

export async function getPublicBusinessUrlFromRequest(slug: string) {
  const requestHeaders = await headers();
  const rawHost = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "";
  const rawProto = requestHeaders.get("x-forwarded-proto")?.toLowerCase() ?? null;
  const normalized = normalizePublicSlug(slug);
  const previewOrigin = safePreviewOrigin(rawHost, rawProto);

  // Only known local/preview hosts are reflected. Any custom or spoofed Host header
  // falls back to HEE's canonical production origin.
  return `${previewOrigin ?? getCanonicalPublicBaseUrl()}/${normalized}`;
}

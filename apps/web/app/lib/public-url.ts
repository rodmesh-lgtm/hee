import { headers } from "next/headers";

export const RESERVED_PUBLIC_SLUGS = new Set([
  "", "about", "admin", "api", "auth", "b", "blog", "business", "contact", "dashboard", "demo", "docs", "faq", "home", "index", "login", "logout", "onboarding", "preview", "pricing", "privacy", "register", "settings", "signup", "support", "terms", "_next",
]);

/**
 * High-risk names that customers must never be able to self-register. This is
 * deliberately an exact-match registry: it prevents obvious impersonation
 * without blocking legitimate dictionary-word combinations. An authorized
 * administrator can assign one of these names through the audited admin flow.
 */
export const PROTECTED_PUBLIC_SLUGS = new Set([
  "absher", "adidas", "airbnb", "alahli", "alibaba", "aliexpress", "alrajhi", "amazon", "apple", "aramco",
  "booking", "chatgpt", "coca-cola", "discord", "dropbox", "ebay", "facebook", "face-book", "flynas",
  "github", "gmail", "google", "hungerstation", "huawei", "infro", "instagram", "insta-gram", "ir-sa", "jahez",
  "linkedin", "linked-in", "mada", "mcdonalds", "messenger", "meta", "microsoft", "mobily", "neom",
  "netflix", "nike", "noon", "openai", "paypal", "pepsi", "pinterest", "reddit", "riyadbank", "sabic",
  "sadad", "samsung", "saudia", "shopify", "snapchat", "snap-chat", "snb", "spotify", "starbucks",
  "telegram", "tesla", "threads", "tiktok", "tik-tok", "twitch", "twitter", "uber", "visa", "whatsapp",
  "whats-app", "youtube", "you-tube", "zain",
]);
const DISTINCTIVE_PROTECTED_SLUG_TOKENS = [
  "absher", "adidas", "airbnb", "alahli", "alibaba", "aliexpress", "alrajhi", "amazon", "aramco", "chatgpt",
  "coca-cola", "discord", "dropbox", "ebay", "facebook", "face-book", "flynas", "github", "gmail", "google",
  "hungerstation", "huawei", "infro", "instagram", "insta-gram", "ir-sa", "jahez", "linkedin", "linked-in",
  "mcdonalds", "messenger", "microsoft", "mobily", "neom", "netflix", "nike", "openai", "paypal", "pepsi",
  "pinterest", "reddit", "riyadbank", "sabic", "sadad", "samsung", "saudia", "shopify", "snapchat",
  "snap-chat", "snb", "spotify", "starbucks", "stc", "telegram", "tesla", "tiktok", "tik-tok", "twitch",
  "twitter", "uber", "whatsapp", "whats-app", "youtube", "you-tube", "zain",
] as const;
export const MAX_PUBLIC_SLUG_LENGTH = 60;

export function normalizePublicSlug(value: string) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export function isSystemReservedPublicSlug(value: string) {
  const normalized = normalizePublicSlug(value);
  if (!normalized) return true;
  if (normalized.length < 4 || normalized.length > MAX_PUBLIC_SLUG_LENGTH) return true;
  if (RESERVED_PUBLIC_SLUGS.has(normalized)) return true;
  if (normalized.startsWith("_")) return true;
  return normalized.startsWith("api-") || normalized.startsWith("auth-") || normalized.startsWith("dashboard-") || normalized.startsWith("login-") || normalized.startsWith("signup-") || normalized.startsWith("settings-");
}

export function isProtectedPublicSlug(value: string) {
  const normalized = normalizePublicSlug(value);
  if (PROTECTED_PUBLIC_SLUGS.has(normalized)) return true;
  const bounded = `-${normalized}-`;
  return DISTINCTIVE_PROTECTED_SLUG_TOKENS.some((mark) => bounded.includes(`-${mark}-`));
}

/** Customer-facing reservation policy. Protected names require admin assignment. */
export function isReservedPublicSlug(value: string) {
  return isSystemReservedPublicSlug(value) || isProtectedPublicSlug(value);
}

/** Syntax and application-route policy used when resolving an admin-approved URL. */
export function isRoutablePublicSlug(value: string) {
  const normalized = normalizePublicSlug(value);
  if (!normalized || normalized.length < 4 || normalized.length > MAX_PUBLIC_SLUG_LENGTH) return false;
  if (!/^[a-z0-9-]+$/.test(normalized)) return false;
  if (normalized.startsWith("-") || normalized.endsWith("-")) return false;
  return !isSystemReservedPublicSlug(normalized);
}

export function isValidPublicSlug(value: string) {
  const normalized = normalizePublicSlug(value);
  return isRoutablePublicSlug(normalized) && !isProtectedPublicSlug(normalized);
}

export function getCanonicalPublicBaseUrl() { return "https://ir.sa"; }
export function getPublicBusinessUrl(slug: string) { return `${getCanonicalPublicBaseUrl()}/${normalizePublicSlug(slug)}`; }

function isProductionRuntime() {
  const appEnv = String(process.env.APP_ENV ?? "").trim().toLowerCase();
  const vercelEnv = String(process.env.VERCEL_ENV ?? "").trim().toLowerCase();
  return appEnv === "production" || vercelEnv === "production";
}

function safePreviewOrigin(rawHost: string, rawProto: string | null) {
  const host = rawHost.trim().toLowerCase();
  if (!host || /[\s\\/@]/.test(host)) return null;
  const hostname = host.startsWith("[") ? host.slice(0, host.indexOf("]") + 1) : host.split(":")[0];
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  const isVercelPreview = hostname.endsWith(".vercel.app");
  const isCodespace = hostname.endsWith(".app.github.dev");
  if (!isLocal && !isVercelPreview && !isCodespace) return null;
  const protocol = isLocal && rawProto === "http" ? "http" : "https";
  return `${protocol}://${host}`;
}

export function resolvePublicBusinessUrl(
  slug: string,
  rawHost: string,
  rawProto: string | null,
  productionRuntime = isProductionRuntime(),
) {
  const normalized = normalizePublicSlug(slug);
  if (productionRuntime) return `${getCanonicalPublicBaseUrl()}/${normalized}`;
  const previewOrigin = safePreviewOrigin(rawHost, rawProto);
  return `${previewOrigin ?? getCanonicalPublicBaseUrl()}/${normalized}`;
}

export async function getPublicBusinessUrlFromRequest(slug: string) {
  if (isProductionRuntime()) return getPublicBusinessUrl(slug);

  const requestHeaders = await headers();
  const rawHost = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "";
  const rawProto = requestHeaders.get("x-forwarded-proto")?.toLowerCase() ?? null;
  return resolvePublicBusinessUrl(slug, rawHost, rawProto, false);
}

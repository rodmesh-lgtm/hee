import { createHmac, timingSafeEqual } from "node:crypto";

const SHOP_DOMAIN = /^[a-z0-9][a-z0-9-]{0,61}\.myshopify\.com$/;

export function normalizeShopifyDomain(value: string) {
  const domain = value.trim().toLowerCase();
  if (!SHOP_DOMAIN.test(domain) || domain.length > 255) throw new Error("SHOPIFY_SHOP_INVALID");
  return domain;
}

function constantTimeHexEqual(expected: string, received: string) {
  if (!/^[0-9a-f]{64}$/i.test(received)) return false;
  const left = Buffer.from(expected, "hex");
  const right = Buffer.from(received, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

export function verifyShopifyOAuthHmac(searchParams: URLSearchParams, clientSecret: string) {
  const signatures = searchParams.getAll("hmac");
  if (signatures.length !== 1) return false;
  const received = signatures[0];
  const entries = Array.from(searchParams.entries())
    .filter(([key]) => key !== "hmac" && key !== "signature")
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue));
  const message = entries.map(([key, value]) => `${key}=${value}`).join("&");
  const expected = createHmac("sha256", clientSecret).update(message, "utf8").digest("hex");
  return constantTimeHexEqual(expected, received);
}

export function verifyShopifyWebhookHmac(rawBody: string, received: string | null, clientSecret: string) {
  if (!received || received.length > 256) return false;
  let right: Buffer;
  try { right = Buffer.from(received, "base64"); } catch { return false; }
  const left = createHmac("sha256", clientSecret).update(rawBody, "utf8").digest();
  return right.length === left.length && timingSafeEqual(left, right);
}

export function shopifyGrantedScopes(value: string) {
  return new Set(value.split(",").map((scope) => scope.trim()).filter(Boolean));
}

export function hasRequiredShopifyScopes(value: string, required: readonly string[]) {
  const granted = shopifyGrantedScopes(value);
  return required.every((scope) => granted.has(scope));
}

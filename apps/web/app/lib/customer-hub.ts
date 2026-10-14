import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export const HUB_ORIGIN = "https://hub.ir.sa";
export const MAIN_ORIGIN = "https://ir.sa";
export const HUB_NONCE_COOKIE = "__Host-infro_hub_nonce";
export const HUB_RETURN_COOKIE = "__Host-infro_hub_return";
export const HUB_PROVIDER = "customer-hub-session";
export const hubCookieOptions = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/", maxAge: 600 };
export function hubDigest(value: string) { return createHash("sha256").update(value).digest("hex"); }
export function validHubChallenge(value: string) { return /^[a-f0-9]{64}$/.test(value); }
export function safeHubPath(value: string | null | undefined) {
  if (!value || value.includes("\\") || /[\r\n]/.test(value)) return "/";
  let url: URL;
  try { url = new URL(value, HUB_ORIGIN); } catch { return "/"; }
  if (url.origin !== HUB_ORIGIN) return "/";
  if (url.pathname === "/dashboard" || url.pathname === "/dashboard/") return `/${url.search}${url.hash}`;
  return url.pathname === "/" || url.pathname.startsWith("/dashboard/") ? `${url.pathname}${url.search}${url.hash}` : "/";
}
// The short-lived database envelope never stores a usable session token or its
// encryption key. Only the initiating hub browser can derive that key from its
// HttpOnly random nonce; the authorization URL carries its digest, not the nonce.
export function sealHubSession(token: string, challenge: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(challenge, "hex"), iv);
  cipher.setAAD(Buffer.from(HUB_PROVIDER));
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}
export function openHubSession(envelope: string, challenge: string) {
  const data = Buffer.from(envelope, "base64url");
  const decipher = createDecipheriv("aes-256-gcm", Buffer.from(challenge, "hex"), data.subarray(0, 12));
  decipher.setAAD(Buffer.from(HUB_PROVIDER));
  decipher.setAuthTag(data.subarray(12, 28));
  return Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString("utf8");
}

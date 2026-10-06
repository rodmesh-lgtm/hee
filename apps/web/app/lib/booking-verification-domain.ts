import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

export const BOOKING_VERIFICATION_TEMPLATE = "infro_booking_verification";
export const BOOKING_CODE_TTL_MS = 5 * 60_000;
export const BOOKING_ACCESS_TTL_MS = 10 * 60_000;
export const BOOKING_CODE_MAX_ATTEMPTS = 5;
export function asciiDigits(value: string) {
  return value.replace(/[٠-٩۰-۹]/g, digit => String(digit.charCodeAt(0) - (digit >= "۰" ? 0x6f0 : 0x660)));
}
export function bookingVerificationCode(value: unknown) {
  const normalized = typeof value === "string" ? asciiDigits(value.trim()) : "";
  return /^\d{6}$/.test(normalized) ? normalized : null;
}
export const newBookingVerificationCode = () => String(randomInt(0, 1_000_000)).padStart(6, "0");
export const newBookingAccessToken = () => randomBytes(32).toString("base64url");
export function bookingCredentialDigest(kind: "code" | "access", challengeId: string, value: string, secret: string) {
  if (secret.length < 24) throw new Error("BOOKING_VERIFICATION_SECRET_REQUIRED");
  return createHmac("sha256", secret).update(`ir:booking:${kind}:${challengeId}:${value}`).digest("hex");
}
export function bookingDigestsEqual(expected: string, actual: string) {
  if (!/^[0-9a-f]{64}$/.test(expected) || !/^[0-9a-f]{64}$/.test(actual)) return false;
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(actual, "hex"));
}
export function bookingAccessCredential(value: unknown) {
  if (typeof value !== "string") return null;
  const match = /^([0-9a-f-]{36})\.([A-Za-z0-9_-]{43})$/i.exec(value);
  return match ? { challengeId: match[1], token: match[2] } : null;
}
export function authenticationCopyCodeTemplate(components: unknown) {
  if (!Array.isArray(components)) return false;
  const buttons = components.flatMap(component => component && typeof component === "object" && String(component.type ?? "").toUpperCase() === "BUTTONS" && Array.isArray(component.buttons) ? component.buttons : []);
  if (buttons.length !== 1) return false;
  const button = buttons[0];
  if (!button || typeof button !== "object") return false;
  if (String(button.type ?? "").toUpperCase() === "OTP") return String(button.otp_type ?? "").toUpperCase() === "COPY_CODE";
  // Meta represents an approved COPY_CODE button as a WhatsApp OTP URL. Do not
  // treat arbitrary marketing URLs or one-tap/zero-tap templates as copy-code OTP.
  if (String(button.type ?? "").toUpperCase() !== "URL" || typeof button.url !== "string") return false;
  try { const url = new URL(button.url); return url.protocol === "https:" && url.hostname === "www.whatsapp.com" && url.pathname === "/otp/code/" && url.searchParams.get("otp_type") === "COPY_CODE"; } catch { return false; }
}
export function bookingAuthenticationParameters(code: string) {
  if (!bookingVerificationCode(code)) throw new Error("BOOKING_VERIFICATION_CODE_INVALID");
  return [{ type: "body", parameters: [{ type: "text", text: code }] }, { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: code }] }];
}

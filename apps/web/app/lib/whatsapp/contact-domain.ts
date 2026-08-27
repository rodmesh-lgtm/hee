export type ContactConsentState = {
  businessId: string;
  phoneE164: string;
  consentedAt: Date;
  revokedAt: Date | null;
};

export type MarketingContactState = {
  businessId: string;
  phoneE164: string;
  optedOutAt: Date | null;
};

const E164 = /^\+[1-9]\d{7,14}$/;
const CALLING_CODE = /^[1-9]\d{0,2}$/;
const ALLOWED_PHONE_INPUT = /^[+\d\s().-]+$/;

export function normalizeE164(
  value: unknown,
  defaultCountryCallingCode?: string,
): string | null {
  if (typeof value !== "string") return null;
  const input = value.trim();
  if (!input || !ALLOWED_PHONE_INPUT.test(input)) return null;

  const compact = input.replace(/[\s().-]/g, "");
  const international = compact.startsWith("00") ? `+${compact.slice(2)}` : compact;
  if (international.startsWith("+")) return E164.test(international) ? international : null;

  if (!defaultCountryCallingCode || !CALLING_CODE.test(defaultCountryCallingCode)) return null;
  const national = international.replace(/^0+/, "");
  if (!national) return null;
  const normalized = `+${defaultCountryCallingCode}${national}`;
  return E164.test(normalized) ? normalized : null;
}

export function normalizeContactLabel(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
  return normalized.length >= 1 && normalized.length <= 80 ? normalized : null;
}

export function isWhatsAppMarketingEligible(
  contact: MarketingContactState,
  consent: ContactConsentState | null,
  now = new Date(),
): boolean {
  if (contact.optedOutAt) return false;
  if (!consent) return false;
  if (consent.businessId !== contact.businessId) return false;
  if (consent.phoneE164 !== contact.phoneE164) return false;
  if (consent.revokedAt) return false;
  return consent.consentedAt.getTime() <= now.getTime();
}

import "server-only";

import { z } from "zod";

export const whatsappConnectionStatuses = [
  "pending",
  "connected",
  "disabled",
  "revoked",
  "error",
] as const;
export type WhatsAppConnectionStatus = (typeof whatsappConnectionStatuses)[number];

export const whatsappConsentSources = [
  "web_form",
  "checkout",
  "booking",
  "manual_import",
  "api",
] as const;
export type WhatsAppConsentSource = (typeof whatsappConsentSources)[number];

export const whatsappConsentSchema = z.object({
  businessId: z.string().uuid(),
  customerId: z.string().uuid().optional(),
  phoneE164: z.string().regex(/^\+[1-9]\d{7,14}$/),
  source: z.enum(whatsappConsentSources),
  consentedAt: z.coerce.date(),
  evidence: z.string().trim().min(1).max(2048),
});

export type WhatsAppConsentInput = z.infer<typeof whatsappConsentSchema>;

export type WhatsAppTenantScoped = { businessId: string };

export function assertWhatsAppTenantScope(activeBusinessId: string, record: WhatsAppTenantScoped) {
  if (!activeBusinessId || record.businessId !== activeBusinessId) {
    throw new Error("WHATSAPP_TENANT_SCOPE_VIOLATION");
  }
}

/**
 * Marketing eligibility is deliberately stricter than customer existence. Orders,
 * bookings and saved phone numbers never imply consent. The caller must supply an
 * explicit, unrevoked consent proof belonging to the same tenant and destination.
 */
export function isWhatsAppMarketingEligible(input: {
  businessId: string;
  phoneE164: string;
  consent: {
    businessId: string;
    phoneE164: string;
    consentedAt: Date;
    revokedAt: Date | null;
  } | null;
}) {
  const { consent } = input;
  if (!consent || consent.revokedAt) return false;
  return (
    consent.businessId === input.businessId &&
    consent.phoneE164 === input.phoneE164 &&
    Number.isFinite(consent.consentedAt.getTime())
  );
}

export function whatsappProviderIdentifiersAreNotAuthorization(input: {
  activeBusinessId: string;
  resolvedBusinessId: string | null;
}) {
  return Boolean(input.resolvedBusinessId && input.resolvedBusinessId === input.activeBusinessId);
}

export const WHATSAPP_FIRST_CAMPAIGN_CANARY_LIMIT = 5;

export type WhatsAppCampaignCanaryDecision =
  | { state: "verified"; queueLimit: null }
  | { state: "awaiting_delivery"; queueLimit: 0 }
  | { state: "canary"; queueLimit: number };

export function decideWhatsAppCampaignCanary(input: {
  hasVerifiedDelivery: boolean;
  priorAttemptCount: number;
}): WhatsAppCampaignCanaryDecision {
  if (input.hasVerifiedDelivery) return { state: "verified", queueLimit: null };
  const priorAttemptCount = Number.isSafeInteger(input.priorAttemptCount) && input.priorAttemptCount > 0
    ? input.priorAttemptCount
    : 0;
  const remainingSlots = Math.max(0, WHATSAPP_FIRST_CAMPAIGN_CANARY_LIMIT - priorAttemptCount);
  if (remainingSlots === 0) return { state: "awaiting_delivery", queueLimit: 0 };
  return { state: "canary", queueLimit: remainingSlots };
}

export const WHATSAPP_FIRST_CAMPAIGN_CANARY_LIMIT = 5;

export type WhatsAppCampaignCanaryDecision =
  | { state: "verified"; queueLimit: null }
  | { state: "awaiting_delivery"; queueLimit: 0 }
  | { state: "canary"; queueLimit: number };

export function decideWhatsAppCampaignCanary(input: {
  hasVerifiedDelivery: boolean;
  hasPriorCurrentAttempt: boolean;
}): WhatsAppCampaignCanaryDecision {
  if (input.hasVerifiedDelivery) return { state: "verified", queueLimit: null };
  if (input.hasPriorCurrentAttempt) return { state: "awaiting_delivery", queueLimit: 0 };
  return { state: "canary", queueLimit: WHATSAPP_FIRST_CAMPAIGN_CANARY_LIMIT };
}

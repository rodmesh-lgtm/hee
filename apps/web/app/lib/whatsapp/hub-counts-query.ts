import { Prisma } from "@prisma/client";
export type WhatsAppHubCounts = {contacts:number;templates:number;campaigns:number;automations:number;conversations:number;integrations:number;eligibleAudience:number};

/** Seven tenant counters share one pool checkout rather than seven parallel leases. */
export function whatsappHubCountsQuery(businessId:string) {
 return Prisma.sql`SELECT
  (SELECT COUNT(*)::int FROM "WhatsAppContact" WHERE "businessId"=${businessId} AND "deletedAt" IS NULL) AS contacts,
  (SELECT COUNT(*)::int FROM "WhatsAppTemplate" t JOIN "WhatsAppConnection" c ON c.id=t."connectionId" AND c."businessId"=t."businessId"
    WHERE t."businessId"=${businessId} AND t.provider='meta' AND t.status='approved' AND c."marketingEnabled"=true) AS templates,
  (SELECT COUNT(*)::int FROM "WhatsAppCampaign" WHERE "businessId"=${businessId}) AS campaigns,
  (SELECT COUNT(*)::int FROM "WhatsAppAutomation" WHERE "businessId"=${businessId} AND "triggerType"<>'booking_confirmation') AS automations,
  (SELECT COUNT(*)::int FROM "WhatsAppConversation" WHERE "businessId"=${businessId}) AS conversations,
  (SELECT COUNT(*)::int FROM "WhatsAppCommerceIntegration" WHERE "businessId"=${businessId}) AS integrations,
  (SELECT COUNT(*)::int FROM "WhatsAppContact" contact INNER JOIN "WhatsAppConsent" consent
    ON consent."businessId" = contact."businessId" AND consent."phoneE164" = contact."phoneE164"
    WHERE contact."businessId" = ${businessId} AND contact."deletedAt" IS NULL AND contact."optedOutAt" IS NULL
      AND consent."revokedAt" IS NULL AND consent."source" <> 'booking' AND consent."consentedAt" <= CURRENT_TIMESTAMP) AS "eligibleAudience"`;
}

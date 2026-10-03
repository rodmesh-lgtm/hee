import "server-only";
import type { Prisma } from "@prisma/client";
import { parseManualAudience, summarizeManualAudience } from "./manual-audience";

export async function resolveManualAudience(database: Pick<Prisma.TransactionClient, "whatsAppContact" | "whatsAppConsent">, businessId: string, value: unknown, now: Date) {
  const parsed = parseManualAudience(value);
  const [contacts, consents] = await Promise.all([
    database.whatsAppContact.findMany({ where: { businessId, deletedAt: null, phoneE164: { in: parsed.phones } }, select: { id: true, phoneE164: true, optedOutAt: true } }),
    database.whatsAppConsent.findMany({ where: { businessId, phoneE164: { in: parsed.phones }, source: { not: "booking" }, revokedAt: null, consentedAt: { lte: now } }, select: { phoneE164: true } }),
  ]);
  return summarizeManualAudience(parsed, contacts, new Set(consents.map(item => item.phoneE164)));
}

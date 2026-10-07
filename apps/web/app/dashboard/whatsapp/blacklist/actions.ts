"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "../../../lib/db";
import { getWhatsAppWriteContext } from "../../../lib/whatsapp/rbac";
import { hasActiveWhatsAppMarketingEntitlement } from "../../../lib/whatsapp/feature-entitlement";
import { normalizeE164 } from "../../../lib/whatsapp/contact-domain";
import { consumePublicWriteLimit } from "../../../lib/rate-limit";
import { writeWhatsAppAuditLog } from "../../../lib/whatsapp/audit";
export async function blockWhatsAppContactAction(form: FormData) {
  const context = await getWhatsAppWriteContext("campaign.manage");
  if (!context || !await hasActiveWhatsAppMarketingEntitlement({ businessId: context.businessId })) redirect("/dashboard/whatsapp?access=denied");
  const phone = normalizeE164(String(form.get("phone") ?? "").replace(/[٠-٩]/g, digit => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))), "966");
  if (!phone || form.get("confirm") !== "on") redirect("/dashboard/whatsapp/blacklist?result=invalid");
  const rate = await consumePublicWriteLimit({ scope: "whatsapp-contact-block", businessId: context.businessId, identity: context.userId, limit: 30, windowSeconds: 3600 });
  if (!rate.allowed) redirect("/dashboard/whatsapp/blacklist?result=limited");
  await db.$transaction(async tx => {
    const [clock] = await tx.$queryRaw<Array<{ now: Date }>>`SELECT CURRENT_TIMESTAMP AS "now"`;
    if (!clock) throw new Error("CONTACT_BLOCK_CLOCK_UNAVAILABLE");
    const contact = await tx.whatsAppContact.upsert({ where: { businessId_phoneE164: { businessId: context.businessId, phoneE164: phone } },
      create: { businessId: context.businessId, phoneE164: phone, source: "manual", optedOutAt: clock.now }, update: { optedOutAt: clock.now }, select: { id: true } });
    await tx.whatsAppConsent.updateMany({ where: { businessId: context.businessId, phoneE164: phone, revokedAt: null }, data: { revokedAt: clock.now } });
    await writeWhatsAppAuditLog({ database: tx, businessId: context.businessId, actorUserId: context.userId, action: "contact.blocked", targetType: "contact", targetId: contact.id, outcome: "success" });
  });
  for (const path of ["/dashboard/whatsapp/blacklist", "/dashboard/whatsapp/contacts", "/dashboard/whatsapp/campaigns"]) revalidatePath(path);
  redirect("/dashboard/whatsapp/blacklist?result=blocked");
}

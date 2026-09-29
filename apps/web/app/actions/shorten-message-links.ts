"use server";
import { randomBytes } from "node:crypto";
import { db } from "../lib/db";
import { getWhatsAppWriteContext } from "../lib/whatsapp/rbac";
import { hasActiveWhatsAppMarketingEntitlement } from "../lib/whatsapp/feature-entitlement";
import { consumePublicWriteLimit } from "../lib/rate-limit";
import { writeWhatsAppAuditLog } from "../lib/whatsapp/audit";
import { longLinksInText, shortLinkDestination, shortLinkUrl } from "../lib/short-link-domain";

export async function shortenMessageLinks(text: string): Promise<{ text?: string; error?: string }> {
  if (typeof text !== "string" || text.length > 1024) return { error: "النص أطول من الحد المسموح لهذا الحقل." };
  const actor = await getWhatsAppWriteContext("campaign.manage");
  if (!actor || !await hasActiveWhatsAppMarketingEntitlement({ businessId: actor.businessId })) return { error: "اختصار الروابط يتطلب صلاحية إدارة الحملات واشتراكًا فعالًا." };
  const links = longLinksInText(text);
  if (!links.length) return { text };
  const rate = await consumePublicWriteLimit({ scope: "message-short-links", businessId: actor.businessId, identity: actor.userId, limit: 30, windowSeconds: 60 });
  if (!rate.allowed) return { error: "يرجى الانتظار قليلًا ثم إعادة المحاولة." };
  try {
    const replacements = await db.$transaction(async tx => {
      const result: { original: string; short: string }[] = [];
      for (const original of links) {
        const destination = shortLinkDestination(original)!;
        let link = await tx.businessShortLink.findFirst({ where: { businessId: actor.businessId, destination, status: "active" }, orderBy: { createdAt: "asc" } });
        if (!link) {
          link = await tx.businessShortLink.create({ data: { businessId: actor.businessId, destination, title: `رابط رسالة · ${new URL(destination).hostname}`.slice(0, 100), code: randomBytes(9).toString("base64url") } });
          await writeWhatsAppAuditLog({ businessId: actor.businessId, actorUserId: actor.userId, action: "short_link.create", targetType: "short_link", targetId: link.id, outcome: "success", database: tx });
        }
        result.push({ original, short: shortLinkUrl(link.code) });
      }
      return result;
    });
    // Longest first avoids replacing a URL that is a prefix of another URL.
    for (const replacement of replacements.sort((a, b) => b.original.length - a.original.length)) text = text.split(replacement.original).join(replacement.short);
    return { text };
  } catch { return { error: "تعذر اختصار الرابط. بقي النص الأصلي محفوظًا؛ أعد المحاولة." }; }
}

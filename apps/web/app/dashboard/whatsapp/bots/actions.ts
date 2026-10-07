"use server";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "../../../lib/db";
import { getWhatsAppWriteContext } from "../../../lib/whatsapp/rbac";
import { hasActiveWhatsAppMarketingEntitlement } from "../../../lib/whatsapp/feature-entitlement";
import { consumePublicWriteLimit } from "../../../lib/rate-limit";
import { parseBotConfig, botOptOut } from "../../../lib/whatsapp/bot-domain";
import { answerBotQuestion, botAiReady } from "../../../lib/whatsapp/bot-ai";
import { botSchemaReady, saveServiceBot } from "../../../lib/whatsapp/bot-store";
import { writeWhatsAppAuditLog } from "../../../lib/whatsapp/audit";

async function context() {
  const value = await getWhatsAppWriteContext("automation.manage");
  if (!value || !await hasActiveWhatsAppMarketingEntitlement({ businessId: value.businessId })) throw new Error("ACCESS_DENIED");
  return value;
}
export async function saveBotAction(raw: unknown, connectionId: string, enabled: boolean, acknowledged: boolean) {
  try {
    const actor = await context(), config = parseBotConfig(raw);
    if (typeof connectionId !== "string" || connectionId.length > 128 || typeof enabled !== "boolean" || (enabled && acknowledged !== true)) return { error: "أكّد تشغيل الردود التلقائية أولًا." };
    if (!await botSchemaReady()) return { error: "إعداد تخزين البوت غير مكتمل بعد." };
    if (enabled && config.mode === "ai" && !botAiReady()) return { error: "مزود الذكاء الاصطناعي غير مهيأ بعد. يمكنك حفظ الإعدادات والبوت متوقف." };
    if (!(await consumePublicWriteLimit({ scope: "whatsapp-bot-save", businessId: actor.businessId, identity: actor.userId, limit: 30, windowSeconds: 3600 })).allowed) return { error: "محاولات كثيرة. حاول لاحقًا." };
    await saveServiceBot({ businessId: actor.businessId, userId: actor.userId, connectionId, config, enabled });
    revalidatePath("/dashboard/whatsapp/bots");
    return { success: enabled ? "حُفظ البوت وشُغّل للرسائل الجديدة فقط." : "حُفظ البوت وهو متوقف." };
  } catch { return { error: "تعذر الحفظ. راجع صلاحياتك والحقول والاتصال. أضف سؤالًا وجوابًا للوضع الثابت، أو معرفة لا تقل عن 30 حرفًا لوضع الذكاء الاصطناعي." }; }
}
export async function previewBotAction(raw: unknown, question: string) {
  try {
    const actor = await context(), config = parseBotConfig(raw);
    if (typeof question !== "string" || !question.trim() || question.length > 2000) return { error: "أدخل سؤالًا تجريبيًا حتى 2000 حرف." };
    if (!(await consumePublicWriteLimit({ scope: "whatsapp-bot-preview", businessId: actor.businessId, identity: "tenant", limit: 20, windowSeconds: 86400 })).allowed) return { error: "اكتمل حد التجارب اليومي للمنشأة (20 تجربة)." };
    if (botOptOut(question)) return { reply: "لن يرسل البوت ردًا إلى طلب إيقاف الرسائل.", handoff: false };
    return await answerBotQuestion(config, question);
  } catch { return { error: "تعذرت التجربة. راجع المعرفة والأسئلة وإعداد مزود الذكاء الاصطناعي." }; }
}
export async function resumeBotConversationAction(form: FormData) {
  const actor = await context(), conversationId = String(form.get("conversationId") ?? "");
  if (conversationId.length > 128 || !await botSchemaReady()) return;
  await db.$transaction(async tx => {
    await tx.$executeRaw(Prisma.sql`UPDATE "WhatsAppBotHandoff" SET active=false,"createdAt"=CURRENT_TIMESTAMP WHERE "conversationId"=${conversationId} AND "businessId"=${actor.businessId}`);
    await writeWhatsAppAuditLog({ database: tx, businessId: actor.businessId, actorUserId: actor.userId, action: "bot.conversation_resumed", targetType: "conversation", targetId: conversationId, outcome: "success" });
  });
  revalidatePath("/dashboard/whatsapp/bots");
}

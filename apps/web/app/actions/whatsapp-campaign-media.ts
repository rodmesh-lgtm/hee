"use server";
import { getWhatsAppWriteContext } from "../lib/whatsapp/rbac";
import { hasActiveWhatsAppMarketingEntitlement } from "../lib/whatsapp/feature-entitlement";
import { getPersistentStorageAdapter } from "../lib/storage";
import { consumePublicWriteLimit } from "../lib/rate-limit";
import { writeWhatsAppAuditLog } from "../lib/whatsapp/audit";

export async function uploadCampaignMediaAction(form: FormData): Promise<{ url?: string; error?: string }> {
  const context = await getWhatsAppWriteContext("campaign.manage");
  if (!context || !await hasActiveWhatsAppMarketingEntitlement({ businessId: context.businessId })) return { error: "يلزم اشتراك فعال وصلاحية إدارة الحملات." };
  const file = form.get("file");
  if (!(file instanceof File) || !file.size || file.size > 3 * 1024 * 1024) return { error: "الحد المباشر للرفع 3 MB. استخدم رابط HTTPS مباشرًا للملفات الأكبر." };
  const rate = await consumePublicWriteLimit({ scope: "whatsapp-campaign-media", businessId: context.businessId, identity: context.userId, limit: 20, windowSeconds: 3600 });
  if (!rate.allowed) return { error: "وصلت إلى حد الرفع. حاول لاحقًا." };
  try {
    const uploaded = await getPersistentStorageAdapter().upload({ file, folder: `campaign-media/${context.businessId}` });
    const expected = String(form.get("kind"));
    if (!(expected === "image" ? uploaded.mimeType.startsWith("image/") : expected === "video" ? uploaded.mimeType === "video/mp4" : expected === "document" && uploaded.mimeType === "application/pdf")) return { error: "نوع الملف لا يطابق رأس القالب." };
    await writeWhatsAppAuditLog({ businessId: context.businessId, actorUserId: context.userId, action: "campaign.media.upload", targetType: "stored_object", targetId: uploaded.storageKey, outcome: "success", metadata: { bytes: uploaded.size, mimeType: uploaded.mimeType } });
    return { url: `https://ir.sa/api/whatsapp/campaign-media/${uploaded.storageKey}` };
  } catch { return { error: "تعذر رفع الملف. تحقق من نوع الملف وحجمه ثم حاول مجددًا." }; }
}

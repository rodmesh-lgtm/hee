"use server";
import { revalidatePath } from "next/cache";
import { getCurrentUserForWrites } from "../lib/auth";
import { getActiveBusinessForUser } from "../lib/active-business";
import { getWhatsAppWriteContext } from "../lib/whatsapp/rbac";
import { consumePublicWriteLimit } from "../lib/rate-limit";
import { liveGatewayConfig } from "../lib/live-view/gateway";
import { sendLiveViewWhatsApp } from "../lib/live-view/whatsapp";

export type LiveWhatsAppState = { error?: string; success?: string };
export async function sendLiveViewWhatsAppAction(_: LiveWhatsAppState, form: FormData): Promise<LiveWhatsAppState> {
  const user = await getCurrentUserForWrites();
  const business = await getActiveBusinessForUser(user.id, "liveView");
  const context = await getWhatsAppWriteContext("reply");
  if (!business || !user.emailVerifiedAt || context?.businessId !== business.id || !liveGatewayConfig()) return { error: "يلزم تفعيل الخدمة وصلاحية المشاهدة وإرسال واتساب لهذه المنشأة." };
  const limit = await consumePublicWriteLimit({ businessId: business.id, identity: user.id, scope: "live-view-whatsapp", limit: 5, windowSeconds: 60 });
  if (!limit.allowed) return { error: "محاولات إرسال كثيرة. انتظر دقيقة ثم أعد المحاولة." };
  try {
    const result = await sendLiveViewWhatsApp({ businessId: business.id, actorUserId: user.id, sessionId: String(form.get("sessionId") ?? ""), watchPath: String(form.get("watchPath") ?? ""), phone: String(form.get("phone") ?? ""), consent: form.get("whatsappConsent") === "on" });
    revalidatePath("/dashboard/live-view");
    revalidatePath("/dashboard/whatsapp/messages");
    if (result.status === "accepted") return { success: "قبل واتساب الرسالة من رقم منشأتك. تابع الوصول والقراءة في سجل رسائل واتساب؛ قبول الإرسال لا يعني وصولها بعد." };
    if (result.status === "already_accepted") return { success: "سبق قبول إرسال هذا الرابط. لم نكرر الرسالة؛ راجع سجل رسائل واتساب." };
    return { error: result.status === "unknown" ? "نتيجة الإرسال غير مؤكدة أو ما زالت قيد التنفيذ. لم نكرر الرسالة لتجنب وصول نسختين. تحقق من سجل واتساب قبل إصدار رابط بديل." : "رفض واتساب الإرسال. تحقق من حالة القالب ورقم المستلم وإعدادات حساب واتساب، ثم أعد المحاولة." };
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const messages: Record<string, string> = {
      LIVE_PHONE_CONSENT_REQUIRED: "أدخل رقم واتساب صحيحًا وأكد موافقة العميل على استلام رابط المشاهدة.",
      LIVE_LINK_INVALID: "رابط المشاهدة غير صالح.",
      LIVE_SESSION_UNAVAILABLE: "الجلسة منتهية أو الرابط استُبدل أو الكاميرا غير متاحة. لم يتم الإرسال.",
      LIVE_RECIPIENT_OPTED_OUT: "هذا العميل أوقف استقبال الرسائل أو حُذف من جهات الاتصال. لم يتم الإرسال.",
      LIVE_WHATSAPP_TEMPLATE_REQUIRED: "اربط رقم واتساب المنشأة واعتمد قالب «رابط المشاهدة المؤقتة» من قسم قوالب واتساب أولًا.",
      LIVE_WHATSAPP_ENTITLEMENT_REQUIRED: "إرسال واتساب غير مفعّل في اشتراك المنشأة.",
      LIVE_WHATSAPP_RATE_LIMITED: "وصل رقم المنشأة إلى حد الإرسال لهذه الدقيقة. أعد المحاولة لاحقًا.",
      WHATSAPP_OUTBOUND_DISABLED: "إرسال واتساب متوقف حاليًا من إدارة المنصة.",
    };
    return { error: messages[code] ?? "تعذر تأكيد الإرسال. تحقق من سجل رسائل واتساب قبل إعادة المحاولة؛ رابط المشاهدة لم يتغير." };
  }
}

export type CommerceIntegrationHealthInput = {
  status: string;
  connectedAt?: Date | null;
  lastWebhookAt?: Date | null;
  lastErrorCode?: string | null;
};

export type CommerceIntegrationHealth = {
  state: "healthy" | "syncing" | "delayed" | "action_required" | "inactive";
  label: string;
  detail: string;
  tone: "emerald" | "sky" | "amber" | "rose" | "slate";
};

const HOUR = 60 * 60 * 1_000;

export function commerceIntegrationHealth(
  integration: CommerceIntegrationHealthInput | null,
  now = new Date(),
): CommerceIntegrationHealth {
  if (!integration || integration.status !== "active") {
    return { state: "inactive", label: "غير مربوط", detail: "لا تُستخدم بيانات هذا المزود للتحقق من الحجز.", tone: "slate" };
  }
  if (integration.lastErrorCode) {
    return { state: "action_required", label: "يحتاج تدخلاً", detail: "تعذرت آخر مزامنة. أعد المحاولة أو جدّد صلاحية الربط.", tone: "rose" };
  }
  if (!integration.lastWebhookAt) {
    const connectedFor = now.getTime() - (integration.connectedAt?.getTime() ?? now.getTime());
    if (connectedFor <= HOUR) {
      return { state: "syncing", label: "تجهيز المزامنة", detail: "تم الربط ويجري انتظار أول مزامنة موثوقة للطلبات.", tone: "sky" };
    }
    return { state: "delayed", label: "لم تبدأ المزامنة", detail: "مرّ وقت طويل دون أول تحديث؛ شغّل التحديث الآن.", tone: "amber" };
  }
  const age = now.getTime() - integration.lastWebhookAt.getTime();
  if (age > 12 * HOUR) {
    return { state: "delayed", label: "المزامنة متأخرة", detail: "آخر تحديث أقدم من 12 ساعة؛ سيحاول INFRO تلقائيًا ويمكنك التحديث الآن.", tone: "amber" };
  }
  return { state: "healthy", label: "سليم", detail: "الربط نشط وآخر مزامنة ضمن المدة الآمنة.", tone: "emerald" };
}

export function commerceHealthTone(tone: CommerceIntegrationHealth["tone"]) {
  if (tone === "emerald") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (tone === "sky") return "border-sky-200 bg-sky-50 text-sky-800";
  if (tone === "amber") return "border-amber-200 bg-amber-50 text-amber-800";
  if (tone === "rose") return "border-rose-200 bg-rose-50 text-rose-800";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

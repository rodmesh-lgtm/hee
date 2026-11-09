export type SallaSubscriptionFailureReason = "app_not_found" | "subscription_not_found" | "endpoint_not_found" | "permission_denied" | "rate_limited" | "unclassified";

/** Customer guidance uses fixed wording, never provider text or guessed payment state. */
export function sallaSubscriptionFailureMessage(reason: unknown, english: boolean): string | null {
  const messages: Record<string, [string, string]> = {
    app_not_found: ["لم تتمكن سلة من العثور على التطبيق. تواصل مع دعم INFRO لمراجعة إعداد الربط؛ لا تحتاج إلى دفع اشتراك آخر.", "Salla could not find the app. Contact INFRO support to review the connection settings; you do not need to pay for another subscription."],
    subscription_not_found: ["لم تعثر سلة على سجل الاشتراك. تحقق من اشتراك التطبيق داخل سلة، وراجع دعم INFRO إذا كان الدفع مكتملًا.", "Salla could not find a subscription record. Check the app subscription in Salla and contact INFRO support if payment is complete."],
    endpoint_not_found: ["خدمة التحقق من الاشتراك غير متاحة من سلة حاليًا. تواصل مع دعم INFRO؛ إعادة الربط أو الدفع مرة أخرى لا تؤكد حل المشكلة.", "Salla's subscription verification service is currently unavailable. Contact INFRO support; reconnecting or paying again does not confirm a fix."],
    permission_denied: ["رفضت سلة صلاحية فحص الاشتراك. راجع تفويض التطبيق مع مالك المتجر أو دعم INFRO. لم يتغير اشتراكك.", "Salla denied permission to check this subscription. Review app authorization with the store owner or INFRO support. Your subscription has not changed."],
    rate_limited: ["طلبت سلة تقليل محاولات الفحص. انتظر دقيقة ثم أعد المحاولة؛ لم يتغير اشتراكك.", "Salla requested fewer checks. Wait a minute and try again; your subscription has not changed."],
  };
  return typeof reason === "string" && Object.hasOwn(messages, reason) ? messages[reason][english ? 1 : 0] : null;
}

/** Classify provider wording locally. Never return its arbitrary text or metadata. */
export function sallaSubscriptionFailureReason(status: number, payload: unknown): SallaSubscriptionFailureReason {
  if (status === 401 || status === 403) return "permission_denied";
  if (status === 429) return "rate_limited";
  if (status !== 404) return "unclassified";
  const record = (v: unknown) => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
  const root = record(payload), error = record(root.error);
  const messages = [root.message, error.message].filter((v): v is string => typeof v === "string" && v.length <= 2000);
  const message = messages.join(" ").toLowerCase();
  if (/\b(route|endpoint)\b/.test(message) && /not found|could not be found|does not exist/.test(message)) return "endpoint_not_found";
  if (/\bsubscription\b/.test(message) && /not found|does not exist/.test(message)) return "subscription_not_found";
  if (/\b(app|application)\b/.test(message) && /not found|does not exist/.test(message)) return "app_not_found";
  return "unclassified";
}

export const SALLA_SUBSCRIPTION_FAILURE_GUIDANCE: Record<SallaSubscriptionFailureReason, string> = {
  app_not_found: "أفادت استجابة سلة بأن التطبيق غير موجود. راجع معرّف التطبيق وربطه بعميل OAuth مع دعم سلة.",
  subscription_not_found: "أفادت استجابة سلة بعدم العثور على سجل الاشتراك. تحقق من الاشتراك الفعلي؛ أحداث المحاكي وحدها لا تثبت شراءً.",
  endpoint_not_found: "أفادت استجابة سلة بعدم العثور على مسار API. يلزم التحقق من إتاحة مسار اشتراكات التطبيقات مع سلة؛ إعادة ربط المتجر وحدها لا تثبت حل المشكلة.",
  permission_denied: "رفضت سلة التفويض للوصول إلى سجل الاشتراك. راجع صلاحيات التطبيق والتفويض.",
  rate_limited: "طلبت سلة تقليل عدد الطلبات. انتظر قبل إعادة الفحص.",
  unclassified: "لم تتضمن الاستجابة سببًا يمكن عرضه بأمان. لا يمكن استنتاج حالة الدفع منها.",
};

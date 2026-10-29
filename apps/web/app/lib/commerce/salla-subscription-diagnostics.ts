export type SallaSubscriptionFailureReason = "app_not_found" | "subscription_not_found" | "endpoint_not_found" | "permission_denied" | "rate_limited" | "unclassified";

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

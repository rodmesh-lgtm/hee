// Shared with the server: a browser must not expire an otherwise valid session early.
export const EMBEDDED_SIGNUP_TTL_MS = 10 * 60 * 1000;
export type SignupAssets = { wabaId: string; phoneNumberId: string };
const META_MESSAGE_ORIGINS = new Set(["https://www.facebook.com", "https://business.facebook.com"]);

export function parseSignupEvent(origin: string, raw: unknown): SignupAssets | string | null {
  if (!META_MESSAGE_ORIGINS.has(origin)) return null;
  let payload = raw;
  if (typeof payload === "string") {
    if (payload.length > 10_000) return null;
    try { payload = JSON.parse(payload); } catch { return null; }
  }
  if (!payload || typeof payload !== "object") return null;
  const item = payload as { type?: unknown; event?: unknown; data?: { waba_id?: unknown; phone_number_id?: unknown } };
  if (item.type !== "WA_EMBEDDED_SIGNUP") return null;
  if (item.event === "CANCEL") return "META_SIGNUP_CANCELLED";
  if (item.event === "ERROR") return "META_SIGNUP_PROVIDER_ERROR";
  if (item.event !== "FINISH" && item.event !== "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING") return null;
  const wabaId = item.data?.waba_id;
  const phoneNumberId = item.data?.phone_number_id;
  if (typeof wabaId !== "string" || typeof phoneNumberId !== "string" || !/^\d{1,32}$/.test(wabaId) || !/^\d{1,32}$/.test(phoneNumberId)) return "META_SIGNUP_ASSETS_INCOMPLETE";
  return { wabaId, phoneNumberId };
}

// The deadline covers both the asset event and the SDK callback, in either order.
// dispose also prevents a failed or previous attempt from observing a later popup.
export function createSignupAttempt(target: EventTarget) {
  let onMessage: EventListener;
  const assets = new Promise<SignupAssets>((resolve, reject) => {
    onMessage = (event) => {
      const message = event as MessageEvent;
      const result = parseSignupEvent(message.origin, message.data);
      if (result === null) return;
      target.removeEventListener("message", onMessage);
      if (typeof result === "string") reject(new Error(result));
      else resolve(result);
    };
    target.addEventListener("message", onMessage);
  });
  let timer: ReturnType<typeof setTimeout>;
  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("META_SIGNUP_TIMEOUT")), EMBEDDED_SIGNUP_TTL_MS);
  });
  return { assets, expired, dispose() { clearTimeout(timer); target.removeEventListener("message", onMessage); } };
}

export function signupErrorMessage(error: unknown) {
  switch (error instanceof Error ? error.message : "") {
    case "META_SIGNUP_TIMEOUT": return "انتهت مهلة الربط (10 دقائق). أغلق نافذة Meta السابقة ثم ابدأ محاولة جديدة.";
    case "META_SIGNUP_CANCELLED": return "أُلغيت عملية الربط داخل Meta. يمكنك بدء محاولة جديدة.";
    case "META_SIGNUP_PROVIDER_ERROR": return "تعذر إكمال الربط داخل Meta. راجع التنبيه في نافذة Meta ثم أعد المحاولة.";
    case "META_SIGNUP_ASSETS_INCOMPLETE": return "لم تُرجع Meta بيانات الرقم كاملة. أكمل اختيار حساب واتساب والرقم ثم أعد الربط.";
    case "META_CODE_MISSING": return "لم تُرجع Meta تفويض الربط. تأكد من إكمال الموافقة وعدم إغلاق النافذة مبكرًا.";
    case "META_SESSION_FAILED": return "تعذر إنشاء جلسة ربط آمنة. أغلق نافذة Meta ثم أعد المحاولة.";
    default: return "تعذر إكمال الربط. أعد المحاولة، وإذا استمر الخطأ تواصل مع الدعم.";
  }
}

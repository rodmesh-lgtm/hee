/** Owner-facing diagnostics never include provider bodies, phone numbers or OTPs. */
export function bookingVerificationFailure(metadata: unknown) {
  const reason = metadata && typeof metadata === "object" && "reason" in metadata ? metadata.reason : null;
  if (reason === "meta_133010") return "رفضت Meta الإرسال لأن رقم واتساب غير مسجّل للإرسال عبر Cloud API (133010). افحص حالة الرقم وأكمل تسجيله من القسم أعلاه.";
  if (typeof reason === "string" && /^meta_\d{1,10}$/.test(reason)) {
    return `رفضت Meta إرسال رمز التحقق. رمز الخطأ: ${reason.slice(5)}. راجع حالة رقم واتساب وحساب الأعمال لدى Meta.`;
  }
  const messages: Record<string, string> = {
    acceptance_uncertain_no_retry: "انتهت مهلة الاتصال بواتساب دون تأكيد قبول الرسالة. لا نعيد الإرسال تلقائيًا لتجنب التكرار.",
    acceptance_unconfirmed_no_retry: "لم تُرجع واتساب مرجعًا يؤكد قبول رسالة التحقق.",
    provider_acceptance_unconfirmed_no_retry: "تعذر إكمال إرسال رمز التحقق. لم يتم تأكيد قبول الرسالة لدى واتساب.",
  };
  return typeof reason === "string" && Object.hasOwn(messages, reason) ? messages[reason] : "تعذر إرسال رمز التحقق. راجع إعدادات ربط رقم الحجوزات.";
}

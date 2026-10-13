import "server-only";

export async function sendAccountChangeCode(email: string, code: string, requestId: string, channel: "current" | "new") {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.HEE_FROM_EMAIL?.trim();
  if (!key || !from) return false;
  const purpose = channel === "current" ? "الموافقة على تغيير بريد حسابك" : "تأكيد بريد حسابك الجديد";
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": `account-email-${requestId}-${channel}` },
      body: JSON.stringify({ from, to: [email], subject: `${purpose} في INFRO`,
        text: `${purpose}\nرمز التحقق: ${code}\nأدخل الرمز في إعدادات حساب INFRO خلال 15 دقيقة. لن يتغير البريد قبل تأكيد البريدين. إذا لم تطلب التغيير، لا تشارك الرمز وتواصل مع دعم INFRO.`,
        html: `<div lang="ar" dir="rtl" style="font-family:Arial,sans-serif;font-size:16px;line-height:1.8"><h2>${purpose}</h2><p>أدخل الرمز التالي في إعدادات حساب INFRO خلال 15 دقيقة.</p><p dir="ltr" style="font-family:monospace;font-size:30px;letter-spacing:6px">${code}</p><p>لن يتغير البريد قبل تأكيد البريدين. إذا لم تطلب التغيير، لا تشارك الرمز وتواصل مع دعم INFRO.</p></div>` }),
      cache: "no-store", signal: AbortSignal.timeout(10_000),
    });
    return response.ok;
  } catch { return false; }
}

"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUserForWrites } from "../lib/auth";
import { consumeEmailVerificationToken, issueEmailVerification } from "../lib/email-verification";
import { consumePublicWriteLimit } from "../lib/rate-limit";

export type EmailVerificationState = { error?: string; success?: string };

async function requestAddress() {
  const requestHeaders = await headers();
  return requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim()
    || requestHeaders.get("x-real-ip")?.trim()
    || "unknown";
}

export async function requestEmailVerificationAction(_previous: EmailVerificationState, _formData: FormData): Promise<EmailVerificationState> {
  const user = await getCurrentUserForWrites();
  if (!user) return { error: "يجب تسجيل الدخول لإرسال رسالة التأكيد" };
  if (user.emailVerifiedAt) return { success: "بريد حسابك مؤكد بالفعل" };

  try {
    const address = await requestAddress();
    const [userRate, ipRate] = await Promise.all([
      consumePublicWriteLimit({ scope: "email-verification-user", businessId: "auth", identity: user.id, limit: 3, windowSeconds: 15 * 60 }),
      consumePublicWriteLimit({ scope: "email-verification-ip", businessId: "auth", identity: address, limit: 12, windowSeconds: 15 * 60 }),
    ]);
    if (!userRate.allowed || !ipRate.allowed) {
      return { error: "تم طلب رسائل تأكيد كثيرة. حاول مرة أخرى بعد قليل." };
    }
  } catch (error) {
    console.error("[email-verification] rate_limit_failed", error);
    return { error: "تعذر التحقق من طلب التأكيد الآن. حاول مرة أخرى بعد قليل." };
  }

  const result = await issueEmailVerification(user.id, user.email);
  if (result === "sent") return { success: "أرسلنا رابط التأكيد إلى بريدك. افتحه خلال 24 ساعة." };
  if (result === "already-verified") return { success: "بريد حسابك مؤكد بالفعل" };
  if (result === "not-configured") return { error: "خدمة تأكيد البريد لم تُفعّل بعد. تواصل مع إدارة HEE." };
  if (result === "send-failed") return { error: "تعذر إرسال رسالة التأكيد الآن. حاول مرة أخرى لاحقًا." };
  return { error: "تعذر إنشاء طلب تأكيد البريد الآن." };
}

export async function verifyEmailAction(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  if (!/^[0-9a-f]{64}$/i.test(token)) redirect("/verify-email?status=invalid");

  try {
    const address = await requestAddress();
    const rate = await consumePublicWriteLimit({
      scope: "email-verification-submit-ip",
      businessId: "auth",
      identity: address,
      limit: 30,
      windowSeconds: 15 * 60,
    });
    if (!rate.allowed) redirect("/verify-email?status=rate-limited");
  } catch (error) {
    console.error("[email-verification] submit_rate_limit_failed", error);
    redirect("/verify-email?status=unavailable");
  }

  const result = await consumeEmailVerificationToken(token);
  if (result !== "verified") redirect("/verify-email?status=invalid");
  redirect("/dashboard/settings?email=verified");
}

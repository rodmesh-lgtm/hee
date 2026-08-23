"use server";

import { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "../lib/db";
import { getCurrentUserForWrites } from "../lib/auth";
import { consumeEmailVerificationToken, issueEmailVerification } from "../lib/email-verification";
import { consumePublicWriteLimit } from "../lib/rate-limit";

export type EmailVerificationState = { error?: string; success?: string };
const EMAIL_VERIFICATION_PROVIDER = "email-verification";
const PASSWORD_RESET_PROVIDER = "password-reset";

async function requestAddress() {
  const requestHeaders = await headers();
  return requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim()
    || requestHeaders.get("x-real-ip")?.trim()
    || "unknown";
}

function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function validEmail(value: string) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function requestEmailVerificationAction(_previous: EmailVerificationState, _formData: FormData): Promise<EmailVerificationState> {
  void _previous;
  void _formData;
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

export async function changeUnverifiedEmailAction(_previous: EmailVerificationState, formData: FormData): Promise<EmailVerificationState> {
  void _previous;
  const user = await getCurrentUserForWrites();
  if (!user) return { error: "يجب تسجيل الدخول لتعديل البريد" };
  if (user.emailVerifiedAt) return { error: "لا يمكن تعديل البريد من هذا المسار بعد تأكيده" };
  if (!user.passwordHash) return { error: "لا يمكن تعديل بريد هذا الحساب من هذا المسار" };

  const nextEmail = normalizeEmail(formData.get("email"));
  if (!validEmail(nextEmail)) return { error: "أدخل بريدًا إلكترونيًا صحيحًا" };
  if (nextEmail === user.email.trim().toLowerCase()) return { error: "البريد الجديد مطابق للبريد الحالي" };

  try {
    const address = await requestAddress();
    const [userRate, ipRate] = await Promise.all([
      consumePublicWriteLimit({ scope: "unverified-email-change-user", businessId: "auth", identity: user.id, limit: 4, windowSeconds: 60 * 60 }),
      consumePublicWriteLimit({ scope: "unverified-email-change-ip", businessId: "auth", identity: address, limit: 12, windowSeconds: 60 * 60 }),
    ]);
    if (!userRate.allowed || !ipRate.allowed) return { error: "تم تعديل البريد عدة مرات خلال وقت قصير. حاول لاحقًا." };
  } catch (error) {
    console.error("[email-verification] email_change_rate_limit_failed", { userId: user.id, error });
    return { error: "تعذر التحقق من طلب تعديل البريد الآن. حاول مرة أخرى لاحقًا." };
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`unverified-email-change:${user.id}`}))`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`unverified-email-target:${nextEmail}`}))`;

      const current = await tx.user.findFirst({
        where: { id: user.id, deletedAt: null },
        select: { id: true, email: true, emailVerifiedAt: true, passwordHash: true },
      });
      if (!current || current.emailVerifiedAt || !current.passwordHash) throw new Error("email-change-not-allowed");

      const existing = await tx.user.findUnique({ where: { email: nextEmail }, select: { id: true } });
      if (existing && existing.id !== current.id) throw new Error("email-already-in-use");

      await tx.user.update({ where: { id: current.id }, data: { email: nextEmail } });
      // Any ownership or password-reset link delivered to the mistyped mailbox must
      // become unusable before this transaction commits the corrected address.
      await tx.oAuthState.deleteMany({
        where: {
          nonce: current.id,
          provider: { in: [EMAIL_VERIFICATION_PROVIDER, PASSWORD_RESET_PROVIDER] },
        },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "تعذر استخدام هذا البريد. اختر بريدًا آخر." };
    }
    if (error instanceof Error && error.message === "email-already-in-use") {
      return { error: "تعذر استخدام هذا البريد. اختر بريدًا آخر." };
    }
    if (error instanceof Error && error.message === "email-change-not-allowed") {
      return { error: "لم يعد تعديل البريد مسموحًا من هذا المسار" };
    }
    console.error("[email-verification] email_change_failed", { userId: user.id, error });
    return { error: "تعذر تحديث البريد الآن. حاول مرة أخرى لاحقًا." };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/onboarding");

  const result = await issueEmailVerification(user.id, nextEmail);
  if (result === "sent") return { success: "تم تحديث البريد وإرسال رابط تأكيد جديد إليه." };
  if (result === "not-configured") return { success: "تم تحديث البريد. خدمة إرسال رابط التأكيد غير مفعلة حاليًا." };
  if (result === "send-failed") return { success: "تم تحديث البريد، لكن تعذر إرسال رابط التأكيد الآن. استخدم زر إرسال رابط التأكيد لاحقًا." };
  if (result === "already-verified") return { success: "تم تحديث البريد." };
  return { success: "تم تحديث البريد. يمكنك الآن طلب رابط تأكيد جديد." };
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

"use server";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "../lib/db";
import { createSession, hashPassword, logoutSession, verifyPassword } from "../lib/auth";
import { clearQaAuditSession } from "../lib/qa-audit";
import { consumePublicWriteLimit } from "../lib/rate-limit";
import { loginSchema, registerSchema } from "../lib/validation";
import { PRIVACY_VERSION, TERMS_VERSION } from "../lib/legal";

export type ActionState = { error?: string };
const GENERIC_REGISTRATION_ERROR = "تعذر إنشاء الحساب بهذه البيانات. إذا كان لديك حساب فجرّب تسجيل الدخول أو استعادة كلمة المرور.";
// Valid bcrypt hash used only to equalize password-verification work when no password account exists.
// It is not associated with any HEE account and never authenticates a user.
const DUMMY_PASSWORD_HASH = "$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.";
function normalizeEmail(value: string) { return value.trim().toLowerCase(); }

async function requestAddress() {
  const requestHeaders = await headers();
  return requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim()
    || requestHeaders.get("x-real-ip")?.trim()
    || "unknown";
}

async function consumeAuthLimit(scope: string, identity: string, limit: number, windowSeconds: number) {
  try {
    const result = await consumePublicWriteLimit({
      scope,
      businessId: "hee-auth",
      identity: identity || "unknown",
      limit,
      windowSeconds,
    });
    return result.allowed;
  } catch (error) {
    console.error("[auth] rate_limit_failed", { scope, error });
    return false;
  }
}

export async function registerAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const agreed = String(formData.get("agreed") ?? "off") === "on";
  if (!agreed) return { error: "يجب الموافقة على الشروط والأحكام وسياسة الخصوصية أولاً" };

  const payload = {
    name: String(formData.get("name") ?? "").trim(),
    email: normalizeEmail(String(formData.get("email") ?? "")),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  };
  const parsed = registerSchema.safeParse(payload);
  if (!parsed.success) {
    const firstError = parsed.error.flatten().fieldErrors;
    return { error: Object.values(firstError).flat()[0] ?? "بيانات غير صالحة" };
  }

  const address = await requestAddress();
  if (!(await consumeAuthLimit("register-ip", address, 8, 60 * 60))) {
    return { error: "تعذر إكمال التسجيل الآن أو تم إجراء محاولات كثيرة. حاول مرة أخرى لاحقاً." };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  let user: { id: string };
  try {
    user = await db.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { name: parsed.data.name, email: parsed.data.email, passwordHash },
        select: { id: true },
      });
      // Legal acceptance is part of account creation, not an optional follow-up write.
      // If the audit row cannot be stored, the User creation rolls back as well.
      await tx.$executeRaw`
        INSERT INTO "LegalConsent" (
          "id", "userId", "termsVersion", "privacyVersion", "source", "acceptedAt"
        ) VALUES (
          ${randomUUID()}, ${created.id}, ${TERMS_VERSION}, ${PRIVACY_VERSION}, 'password_registration', ${new Date()}
        )
      `;
      return created;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: GENERIC_REGISTRATION_ERROR };
    }
    console.error("[register] account_creation_failed", error);
    return { error: "تعذر إنشاء الحساب الآن. حاول مرة أخرى بعد قليل." };
  }

  await clearQaAuditSession();
  await createSession(user.id);
  redirect("/onboarding");
}

export async function loginAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const payload = {
    email: normalizeEmail(String(formData.get("email") ?? "")),
    password: String(formData.get("password") ?? ""),
  };
  const parsed = loginSchema.safeParse(payload);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const address = await requestAddress();
  if (!(await consumeAuthLimit("login-ip", address, 30, 15 * 60))) {
    return { error: "تعذر تسجيل الدخول الآن أو تمت محاولات كثيرة. حاول مرة أخرى بعد قليل." };
  }

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  // Always perform one bcrypt comparison so unknown emails, OAuth-only accounts and
  // password accounts have substantially similar CPU work before returning an error.
  const passwordMatches = await verifyPassword(parsed.data.password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
  const authenticated = Boolean(user && !user.deletedAt && user.passwordHash && passwordMatches);
  if (!authenticated) {
    const emailAllowed = await consumeAuthLimit("login-email-failure", parsed.data.email, 10, 15 * 60);
    if (!emailAllowed) return { error: "تمت محاولات تسجيل دخول كثيرة. حاول مرة أخرى بعد قليل." };
    return { error: "البريد أو كلمة المرور غير صحيحة" };
  }

  await clearQaAuditSession();
  await createSession(user.id);
  const business = await db.business.findFirst({ where: { ownerId: user.id, deletedAt: null }, select: { id: true } });
  redirect(business ? "/dashboard" : "/onboarding");
}

export async function logoutAction() {
  await logoutSession();
  redirect("/");
}

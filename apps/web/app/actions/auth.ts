"use server";

import { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "../lib/db";
import { createSession, hashPassword, logoutSession, verifyPassword } from "../lib/auth";
import { clearQaAuditSession } from "../lib/qa-audit";
import { consumePublicWriteLimit } from "../lib/rate-limit";
import { loginSchema, registerSchema } from "../lib/validation";

export type ActionState = { error?: string };
function normalizeEmail(value: string) { return value.trim().toLowerCase(); }

async function requestAddress() {
  const requestHeaders = await headers();
  return requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim()
    || requestHeaders.get("x-real-ip")?.trim()
    || "unknown";
}

async function consumeAuthLimit(scope: string, identity: string, limit: number, windowSeconds: number) {
  const result = await consumePublicWriteLimit({
    scope,
    businessId: "hee-auth",
    identity: identity || "unknown",
    limit,
    windowSeconds,
  });
  return result.allowed;
}

export async function registerAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const agreed = String(formData.get("agreed") ?? "off") === "on";
  if (!agreed) return { error: "يجب الموافقة على الشروط والأحكام أولاً" };

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
    return { error: "تم إنشاء عدد كبير من الحسابات من هذا الاتصال. حاول مرة أخرى لاحقاً." };
  }

  const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return { error: "هذا البريد موجود مسبقاً" };

  const passwordHash = await hashPassword(parsed.data.password);
  let user;
  try {
    user = await db.user.create({ data: { name: parsed.data.name, email: parsed.data.email, passwordHash } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "هذا البريد موجود مسبقاً" };
    }
    throw error;
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
    return { error: "تمت محاولات تسجيل دخول كثيرة. حاول مرة أخرى بعد قليل." };
  }

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  const authenticated = Boolean(user && !user.deletedAt && user.passwordHash && await verifyPassword(parsed.data.password, user.passwordHash));
  if (!user || !authenticated) {
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

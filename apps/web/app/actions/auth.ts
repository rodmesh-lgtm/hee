"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { db } from "../lib/db";
import { createSession, getCurrentUser, hashPassword, logoutSession, verifyPassword } from "../lib/auth";
import { clearQaAuditSession } from "../lib/qa-audit";
import { loginSchema, registerSchema } from "../lib/validation";
import { resolveOnboardingRedirect } from "../lib/onboarding";

export type ActionState = { error?: string };

function normalizeEmail(value: string) { return value.trim().toLowerCase(); }

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
  const payload = { email: normalizeEmail(String(formData.get("email") ?? "")), password: String(formData.get("password") ?? "") };
  const parsed = loginSchema.safeParse(payload);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) return { error: "البريد أو كلمة المرور غير صحيحة" };
  if (!user.passwordHash) return { error: "هذا الحساب مرتبط بتسجيل دخول خارجي. استخدم Google أو Apple." };
  if (!(await verifyPassword(parsed.data.password, user.passwordHash))) return { error: "البريد أو كلمة المرور غير صحيحة" };

  await clearQaAuditSession();
  await createSession(user.id);

  const business = await db.business.findFirst({ where: { ownerId: user.id }, select: { id: true, onboardingCompleted: true, onboardingStep: true, isPublished: true } });
  if (!business || business.onboardingCompleted === false || business.isPublished === false) {
    redirect(resolveOnboardingRedirect(business?.onboardingStep, business?.isPublished));
  }
  redirect("/dashboard");
}

export async function logoutAction() {
  await logoutSession();
  redirect("/");
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

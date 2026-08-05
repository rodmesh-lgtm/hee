"use server";

import { redirect } from "next/navigation";
import { db } from "../lib/db";
import { createSession, getCurrentUser, hashPassword, logoutSession, verifyPassword } from "../lib/auth";
import { loginSchema, registerSchema } from "../lib/validation";

export type ActionState = {
  error?: string;
};

export async function registerAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const payload = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  };

  const parsed = registerSchema.safeParse(payload);
  if (!parsed.success) {
    const firstError = parsed.error.flatten().fieldErrors;
    const message = Object.values(firstError).flat()[0] ?? "بيانات غير صالحة";
    return { error: message };
  }

  const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return { error: "هذا البريد موجود مسبقاً" };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await db.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
    },
  });

  await createSession(user.id);
  redirect("/onboarding");
}

export async function loginAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const payload = {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };

  const parsed = loginSchema.safeParse(payload);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "بيانات غير صالحة";
    return { error: message };
  }

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) {
    return { error: "البريد أو كلمة المرور غير صحيحة" };
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    return { error: "البريد أو كلمة المرور غير صحيحة" };
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function logoutAction() {
  await logoutSession();
  redirect("/");
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return user;
}

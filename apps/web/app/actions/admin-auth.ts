"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "../lib/db";
import { createAdminSession, isAdminEmail, logoutAdminSession } from "../lib/admin";
import { verifyPassword } from "../lib/auth";
import { consumePublicWriteLimit } from "../lib/rate-limit";
import { loginSchema } from "../lib/validation";

export type AdminLoginState = { error?: string };

const DUMMY_PASSWORD_HASH = "$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

async function requestAddress() {
  const requestHeaders = await headers();
  return requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim()
    || requestHeaders.get("x-real-ip")?.trim()
    || "unknown";
}

async function consumeAdminLoginLimit(scope: string, identity: string, limit: number, windowSeconds: number) {
  try {
    const result = await consumePublicWriteLimit({
      scope,
      businessId: "hee-admin-control-plane",
      identity: identity || "unknown",
      limit,
      windowSeconds,
    });
    return result.allowed;
  } catch (error) {
    console.error("[admin-auth] rate_limit_failed", { scope, error });
    return false;
  }
}

export async function adminLoginAction(_prevState: AdminLoginState, formData: FormData): Promise<AdminLoginState> {
  const payload = {
    email: normalizeEmail(String(formData.get("email") ?? "")),
    password: String(formData.get("password") ?? ""),
  };
  const parsed = loginSchema.safeParse(payload);
  if (!parsed.success) return { error: "بيانات الدخول غير صحيحة" };

  const address = await requestAddress();
  if (!(await consumeAdminLoginLimit("admin-login-ip", address, 12, 15 * 60))) {
    return { error: "تعذر تسجيل الدخول الآن أو تمت محاولات كثيرة. حاول مرة أخرى لاحقًا." };
  }

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  const passwordMatches = await verifyPassword(parsed.data.password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
  const authorized = Boolean(
    user
    && !user.deletedAt
    && user.passwordHash
    && passwordMatches
    && user.emailVerifiedAt
    && isAdminEmail(user.email),
  );

  if (!authorized || !user) {
    await consumeAdminLoginLimit("admin-login-identity-failure", parsed.data.email, 6, 15 * 60);
    return { error: "بيانات الدخول غير صحيحة" };
  }

  await createAdminSession(user.id);
  redirect("/admin");
}

export async function adminLogoutAction() {
  await logoutAdminSession();
  redirect("/admin-login");
}

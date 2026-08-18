"use server";

import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { db } from "../lib/db";
import { hashPassword } from "../lib/auth";
import { consumePublicWriteLimit } from "../lib/rate-limit";

export type PasswordResetState = { error?: string; success?: string };
const PROVIDER = "password-reset";
const RESET_TTL_MS = 30 * 60 * 1000;
const passwordComplexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

function normalizeEmail(value: string) { return value.trim().toLowerCase(); }
function hashToken(token: string) { return createHash("sha256").update(token).digest("hex"); }

async function sendResetEmail(email: string, token: string) {
  const apiKey = String(process.env.RESEND_API_KEY ?? "").trim();
  const from = String(process.env.HEE_FROM_EMAIL ?? "").trim();
  if (!apiKey || !from) return false;

  const baseUrl = String(process.env.NEXT_PUBLIC_SITE_URL ?? "https://hee.sa").replace(/\/$/, "");
  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "HEE/1.0",
      "Idempotency-Key": `hee-reset-${hashToken(token).slice(0, 32)}`,
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "استعادة كلمة مرور HEE",
      text: `طلبت استعادة كلمة مرور حساب HEE. افتح الرابط التالي خلال 30 دقيقة:\n${resetUrl}\n\nإذا لم تطلب ذلك فتجاهل الرسالة.`,
      html: `<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.8"><h2>استعادة كلمة مرور HEE</h2><p>اضغط الزر التالي لتعيين كلمة مرور جديدة. الرابط صالح لمدة 30 دقيقة.</p><p><a href="${resetUrl}" style="display:inline-block;background:#6f3bd2;color:#fff;text-decoration:none;padding:12px 18px;border-radius:12px">تعيين كلمة مرور جديدة</a></p><p style="color:#666;font-size:13px">إذا لم تطلب استعادة كلمة المرور فتجاهل هذه الرسالة.</p></div>`,
    }),
    cache: "no-store",
  });
  return response.ok;
}

export async function requestPasswordResetAction(_previous: PasswordResetState, formData: FormData): Promise<PasswordResetState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "أدخل بريدًا إلكترونيًا صالحًا" };

  const rate = await consumePublicWriteLimit({
    scope: "password-reset-email",
    businessId: "auth",
    identity: email,
    limit: 3,
    windowSeconds: 15 * 60,
  });
  if (!rate.allowed) {
    return { success: "إذا كان البريد مرتبطًا بحساب HEE فستصلك رسالة الاستعادة خلال دقائق." };
  }

  const configured = Boolean(String(process.env.RESEND_API_KEY ?? "").trim() && String(process.env.HEE_FROM_EMAIL ?? "").trim());
  if (!configured) return { error: "استعادة كلمة المرور عبر البريد لم تُفعّل بعد. تواصل مع إدارة HEE." };

  const user = await db.user.findUnique({ where: { email }, select: { id: true, passwordHash: true } });
  if (!user?.passwordHash) return { success: "إذا كان البريد مرتبطًا بحساب HEE فستصلك رسالة الاستعادة خلال دقائق." };

  await db.oAuthState.deleteMany({ where: { provider: PROVIDER, nonce: user.id } });
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  await db.oAuthState.create({ data: { state: tokenHash, provider: PROVIDER, nonce: user.id, expiresAt: new Date(Date.now() + RESET_TTL_MS) } });

  let sent = false;
  try { sent = await sendResetEmail(email, token); }
  catch (error) { console.error("[password-reset] failed to send reset email", error); }
  if (!sent) {
    await db.oAuthState.deleteMany({ where: { state: tokenHash, provider: PROVIDER } });
    return { error: "تعذر إرسال رسالة الاستعادة الآن. حاول مرة أخرى لاحقًا." };
  }
  return { success: "إذا كان البريد مرتبطًا بحساب HEE فستصلك رسالة الاستعادة خلال دقائق." };
}

export async function resetPasswordAction(_previous: PasswordResetState, formData: FormData): Promise<PasswordResetState> {
  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  if (!token) return { error: "رابط الاستعادة غير صالح" };
  if (!passwordComplexityRegex.test(password)) return { error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي حرفًا كبيرًا وصغيرًا ورقمًا ورمزًا" };
  if (password !== confirmPassword) return { error: "كلمتا المرور غير متطابقتين" };

  const tokenHash = hashToken(token);
  const state = await db.oAuthState.findFirst({ where: { state: tokenHash, provider: PROVIDER, expiresAt: { gt: new Date() } }, select: { id: true, nonce: true } });
  if (!state) return { error: "انتهت صلاحية رابط الاستعادة أو تم استخدامه. اطلب رابطًا جديدًا." };

  const user = await db.user.findUnique({ where: { id: state.nonce }, select: { id: true } });
  if (!user) return { error: "رابط الاستعادة غير صالح" };
  const passwordHash = await hashPassword(password);
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { passwordHash } }),
    db.session.deleteMany({ where: { userId: user.id } }),
    db.oAuthState.deleteMany({ where: { provider: PROVIDER, nonce: user.id } }),
  ]);
  redirect("/login?reset=success");
}

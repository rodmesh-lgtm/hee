"use server";

import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "../lib/db";
import { hashPassword } from "../lib/auth";
import { consumePublicWriteLimit } from "../lib/rate-limit";

export type PasswordResetState = { error?: string; success?: string };
const PROVIDER = "password-reset";
const RESET_TTL_MS = 30 * 60 * 1000;
const passwordComplexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const GENERIC_RESET_MESSAGE = "إذا كان البريد مرتبطًا بحساب HEE فستصلك رسالة الاستعادة خلال دقائق.";

function normalizeEmail(value: string) { return value.trim().toLowerCase(); }
function hashToken(token: string) { return createHash("sha256").update(token).digest("hex"); }

function trustedResetOrigin(candidate: string, allowedSuffixes: string[]) {
  const raw = candidate.trim();
  if (!raw) return null;
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withProtocol);
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    const hostname = url.hostname.toLowerCase();
    const local = hostname === "localhost" || hostname === "127.0.0.1";
    const allowed = allowedSuffixes.some((suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`));
    if ((local && url.protocol === "http:") || (allowed && url.protocol === "https:")) return url.origin;
  } catch {
    // Invalid or untrusted candidate.
  }
  return null;
}

function passwordResetOrigin() {
  const vercelEnv = String(process.env.VERCEL_ENV ?? "").toLowerCase();
  if (vercelEnv === "production" || (!vercelEnv && process.env.NODE_ENV === "production")) return "https://ir.sa";

  if (vercelEnv === "preview") {
    return trustedResetOrigin(String(process.env.VERCEL_URL ?? ""), ["vercel.app"])
      || trustedResetOrigin(String(process.env.VERCEL_BRANCH_URL ?? ""), ["vercel.app"]);
  }

  const candidate = String(
    process.env.NEXT_PUBLIC_SITE_URL
      || process.env.NEXT_PUBLIC_APP_URL
      || process.env.AUTH_ORIGIN
      || "http://localhost:3000",
  );
  return trustedResetOrigin(candidate, ["vercel.app", "app.github.dev"]);
}

async function requestAddress() {
  const requestHeaders = await headers();
  return requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim()
    || requestHeaders.get("x-real-ip")?.trim()
    || "unknown";
}

async function consumeResetLimit(scope: string, identity: string, limit: number, windowSeconds: number) {
  try {
    return await consumePublicWriteLimit({ scope, businessId: "auth", identity: identity || "unknown", limit, windowSeconds });
  } catch (error) {
    console.error("[password-reset] rate_limit_failed", { scope, error });
    return null;
  }
}

async function sendResetEmail(email: string, token: string) {
  const apiKey = String(process.env.RESEND_API_KEY ?? "").trim();
  const from = String(process.env.HEE_FROM_EMAIL ?? "").trim();
  const origin = passwordResetOrigin();
  if (!apiKey || !from || !origin) {
    if (!origin) console.error("[password-reset] no trusted reset origin for current environment");
    return false;
  }

  const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(token)}`;
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
    signal: AbortSignal.timeout(10_000),
  });
  return response.ok;
}

export async function requestPasswordResetAction(_previous: PasswordResetState, formData: FormData): Promise<PasswordResetState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) return { error: "أدخل بريدًا إلكترونيًا صالحًا" };

  const address = await requestAddress();
  const [ipRate, emailRate] = await Promise.all([
    consumeResetLimit("password-reset-ip", address, 12, 15 * 60),
    consumeResetLimit("password-reset-email", email, 3, 15 * 60),
  ]);
  if (!ipRate || !emailRate) return { error: "تعذر التحقق من طلب الاستعادة الآن. حاول مرة أخرى بعد قليل." };
  if (!ipRate.allowed || !emailRate.allowed) return { success: GENERIC_RESET_MESSAGE };

  const configured = Boolean(String(process.env.RESEND_API_KEY ?? "").trim() && String(process.env.HEE_FROM_EMAIL ?? "").trim());
  if (!configured) return { error: "استعادة كلمة المرور عبر البريد لم تُفعّل بعد. تواصل مع إدارة HEE." };

  const user = await db.user.findUnique({ where: { email }, select: { id: true, passwordHash: true, deletedAt: true } });
  if (!user?.passwordHash || user.deletedAt) return { success: GENERIC_RESET_MESSAGE };

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`password-reset-request:${user.id}`}))`;
    await tx.oAuthState.deleteMany({ where: { provider: PROVIDER, nonce: user.id } });
    await tx.oAuthState.create({ data: { state: tokenHash, provider: PROVIDER, nonce: user.id, expiresAt: new Date(Date.now() + RESET_TTL_MS) } });
  });

  let sent = false;
  try { sent = await sendResetEmail(email, token); }
  catch (error) { console.error("[password-reset] failed to send reset email", error); }
  if (!sent) {
    await db.oAuthState.deleteMany({ where: { state: tokenHash, provider: PROVIDER } });
    console.error("[password-reset] reset email was not accepted by provider", { userId: user.id });
    return { success: GENERIC_RESET_MESSAGE };
  }
  return { success: GENERIC_RESET_MESSAGE };
}

export async function resetPasswordAction(_previous: PasswordResetState, formData: FormData): Promise<PasswordResetState> {
  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  if (!/^[0-9a-f]{64}$/i.test(token)) return { error: "رابط الاستعادة غير صالح" };
  if (password.length > 200 || !passwordComplexityRegex.test(password)) return { error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي حرفًا كبيرًا وصغيرًا ورقمًا ورمزًا" };
  if (password !== confirmPassword) return { error: "كلمتا المرور غير متطابقتين" };

  const tokenHash = hashToken(token);
  const address = await requestAddress();
  const [ipRate, tokenRate] = await Promise.all([
    consumeResetLimit("password-reset-submit-ip", address, 20, 15 * 60),
    consumeResetLimit("password-reset-submit-token", tokenHash, 8, 15 * 60),
  ]);
  if (!ipRate || !tokenRate) return { error: "تعذر التحقق من رابط الاستعادة الآن. حاول مرة أخرى بعد قليل." };
  if (!ipRate.allowed || !tokenRate.allowed) return { error: "تمت محاولات كثيرة. اطلب رابط استعادة جديدًا أو حاول لاحقًا." };

  const preflight = await db.oAuthState.findFirst({
    where: { state: tokenHash, provider: PROVIDER, expiresAt: { gt: new Date() } },
    select: { id: true },
  });
  if (!preflight) return { error: "انتهت صلاحية رابط الاستعادة أو تم استخدامه. اطلب رابطًا جديدًا." };

  const passwordHash = await hashPassword(password);
  const result = await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`password-reset-token:${tokenHash}`}))`;

    const state = await tx.oAuthState.findFirst({
      where: { state: tokenHash, provider: PROVIDER, expiresAt: { gt: new Date() } },
      select: { id: true, nonce: true },
    });
    if (!state) return "invalid" as const;

    const user = await tx.user.findFirst({ where: { id: state.nonce, deletedAt: null }, select: { id: true } });
    if (!user) {
      await tx.oAuthState.deleteMany({ where: { id: state.id } });
      return "invalid" as const;
    }

    const consumed = await tx.oAuthState.deleteMany({ where: { id: state.id, state: tokenHash, provider: PROVIDER } });
    if (consumed.count !== 1) return "invalid" as const;

    await tx.user.update({ where: { id: user.id }, data: { passwordHash, emailVerifiedAt: new Date() } });
    await tx.session.deleteMany({ where: { userId: user.id } });
    await tx.oAuthState.deleteMany({ where: { provider: PROVIDER, nonce: user.id } });
    await tx.oAuthState.deleteMany({ where: { provider: "email-verification", nonce: user.id } });
    return "updated" as const;
  });

  if (result !== "updated") return { error: "انتهت صلاحية رابط الاستعادة أو تم استخدامه. اطلب رابطًا جديدًا." };
  redirect("/login?reset=success");
}

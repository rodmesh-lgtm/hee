import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { db } from "./db";

const PROVIDER = "email-verification";
const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function verificationOrigin() {
  // Production links must never inherit a mutable preview/custom environment origin.
  // This also protects a non-Vercel production runtime where VERCEL_ENV is absent.
  if (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") return "https://hee.sa";
  const candidate = String(
    process.env.NEXT_PUBLIC_SITE_URL
      || process.env.NEXT_PUBLIC_APP_URL
      || process.env.AUTH_ORIGIN
      || "http://localhost:3000",
  ).trim();
  try {
    const url = new URL(candidate);
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.protocol !== "https:" && !(local && url.protocol === "http:")) return "https://hee.sa";
    return url.origin;
  } catch {
    return "https://hee.sa";
  }
}

export function emailVerificationConfigured() {
  return Boolean(String(process.env.RESEND_API_KEY ?? "").trim() && String(process.env.HEE_FROM_EMAIL ?? "").trim());
}

async function sendVerificationEmail(email: string, token: string) {
  const apiKey = String(process.env.RESEND_API_KEY ?? "").trim();
  const from = String(process.env.HEE_FROM_EMAIL ?? "").trim();
  if (!apiKey || !from) return false;

  const verifyUrl = `${verificationOrigin()}/verify-email?token=${encodeURIComponent(token)}`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "HEE/1.0",
      "Idempotency-Key": `hee-email-verify-${hashToken(token).slice(0, 32)}`,
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "تأكيد بريد حساب HEE",
      text: `لتأكيد ملكيتك لبريد حساب HEE افتح الرابط التالي خلال 24 ساعة:\n${verifyUrl}\n\nإذا لم تطلب إنشاء الحساب فتجاهل الرسالة.`,
      html: `<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.8"><h2>تأكيد بريد حساب HEE</h2><p>افتح الرابط ثم اضغط زر التأكيد لإثبات ملكيتك لهذا البريد. الرابط صالح لمدة 24 ساعة.</p><p><a href="${verifyUrl}" style="display:inline-block;background:#6f3bd2;color:#fff;text-decoration:none;padding:12px 18px;border-radius:12px">تأكيد البريد الإلكتروني</a></p><p style="color:#666;font-size:13px">إذا لم تطلب إنشاء الحساب فتجاهل هذه الرسالة.</p></div>`,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  return response.ok;
}

export async function issueEmailVerification(userId: string, email: string) {
  if (!emailVerificationConfigured()) return "not-configured" as const;
  const normalizedEmail = email.trim().toLowerCase();
  if (!userId || !/^\S+@\S+\.\S+$/.test(normalizedEmail) || normalizedEmail.length > 254) return "invalid" as const;

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const stateId = await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`email-verification:${userId}`}))`;
    const user = await tx.user.findFirst({
      where: { id: userId, email: normalizedEmail, deletedAt: null },
      select: { id: true, emailVerifiedAt: true },
    });
    if (!user) return null;
    if (user.emailVerifiedAt) return "already-verified";
    await tx.oAuthState.deleteMany({ where: { provider: PROVIDER, nonce: userId } });
    const created = await tx.oAuthState.create({
      data: {
        state: tokenHash,
        provider: PROVIDER,
        nonce: userId,
        redirectTo: normalizedEmail,
        expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
      },
      select: { id: true },
    });
    return created.id;
  });

  if (!stateId) return "invalid" as const;
  if (stateId === "already-verified") return "already-verified" as const;

  let sent = false;
  try {
    sent = await sendVerificationEmail(normalizedEmail, token);
  } catch (error) {
    console.error("[email-verification] failed to send", error);
  }
  if (!sent) {
    await db.oAuthState.deleteMany({ where: { id: stateId, state: tokenHash, provider: PROVIDER } });
    return "send-failed" as const;
  }
  return "sent" as const;
}

export async function consumeEmailVerificationToken(token: string) {
  const normalized = token.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(normalized)) return "invalid" as const;
  const tokenHash = hashToken(normalized);

  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`email-verification-token:${tokenHash}`}))`;
    const state = await tx.oAuthState.findFirst({
      where: { state: tokenHash, provider: PROVIDER, expiresAt: { gt: new Date() } },
      select: { id: true, nonce: true, redirectTo: true },
    });
    if (!state || !state.redirectTo) return "invalid" as const;

    const user = await tx.user.findFirst({
      where: { id: state.nonce, deletedAt: null },
      select: { id: true, email: true, emailVerifiedAt: true },
    });
    if (!user || user.email.trim().toLowerCase() !== state.redirectTo.trim().toLowerCase()) {
      await tx.oAuthState.deleteMany({ where: { id: state.id } });
      return "invalid" as const;
    }

    const consumed = await tx.oAuthState.deleteMany({ where: { id: state.id, state: tokenHash, provider: PROVIDER } });
    if (consumed.count !== 1) return "invalid" as const;
    if (!user.emailVerifiedAt) {
      await tx.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
    }
    await tx.oAuthState.deleteMany({ where: { provider: PROVIDER, nonce: user.id } });
    return "verified" as const;
  });
}

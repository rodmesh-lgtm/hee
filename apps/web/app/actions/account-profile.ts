"use server";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getCurrentSessionIdForUser, getCurrentUserForWrites } from "../lib/auth";
import { db } from "../lib/db";
import { consumePublicWriteLimit } from "../lib/rate-limit";
import { accountCodeHash, accountCodeMatches, createAccountCode, normalizeAccountPhone } from "../lib/account-profile-domain";
import { sendAccountChangeCode } from "../lib/account-email";
import { isAdminEmail } from "../lib/admin";

export type AccountProfileState = { error?: string; success?: string; requested?: boolean };
const PROVIDER = "account-email-change";

async function allowed(userId: string, scope: string, limit: number) {
  const result = await consumePublicWriteLimit({ businessId: "auth", identity: userId, scope, limit, windowSeconds: 15 * 60 });
  return result.allowed;
}

export async function updateAccountProfileAction(_state: AccountProfileState, form: FormData): Promise<AccountProfileState> {
  const user = await getCurrentUserForWrites();
  const name = String(form.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 100) return { error: "أدخل اسمًا من حرفين إلى 100 حرف." };
  let phone: string | null;
  try { phone = normalizeAccountPhone(String(form.get("phone") ?? "")); }
  catch { return { error: "أدخل رقم جوال صحيحًا، مثل 05xxxxxxxx أو الرقم مع رمز الدولة." }; }
  try {
    if (!await allowed(user.id, "account-profile-update", 20)) return { error: "محاولات كثيرة، حاول بعد قليل." };
    await db.user.update({ where: { id: user.id, deletedAt: null }, data: { name, phone } });
    revalidatePath("/dashboard", "layout");
    return { success: "تم حفظ الاسم ورقم الجوال." };
  } catch { return { error: "تعذر حفظ البيانات الآن. حاول مرة أخرى." }; }
}

export async function requestAccountEmailChangeAction(_state: AccountProfileState, form: FormData): Promise<AccountProfileState> {
  const user = await getCurrentUserForWrites();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "أدخل بريدًا إلكترونيًا صحيحًا." };
  if (email === user.email.toLowerCase()) return { error: "البريد الجديد مطابق للبريد الحالي." };
  // Email allowlists must never become a self-service route to privileged access.
  if (isAdminEmail(email) || isAdminEmail(user.email)) return { error: "تغيير بريد الحساب الإداري يتطلب التواصل مع الدعم." };
  try {
    if (!await allowed(user.id, "account-email-request", 3)) return { error: "تم طلب الرموز عدة مرات. حاول بعد 15 دقيقة." };
    if (await db.user.findUnique({ where: { email }, select: { id: true } })) return { error: "تعذر استخدام هذا البريد. اختر بريدًا آخر." };
    const id = randomUUID();
    const currentCode = createAccountCode();
    const newCode = createAccountCode();
    await db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`account-email:${user.id}`}))`;
      await tx.oAuthState.deleteMany({ where: { provider: PROVIDER, nonce: user.id } });
      await tx.oAuthState.create({ data: { id, provider: PROVIDER, state: randomUUID(), nonce: user.id,
        redirectTo: email, codeVerifier: JSON.stringify({ oldEmail: user.email, currentHash: accountCodeHash(id, "current", currentCode), newHash: accountCodeHash(id, "new", newCode) }),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000) } });
    });
    const sent = await Promise.all([sendAccountChangeCode(user.email, currentCode, id, "current"), sendAccountChangeCode(email, newCode, id, "new")]);
    if (sent.some(ok => !ok)) {
      await db.oAuthState.deleteMany({ where: { id, provider: PROVIDER, nonce: user.id } });
      return { error: "تعذر إرسال رمزي التأكيد. لم يتغير بريدك الحالي؛ حاول لاحقًا." };
    }
    return { success: "أرسلنا رمزًا للبريد الحالي ورمزًا للبريد الجديد. أدخلهما خلال 15 دقيقة.", requested: true };
  } catch { return { error: "تعذر بدء تغيير البريد الآن. بريدك الحالي لم يتغير." }; }
}

export async function confirmAccountEmailChangeAction(_state: AccountProfileState, form: FormData): Promise<AccountProfileState> {
  const user = await getCurrentUserForWrites();
  const currentCode = String(form.get("currentCode") ?? "").trim();
  const newCode = String(form.get("newCode") ?? "").trim();
  try {
    if (!await allowed(user.id, "account-email-confirm", 10)) return { error: "محاولات كثيرة. انتظر 15 دقيقة ثم اطلب رموزًا جديدة." };
    const sessionId = await getCurrentSessionIdForUser(user.id);
    if (!sessionId) return { error: "سجّل الدخول مجددًا لإكمال التغيير." };
    const result = await db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`account-email:${user.id}`}))`;
      const pending = await tx.oAuthState.findFirst({ where: { provider: PROVIDER, nonce: user.id, expiresAt: { gt: new Date() } } });
      if (!pending?.codeVerifier || !pending.redirectTo) return false;
      const proof = JSON.parse(pending.codeVerifier) as { oldEmail: string; currentHash: string; newHash: string };
      if (!accountCodeMatches(pending.id, "current", currentCode, proof.currentHash) || !accountCodeMatches(pending.id, "new", newCode, proof.newHash)) return false;
      if (isAdminEmail(proof.oldEmail) || isAdminEmail(pending.redirectTo)) return false;
      const changed = await tx.user.updateMany({ where: { id: user.id, email: proof.oldEmail, deletedAt: null }, data: { email: pending.redirectTo, emailVerifiedAt: new Date() } });
      if (changed.count !== 1) return false;
      await tx.session.deleteMany({ where: { userId: user.id, id: { not: sessionId } } });
      await tx.oAuthState.deleteMany({ where: { nonce: user.id, provider: { in: [PROVIDER, "email-verification", "password-reset"] } } });
      return true;
    });
    if (!result) return { error: "الرموز غير صحيحة أو منتهية. تحقق منها أو اطلب رموزًا جديدة." };
    revalidatePath("/dashboard", "layout");
    return { success: "تم تغيير البريد وتأكيده. استخدم البريد الجديد عند الدخول بكلمة المرور." };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { error: "تعذر استخدام هذا البريد. اختر بريدًا آخر." };
    return { error: "تعذر إكمال التغيير الآن. حاول مرة أخرى." };
  }
}

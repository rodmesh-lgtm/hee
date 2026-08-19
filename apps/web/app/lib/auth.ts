import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { compare, hash } from "bcryptjs";
import { db } from "./db";
import { clearQaAuditSession, getQaAuditSessionUser, isQaAuditModeUser } from "./qa-audit";

const SESSION_COOKIE = "hee_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const QA_TOKEN_PREFIX = "hee_qa_audit_";

export async function hashPassword(password: string) {
  return hash(password, 10);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash);
}

export async function createSession(userId: string) {
  const cookieStore = await cookies();
  const previousToken = cookieStore.get(SESSION_COOKIE)?.value;
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.$transaction(async (tx) => {
    if (previousToken && !previousToken.startsWith(QA_TOKEN_PREFIX)) await tx.session.deleteMany({ where: { token: previousToken } });
    await tx.session.deleteMany({ where: { userId, expiresAt: { lt: new Date() } } });
    await tx.session.create({ data: { token, userId, expiresAt } });
  });

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });

  return token;
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  // QA preview tokens live in the same backing Session table for operational simplicity,
  // but they are a separate trust domain. Never authenticate a QA token from the ordinary
  // customer session cookie, even if a token is copied between cookies manually.
  if (token && !token.startsWith(QA_TOKEN_PREFIX)) {
    const session = await db.session.findUnique({ where: { token }, include: { user: true } });
    if (session && session.expiresAt >= new Date() && !session.user.deletedAt) return session.user;

    // getCurrentUser is called from Server Components as well as actions. Next.js
    // does not allow mutating response cookies from a Server Component render.
    // Clean invalid/stale database rows best-effort and leave cookie replacement/removal
    // to the next explicit login/logout response instead of turning expiry into a 500.
    if (session) await db.session.deleteMany({ where: { token } }).catch(() => undefined);
  }

  return getQaAuditSessionUser();
}

export async function getCurrentUserForApiWrite() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (await isQaAuditModeUser(user.id)) return null;
  return user;
}

export async function getCurrentUserForWrites() {
  const user = await getCurrentUserForApiWrite();
  if (!user) redirect("/login");
  return user;
}

export async function logoutSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token && !token.startsWith(QA_TOKEN_PREFIX)) await db.session.deleteMany({ where: { token } });
  cookieStore.delete(SESSION_COOKIE);
  await clearQaAuditSession();
}

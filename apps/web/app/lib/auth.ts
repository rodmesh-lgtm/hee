import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { compare, hash } from "bcryptjs";
import { db } from "./db";
import { clearQaAuditSession, getQaAuditSessionUser, isQaAuditModeUser } from "./qa-audit";

const SESSION_COOKIE = "__Host-hee_session";
const LEGACY_SESSION_COOKIE = "hee_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const QA_TOKEN_PREFIX = "hee_qa_audit_";
const NORMAL_SESSION_STORAGE_PREFIX = "hee_session_sha256:";

function newSessionToken() { return randomBytes(32).toString("base64url"); }
function sessionStorageToken(rawToken: string) {
  return `${NORMAL_SESSION_STORAGE_PREFIX}${createHash("sha256").update(rawToken).digest("hex")}`;
}
function looksLikeStoredSessionToken(value: string) { return value.startsWith(NORMAL_SESSION_STORAGE_PREFIX); }

export async function hashPassword(password: string) { return hash(password, 10); }
export async function verifyPassword(password: string, passwordHash: string) { return compare(password, passwordHash); }

export async function createSession(userId: string) {
  const cookieStore = await cookies();
  const previousToken = cookieStore.get(SESSION_COOKIE)?.value || cookieStore.get(LEGACY_SESSION_COOKIE)?.value;
  const token = newSessionToken();
  const storedToken = sessionStorageToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.$transaction(async (tx) => {
    if (previousToken && !previousToken.startsWith(QA_TOKEN_PREFIX)) {
      const candidates = looksLikeStoredSessionToken(previousToken)
        ? [previousToken]
        : [previousToken, sessionStorageToken(previousToken)];
      await tx.session.deleteMany({ where: { token: { in: candidates } } });
    }
    await tx.session.deleteMany({ where: { userId, expiresAt: { lt: new Date() } } });
    await tx.session.create({ data: { token: storedToken, userId, expiresAt } });
  });

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  cookieStore.delete(LEGACY_SESSION_COOKIE);
  return token;
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value || cookieStore.get(LEGACY_SESSION_COOKIE)?.value;

  if (token && !token.startsWith(QA_TOKEN_PREFIX) && !looksLikeStoredSessionToken(token)) {
    // New sessions store only SHA-256(token) in the database, so a database read alone
    // cannot be replayed as an authenticated browser cookie. Legacy plaintext rows remain
    // readable during the transition and disappear naturally on login/logout/expiry.
    const hashedToken = sessionStorageToken(token);
    let session = await db.session.findUnique({ where: { token: hashedToken }, include: { user: true } });
    let legacy = false;
    if (!session) {
      session = await db.session.findUnique({ where: { token }, include: { user: true } });
      legacy = Boolean(session);
    }
    if (session && session.expiresAt >= new Date() && !session.user.deletedAt) return session.user;

    if (session) {
      const stored = legacy ? token : hashedToken;
      await db.session.deleteMany({ where: { token: stored } }).catch(() => undefined);
    }
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
  const token = cookieStore.get(SESSION_COOKIE)?.value || cookieStore.get(LEGACY_SESSION_COOKIE)?.value;
  if (token && !token.startsWith(QA_TOKEN_PREFIX)) {
    const candidates = looksLikeStoredSessionToken(token) ? [token] : [token, sessionStorageToken(token)];
    await db.session.deleteMany({ where: { token: { in: candidates } } });
  }
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(LEGACY_SESSION_COOKIE);
  await clearQaAuditSession();
}

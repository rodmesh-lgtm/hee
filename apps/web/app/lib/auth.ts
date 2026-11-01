import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { compare, hash } from "bcryptjs";
import { db } from "./db";
import { clearQaAuditSession, getQaAuditSessionUser, isQaAuditModeUser } from "./qa-audit";
import { isExplicitTestRuntime } from "./runtime-environment";

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
function allowLegacyPlaintextSessions() { return isExplicitTestRuntime(); }

export async function hashPassword(password: string) { return hash(password, 10); }
export async function verifyPassword(password: string, passwordHash: string) { return compare(password, passwordHash); }

// Business selection belongs to the authenticated session, not the browser's
// previous account. Clear host and shared-domain preferences on login/logout.
async function clearSessionBusinessContext(store:Awaited<ReturnType<typeof cookies>>) {
  store.delete("hee_active_business");
  store.delete("infro_workspace_business");
  const host=(await headers()).get("host")?.split(":")[0];
  if(host==="ir.sa"||host==="www.ir.sa"||host==="hub.ir.sa")store.set("infro_workspace_business","",{domain:"ir.sa",path:"/",secure:true,httpOnly:true,sameSite:"lax",maxAge:0});
}

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

  await clearSessionBusinessContext(cookieStore);
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

/** Session identity used only by the explicit account recovery flow. */
export async function getAuthenticatedAccountUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value || cookieStore.get(LEGACY_SESSION_COOKIE)?.value;

  if (token && !token.startsWith(QA_TOKEN_PREFIX) && !looksLikeStoredSessionToken(token)) {
    // Real runtimes authenticate only against SHA-256(token) rows. Plaintext legacy
    // session rows are accepted solely by the explicit CI test runtime, and a Vercel
    // Production signal always wins over a drifting APP_ENV=test value.
    const hashedToken = sessionStorageToken(token);
    let session = await db.session.findUnique({ where: { token: hashedToken }, include: { user: true } });
    let storedToken = hashedToken;
    if (!session && allowLegacyPlaintextSessions()) {
      session = await db.session.findUnique({ where: { token }, include: { user: true } });
      storedToken = token;
    }
    if (session && session.expiresAt >= new Date() && !session.user.deletedAt) return session.user;

    if (session) {
      await db.session.deleteMany({ where: { token: storedToken } }).catch(() => undefined);
    }
  }

  return getQaAuditSessionUser();
}

export async function getCurrentUser() {
  const user = await getAuthenticatedAccountUser();
  if (user?.deactivatedAt) redirect("/account-paused");
  return user;
}

export async function getCurrentUserForApiWrite() {
  const user = await getAuthenticatedAccountUser();
  if (!user || user.deactivatedAt) return null;
  if (await isQaAuditModeUser(user.id)) return null;
  return user;
}

// Session identifiers are safe for account management; bearer tokens and their
// stored hashes must never leave this server-side lookup.
export async function getCurrentSessionIdForUser(userId: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value || cookieStore.get(LEGACY_SESSION_COOKIE)?.value;
  if (!token || token.startsWith(QA_TOKEN_PREFIX) || looksLikeStoredSessionToken(token)) return null;
  const candidates = [sessionStorageToken(token), ...(allowLegacyPlaintextSessions() ? [token] : [])];
  const session = await db.session.findFirst({ where: { userId, token: { in: candidates }, expiresAt: { gt: new Date() } }, select: { id: true } });
  return session?.id ?? null;
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
  await clearSessionBusinessContext(cookieStore);
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(LEGACY_SESSION_COOKIE);
  await clearQaAuditSession();
}

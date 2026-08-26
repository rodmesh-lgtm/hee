import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { db } from "./db";
import { getCurrentUser } from "./auth";
import { isQaAuditModeUser } from "./qa-audit";
import { isExplicitTestRuntime, isProductionRuntime } from "./runtime-environment";

const ADMIN_SESSION_COOKIE = "__Host-hee_admin_session";
const ADMIN_SESSION_TTL_MS = 1000 * 60 * 60 * 8;
const ADMIN_SESSION_STORAGE_PREFIX = "hee_admin_session_sha256:";

function adminEmails() {
  return new Set(
    String(process.env.HEE_ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

function adminStorageToken(rawToken: string) {
  return `${ADMIN_SESSION_STORAGE_PREFIX}${createHash("sha256").update(rawToken).digest("hex")}`;
}

export function isAdminEmail(email?: string | null) {
  if (!email) return false;
  return adminEmails().has(email.trim().toLowerCase());
}

export function adminControlOrigin() {
  const productionOrigin = "https://admin.hee.sa";
  if (isProductionRuntime()) return productionOrigin;
  const configured = String(process.env.HEE_ADMIN_ORIGIN ?? "").trim();
  if (configured) {
    try {
      const url = new URL(configured);
      if (url.protocol === "https:" && url.hostname) return url.origin;
    } catch { /* use production default */ }
  }
  return productionOrigin;
}

export async function createAdminSession(userId: string) {
  const cookieStore = await cookies();
  const previous = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const token = randomBytes(32).toString("base64url");
  const storedToken = adminStorageToken(token);
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_TTL_MS);

  await db.$transaction(async (tx) => {
    if (previous) await tx.session.deleteMany({ where: { token: adminStorageToken(previous) } });
    await tx.session.deleteMany({ where: { userId, token: { startsWith: ADMIN_SESSION_STORAGE_PREFIX }, expiresAt: { lt: new Date() } } });
    await tx.session.create({ data: { token: storedToken, userId, expiresAt } });
  });

  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: true,
    path: "/",
    maxAge: Math.floor(ADMIN_SESSION_TTL_MS / 1000),
  });
  return token;
}

export async function getCurrentAdminUser() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (rawToken) {
    const storedToken = adminStorageToken(rawToken);
    const session = await db.session.findUnique({ where: { token: storedToken }, include: { user: true } });
    if (session && session.expiresAt >= new Date() && !session.user.deletedAt && session.user.emailVerifiedAt && isAdminEmail(session.user.email)) {
      if (!(await isQaAuditModeUser(session.user.id))) return session.user;
    }
    if (session) await db.session.deleteMany({ where: { token: storedToken } }).catch(() => undefined);
  }

  // Legacy admin workflow fixtures still create only the customer cookie. This
  // compatibility branch exists solely in the explicit CI runtime. Production and
  // previews never accept a customer session as administrator authority.
  if (isExplicitTestRuntime()) {
    const user = await getCurrentUser();
    if (user?.emailVerifiedAt && isAdminEmail(user.email) && !(await isQaAuditModeUser(user.id))) return user;
  }

  return null;
}

export async function logoutAdminSession() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (rawToken) await db.session.deleteMany({ where: { token: adminStorageToken(rawToken) } });
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

export async function requireAdmin() {
  const user = await getCurrentAdminUser();
  if (!user) {
    const vercelEnv = String(process.env.VERCEL_ENV ?? "").trim().toLowerCase();
    if (isExplicitTestRuntime() || vercelEnv === "preview" || vercelEnv === "development") redirect("/admin-login");
    redirect(`${adminControlOrigin()}/login`);
  }
  if (!user.emailVerifiedAt || !isAdminEmail(user.email)) notFound();
  return user;
}

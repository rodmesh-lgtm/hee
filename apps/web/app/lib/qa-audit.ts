import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";

const QA_SESSION_COOKIE = "hee_qa_audit";
const QA_SESSION_TTL_MS = 1000 * 60 * 30;
const QA_AUDIT_LINK_TTL_MS = 1000 * 60 * 45;
const QA_AUDIT_LINK_PREFIX = "hee_qa_audit_link:";
const QA_ACTIVE_SESSION_PREFIX = "hee_qa_audit_session:";
const QA_ALLOWED_PATHS = ["/dashboard", "/dashboard/my-page", "/dashboard/analytics", "/dashboard/tools", "/dashboard/settings"] as const;

function resolveQaRequestedPath(requestedPath?: string | null) {
  if (!requestedPath) return "/dashboard/my-page";
  try { const parsed = new URL(requestedPath, "https://qa-audit.local"); const normalizedPath = parsed.pathname; if (!QA_ALLOWED_PATHS.includes(normalizedPath as (typeof QA_ALLOWED_PATHS)[number])) return "/dashboard/my-page"; return `${normalizedPath}${parsed.search}`; } catch { return "/dashboard/my-page"; }
}
function getQaAuditSecret() { return process.env.QA_AUDIT_SECRET?.trim() || null; }
function getQaAuditUserEmail() { return process.env.QA_AUDIT_USER_EMAIL?.trim().toLowerCase() || null; }
function constantTimeEqual(left: string, right: string) { const a = Buffer.from(left); const b = Buffer.from(right); return a.length === b.length && timingSafeEqual(a, b); }
export function isPreviewQaEnvironment() { const vercelEnv = process.env.VERCEL_ENV?.toLowerCase(); return vercelEnv === "preview" && Boolean(getQaAuditSecret()) && Boolean(getQaAuditUserEmail()); }
export function isQaAuditTokenValid(token?: string | null) { if (!isPreviewQaEnvironment()) return false; const expectedSecret = getQaAuditSecret(); return Boolean(token && expectedSecret && constantTimeEqual(token, expectedSecret)); }
function extractQaRequestToken(request: Request) { const authorization = request.headers.get("authorization") ?? ""; const bearerToken = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : null; const url = new URL(request.url); const queryToken = url.searchParams.get("token")?.trim() || null; return bearerToken || queryToken; }
export async function hasQaAuditRequestAccess(request: Request) { if (!isPreviewQaEnvironment()) return false; if (isQaAuditTokenValid(extractQaRequestToken(request))) return true; return isQaAuditSessionActive(); }

export async function resolveQaAuditUser() {
  if (!isPreviewQaEnvironment()) return null;
  const email = getQaAuditUserEmail(); if (!email) return null;
  const { db } = await import("./db"); const name = process.env.QA_AUDIT_USER_NAME?.trim() || "QA Audit Preview";
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.deletedAt) return null;
    // QA_AUDIT_USER_EMAIL is an operator-declared preview-only service identity. It must
    // never retain an ordinary password credential: older preview builds created it with
    // a deterministic password, which could bypass the one-time QA-link trust boundary.
    // Scrubbing that legacy hash also makes password-reset requests indistinguishable from
    // OAuth-only/no-password accounts and prevents this service identity being reused via /login.
    if (existing.name !== name || existing.passwordHash !== null) {
      return db.user.update({ where: { id: existing.id }, data: { name, passwordHash: null } });
    }
    return existing;
  }
  try { return await db.user.create({ data: { name, email, passwordHash: null } }); } catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return db.user.findFirst({ where: { email, deletedAt: null, passwordHash: null } }); throw error; }
}

export async function createQaAuditSession(userId: string) {
  const cookieStore = await cookies();
  // Prefix active QA tokens so the ordinary hee_session cookie can never authenticate with
  // a QA token copied from the preview-only QA cookie. This keeps the two trust domains distinct.
  const qaToken = `${QA_ACTIVE_SESSION_PREFIX}${crypto.randomUUID()}`;
  const now = new Date(); const expiresAt = new Date(now.getTime() + QA_SESSION_TTL_MS); const { db } = await import("./db");
  await db.$transaction(async (tx) => {
    await tx.session.deleteMany({ where: { userId, token: { startsWith: QA_ACTIVE_SESSION_PREFIX }, expiresAt: { lt: now } } });
    await tx.session.create({ data: { token: qaToken, userId, expiresAt } });
  });
  cookieStore.set(QA_SESSION_COOKIE, qaToken, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: Math.floor(QA_SESSION_TTL_MS / 1000) });
  return qaToken;
}

export async function getQaAuditSessionUser() {
  if (!isPreviewQaEnvironment()) return null;
  const cookieStore = await cookies(); const token = cookieStore.get(QA_SESSION_COOKIE)?.value;
  if (!token || !token.startsWith(QA_ACTIVE_SESSION_PREFIX)) return null;
  const { db } = await import("./db"); const session = await db.session.findUnique({ where: { token }, include: { user: true } });
  if (!session || session.expiresAt < new Date() || session.user.deletedAt) { if (session) await db.session.deleteMany({ where: { token } }).catch(() => undefined); return null; }
  const configuredEmail = getQaAuditUserEmail(); if (!configuredEmail || session.user.email.toLowerCase() !== configuredEmail) return null;
  return session.user;
}

export async function clearQaAuditSession() {
  const cookieStore = await cookies(); const token = cookieStore.get(QA_SESSION_COOKIE)?.value;
  if (token?.startsWith(QA_ACTIVE_SESSION_PREFIX)) { const { db } = await import("./db"); await db.session.deleteMany({ where: { token } }); }
  cookieStore.delete(QA_SESSION_COOKIE);
}

export async function createQaAuditOneTimeLink(requestedPath?: string | null) {
  if (!isPreviewQaEnvironment()) return null; const qaUser = await resolveQaAuditUser(); if (!qaUser) return null;
  const auditId = crypto.randomUUID().replaceAll("-", ""); const expiresAt = new Date(Date.now() + QA_AUDIT_LINK_TTL_MS); const { db } = await import("./db");
  await db.$transaction(async (tx) => { await tx.session.deleteMany({ where: { userId: qaUser.id, token: { startsWith: QA_AUDIT_LINK_PREFIX }, expiresAt: { lt: new Date() } } }); await tx.session.create({ data: { token: `${QA_AUDIT_LINK_PREFIX}${auditId}`, userId: qaUser.id, expiresAt } }); });
  return { auditId, expiresAt, path: resolveQaRequestedPath(requestedPath) };
}

async function consumeQaAuditOneTimeLink(auditId: string, requestedPath?: string | null) {
  if (!/^[a-f0-9]{32}$/i.test(auditId)) return null; const qaUser = await resolveQaAuditUser(); if (!qaUser) return null;
  const token = `${QA_AUDIT_LINK_PREFIX}${auditId}`; const { db } = await import("./db");
  const consumed = await db.$transaction(async (tx) => { await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`qa-link:${auditId}`}))`; const linkSession = await tx.session.findUnique({ where: { token } }); if (!linkSession || linkSession.userId !== qaUser.id || linkSession.expiresAt < new Date()) { if (linkSession) await tx.session.deleteMany({ where: { token } }); return false; } const deleted = await tx.session.deleteMany({ where: { token, userId: qaUser.id } }); return deleted.count === 1; });
  if (!consumed) return null; await createQaAuditSession(qaUser.id); return resolveQaRequestedPath(requestedPath);
}

export async function requireQaAuditAccess(searchParams?: { token?: string | string[] | null; path?: string | string[] | null; auditId?: string | string[] | null }) {
  if (!isPreviewQaEnvironment()) return null;
  const requestedPath = Array.isArray(searchParams?.path) ? searchParams.path[0] : searchParams?.path ?? null; const auditId = Array.isArray(searchParams?.auditId) ? searchParams.auditId[0] : searchParams?.auditId ?? null;
  if (auditId) return consumeQaAuditOneTimeLink(auditId, requestedPath);
  const token = Array.isArray(searchParams?.token) ? searchParams.token[0] : searchParams?.token ?? null; if (!isQaAuditTokenValid(token)) return null;
  const qaUser = await resolveQaAuditUser(); if (!qaUser) return null; await createQaAuditSession(qaUser.id); return resolveQaRequestedPath(requestedPath);
}
export async function isQaAuditModeUser(userId?: string | null) { if (!isPreviewQaEnvironment() || !userId) return false; const qaUser = await resolveQaAuditUser(); return Boolean(qaUser && qaUser.id === userId); }
export async function isQaAuditSessionActive() { return Boolean(await getQaAuditSessionUser()); }

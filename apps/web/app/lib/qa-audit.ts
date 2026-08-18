import { cookies } from "next/headers";
import { hash } from "bcryptjs";

const QA_SESSION_COOKIE = "hee_qa_audit";
const QA_SESSION_TTL_MS = 1000 * 60 * 30; // 30 minutes
const QA_AUDIT_LINK_TTL_MS = 1000 * 60 * 45; // 45 minutes
const QA_AUDIT_LINK_PREFIX = "hee_qa_audit_link:";
const QA_ALLOWED_PATHS = ["/dashboard", "/dashboard/my-page", "/dashboard/analytics", "/dashboard/tools", "/dashboard/settings"] as const;

function resolveQaRequestedPath(requestedPath?: string | null) {
  if (!requestedPath) {
    return "/dashboard/my-page";
  }

  try {
    const parsed = new URL(requestedPath, "https://qa-audit.local");
    const normalizedPath = parsed.pathname;

    if (!QA_ALLOWED_PATHS.includes(normalizedPath as (typeof QA_ALLOWED_PATHS)[number])) {
      return "/dashboard/my-page";
    }

    return `${normalizedPath}${parsed.search}`;
  } catch {
    return "/dashboard/my-page";
  }
}

function getQaAuditSecret() {
  return process.env.QA_AUDIT_SECRET?.trim() || null;
}

function getQaAuditUserEmail() {
  return process.env.QA_AUDIT_USER_EMAIL?.trim() || null;
}

export function isPreviewQaEnvironment() {
  const vercelEnv = process.env.VERCEL_ENV?.toLowerCase();
  const hasSecret = Boolean(getQaAuditSecret());
  const hasEmail = Boolean(getQaAuditUserEmail());
  return vercelEnv === "preview" && hasSecret && hasEmail;
}

export function isQaAuditTokenValid(token?: string | null) {
  if (!isPreviewQaEnvironment()) {
    return false;
  }

  const expectedSecret = getQaAuditSecret();
  return Boolean(token && expectedSecret && token === expectedSecret);
}

function extractQaRequestToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const bearerToken = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : null;
  const url = new URL(request.url);
  const queryToken = url.searchParams.get("token")?.trim() || null;
  return bearerToken || queryToken;
}

export async function hasQaAuditRequestAccess(request: Request) {
  if (!isPreviewQaEnvironment()) return false;
  if (isQaAuditTokenValid(extractQaRequestToken(request))) return true;
  return isQaAuditSessionActive();
}

export async function resolveQaAuditUser() {
  const email = getQaAuditUserEmail();
  if (!email) {
    return null;
  }

  const { db } = await import("./db");
  const name = process.env.QA_AUDIT_USER_NAME?.trim() || "QA Audit Preview";
  const passwordHash = await hash("qa-preview-access", 10);

  return db.user.upsert({
    where: { email },
    update: { name },
    create: {
      name,
      email,
      passwordHash,
    },
  });
}

export async function createQaAuditSession(userId: string) {
  const cookieStore = await cookies();
  const qaToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + QA_SESSION_TTL_MS);

  cookieStore.set(QA_SESSION_COOKIE, qaToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 30,
  });

  const { db } = await import("./db");
  await db.session.create({
    data: {
      token: qaToken,
      userId,
      expiresAt,
    },
  });

  return qaToken;
}

export async function getQaAuditSessionUser() {
  if (!isPreviewQaEnvironment()) {
    return null;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(QA_SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  const qaUser = await resolveQaAuditUser();
  if (!qaUser) {
    return null;
  }

  const { db } = await import("./db");
  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.userId !== qaUser.id || session.expiresAt < new Date()) {
    if (session) await db.session.deleteMany({ where: { token } });
    // This helper is called while rendering Server Components too. Cookie deletion
    // is only legal in Route Handlers / Server Actions, so stale QA cookies are
    // left for the next explicit QA login/logout response instead of causing 500s.
    return null;
  }

  return session.user;
}

export async function clearQaAuditSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(QA_SESSION_COOKIE)?.value;
  if (token) {
    const { db } = await import("./db");
    await db.session.deleteMany({ where: { token } });
  }
  cookieStore.delete(QA_SESSION_COOKIE);
}

export async function createQaAuditOneTimeLink(requestedPath?: string | null) {
  if (!isPreviewQaEnvironment()) {
    return null;
  }

  const qaUser = await resolveQaAuditUser();
  if (!qaUser) {
    return null;
  }

  const auditId = crypto.randomUUID().replaceAll("-", "");
  const expiresAt = new Date(Date.now() + QA_AUDIT_LINK_TTL_MS);

  const { db } = await import("./db");
  await db.session.create({
    data: {
      token: `${QA_AUDIT_LINK_PREFIX}${auditId}`,
      userId: qaUser.id,
      expiresAt,
    },
  });

  return {
    auditId,
    expiresAt,
    path: resolveQaRequestedPath(requestedPath),
  };
}

async function consumeQaAuditOneTimeLink(auditId: string, requestedPath?: string | null) {
  if (!/^[a-f0-9]{32}$/i.test(auditId)) {
    return null;
  }

  const qaUser = await resolveQaAuditUser();
  if (!qaUser) {
    return null;
  }

  const token = `${QA_AUDIT_LINK_PREFIX}${auditId}`;
  const { db } = await import("./db");
  const linkSession = await db.session.findUnique({ where: { token } });

  if (!linkSession || linkSession.userId !== qaUser.id || linkSession.expiresAt < new Date()) {
    await db.session.deleteMany({ where: { token } });
    return null;
  }

  await db.session.deleteMany({ where: { token } });
  await createQaAuditSession(qaUser.id);
  return resolveQaRequestedPath(requestedPath);
}

export async function requireQaAuditAccess(searchParams?: { token?: string | string[] | null; path?: string | string[] | null; auditId?: string | string[] | null }) {
  if (!isPreviewQaEnvironment()) {
    return null;
  }

  const requestedPath = Array.isArray(searchParams?.path) ? searchParams.path[0] : searchParams?.path ?? null;
  const auditId = Array.isArray(searchParams?.auditId) ? searchParams.auditId[0] : searchParams?.auditId ?? null;
  if (auditId) {
    return consumeQaAuditOneTimeLink(auditId, requestedPath);
  }

  const token = Array.isArray(searchParams?.token) ? searchParams.token[0] : searchParams?.token ?? null;
  if (!isQaAuditTokenValid(token)) {
    return null;
  }

  const qaUser = await resolveQaAuditUser();
  if (!qaUser) {
    return null;
  }

  await createQaAuditSession(qaUser.id);
  return resolveQaRequestedPath(requestedPath);
}

export async function isQaAuditModeUser(userId?: string | null) {
  if (!isPreviewQaEnvironment()) {
    return false;
  }

  const qaUser = await resolveQaAuditUser();
  return Boolean(qaUser && userId && qaUser.id === userId);
}

export async function isQaAuditSessionActive() {
  const user = await getQaAuditSessionUser();
  return Boolean(user);
}

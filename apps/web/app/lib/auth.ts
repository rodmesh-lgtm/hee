import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { compare, hash } from "bcryptjs";
import { db } from "./db";
import { clearQaAuditSession, getQaAuditSessionUser, isQaAuditModeUser } from "./qa-audit";

export async function hashPassword(password: string) {
  return hash(password, 10);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash);
}

export async function createSession(userId: string) {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

  await db.session.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  (await cookies()).set("hee_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return token;
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("hee_session")?.value;

  if (token) {
    const session = await db.session.findUnique({
      where: { token },
      include: {
        user: true,
      },
    });

    if (session && session.expiresAt >= new Date()) {
      return session.user;
    }
  }

  return getQaAuditSessionUser();
}

export async function getCurrentUserForWrites() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const isQaAudit = await isQaAuditModeUser(user.id);
  if (isQaAudit) {
    return null;
  }

  return user;
}

export async function logoutSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("hee_session")?.value;

  if (token) {
    await db.session.deleteMany({
      where: { token },
    });
  }

  cookieStore.delete("hee_session");
  await clearQaAuditSession();
}

import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "./auth";
import { isQaAuditModeUser } from "./qa-audit";

function adminEmails() {
  return new Set(
    String(process.env.HEE_ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmail(email?: string | null) {
  if (!email) return false;
  return adminEmails().has(email.trim().toLowerCase());
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // QA audit access is intentionally read-only and must never inherit admin powers
  // even if environment variables are accidentally configured with the same email.
  if (await isQaAuditModeUser(user.id)) notFound();
  // The allowlist identifies which mailbox may hold platform-admin authority; it is not
  // proof that the currently authenticated account controls that mailbox. Password
  // registration intentionally creates a session before verification, so admin access
  // must additionally require completed mailbox ownership verification.
  if (!user.emailVerifiedAt || !isAdminEmail(user.email)) notFound();
  return user;
}

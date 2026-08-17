import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "./auth";

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
  if (!isAdminEmail(user.email)) notFound();
  return user;
}

"use server";
import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "../lib/db";
import { getAuthenticatedAccountUser, getCurrentUserForWrites, logoutSession } from "../lib/auth";
import { isAdminEmail } from "../lib/admin";
import { isQaAuditModeUser } from "../lib/qa-audit";
import { stopAccountBusinessServices } from "../lib/account-service-stop";

export async function deactivateOwnAccountAction(form: FormData) {
  const user = await getCurrentUserForWrites();
  if (!user.emailVerifiedAt || isAdminEmail(user.email)) redirect("/dashboard/account-status?error=identity");
  if (String(form.get("email") ?? "").trim().toLowerCase() !== user.email.toLowerCase() || form.get("confirmation") !== "PAUSE MY INFRO ACCOUNT") redirect("/dashboard/account-status?error=confirmation");
  const now = new Date();
  const slugs = await db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`account-deletion:${user.id}`}))`;
    const current = await tx.user.findUnique({ where: { id: user.id } });
    if (!current || current.deletedAt || current.deactivatedAt || !current.emailVerifiedAt || current.email !== user.email) throw new Error("ACCOUNT_IDENTITY_CHANGED");
    const businesses = await tx.business.findMany({ where: { ownerId: user.id, deletedAt: null }, select: { id: true, slug: true }, orderBy: { id: "asc" } });
    for (const business of businesses) {
      await stopAccountBusinessServices(tx, business.id, now);
      await tx.analyticsEvent.create({ data: { businessId: business.id, eventType: "account_deactivated", metadata: { actorUserId: user.id, resumePolicy: "manual_services" } } });
    }
    await tx.user.update({ where: { id: user.id }, data: { deactivatedAt: now } });
    await tx.session.deleteMany({ where: { userId: user.id } });
    return businesses.map(b => b.slug);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30000 });
  for (const slug of slugs) revalidatePath(`/${slug}`);
  revalidatePath("/dashboard", "layout");
  await logoutSession();
  redirect("/login?account=paused");
}

export async function reactivateOwnAccountAction(form: FormData) {
  const user = await getAuthenticatedAccountUser();
  if (!user || await isQaAuditModeUser(user.id)) redirect("/login");
  if (form.get("confirm") !== "on") redirect("/account-paused?error=confirmation");
  await db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`account-deletion:${user.id}`}))`;
    const restored = await tx.user.updateMany({ where: { id: user.id, deletedAt: null, deactivatedAt: { not: null } }, data: { deactivatedAt: null } });
    if (restored.count) {
      const businesses = await tx.business.findMany({ where: { ownerId: user.id, deletedAt: null }, select: { id: true } });
      for (const business of businesses) await tx.analyticsEvent.create({ data: { businessId: business.id, eventType: "account_reactivated", metadata: { actorUserId: user.id, resumePolicy: "manual_services" } } });
    }
  });
  // Restoring login never republishes pages, renews billing or replays old messages.
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/settings?account=restored");
}

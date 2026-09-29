"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "../../../lib/db";
import { getCurrentSessionIdForUser, getCurrentUserForWrites } from "../../../lib/auth";
import { getActiveBusinessWithPlanForUser } from "../../../lib/active-business";

async function revoke(targetId: string | null) {
  const user = await getCurrentUserForWrites();
  const currentId = await getCurrentSessionIdForUser(user.id);
  if (!currentId) redirect("/login");
  if (targetId === currentId) redirect("/dashboard/settings/sessions?result=current");
  const business = await getActiveBusinessWithPlanForUser(user.id);
  const count = await db.$transaction(async tx => {
    const current = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id" FROM "Session" WHERE "id" = ${currentId} AND "userId" = ${user.id} AND "expiresAt" > CURRENT_TIMESTAMP FOR UPDATE
    `);
    if (!current.length) return null;
    const result = await tx.session.deleteMany({ where: { userId: user.id, id: targetId ? { equals: targetId, not: currentId } : { not: currentId } } });
    if (result.count && business) await tx.analyticsEvent.create({ data: { businessId: business.id, eventType: "account.sessions.revoked",
      metadata: { actorUserId: user.id, scope: targetId ? "single" : "others", count: result.count } } });
    return result.count;
  });
  if (count === null) redirect("/login");
  revalidatePath("/dashboard/settings/sessions");
  redirect(`/dashboard/settings/sessions?result=${count ? "revoked" : "unchanged"}`);
}

export async function revokeAccountSessionAction(form: FormData) {
  const id = form.get("sessionId");
  if (typeof id !== "string" || !/^[a-zA-Z0-9-]{1,100}$/.test(id)) redirect("/dashboard/settings/sessions?result=unchanged");
  return revoke(id);
}
export async function revokeOtherAccountSessionsAction() { return revoke(null); }

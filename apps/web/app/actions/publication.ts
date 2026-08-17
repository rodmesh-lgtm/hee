"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserForWrites } from "../lib/auth";
import { db } from "../lib/db";

export async function unpublishBusinessAction() {
  const user = await getCurrentUserForWrites();
  const business = await db.business.findFirst({ where: { ownerId: user.id, deletedAt: null }, select: { id: true, slug: true } });
  if (!business) redirect("/onboarding");

  await db.business.update({ where: { id: business.id }, data: { isPublished: false } });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/my-page");
  revalidatePath(`/${business.slug}`);
  redirect("/dashboard/my-page");
}

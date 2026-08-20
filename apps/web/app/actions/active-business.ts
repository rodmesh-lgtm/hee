"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserForWrites } from "../lib/auth";
import { ACTIVE_BUSINESS_COOKIE } from "../lib/active-business";
import { db } from "../lib/db";

export async function switchActiveBusinessAction(formData: FormData) {
  const user = await getCurrentUserForWrites();
  const businessId = String(formData.get("businessId") ?? "").trim();
  if (!businessId) redirect("/dashboard");

  const owned = await db.business.findFirst({
    where: { id: businessId, ownerId: user.id, deletedAt: null },
    select: { id: true },
  });
  if (!owned) redirect("/dashboard?business=invalid");

  const jar = await cookies();
  jar.set(ACTIVE_BUSINESS_COOKIE, owned.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/dashboard", "layout");
  revalidatePath("/preview");
  redirect("/dashboard?business=switched");
}

"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserForWrites } from "../lib/auth";
import { ACTIVE_BUSINESS_COOKIE } from "../lib/active-business";
import { db } from "../lib/db";
import { isExplicitTestRuntime } from "../lib/runtime-environment";

function activeBusinessCookieSecure() {
  // CI exercises the production build over local HTTP. Only the explicit CI test runtime
  // may relax Secure; a Vercel Production signal always wins over APP_ENV drift.
  return process.env.NODE_ENV === "production" && !isExplicitTestRuntime();
}

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
    secure: activeBusinessCookieSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/dashboard", "layout");
  revalidatePath("/preview");
  redirect("/dashboard?business=switched");
}

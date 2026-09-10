"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "../lib/admin";
import { db } from "../lib/db";
import { PROTECTED_SLUG_GRANT_EVENT } from "../lib/protected-public-slug";
import { isProtectedPublicSlug, isSystemReservedPublicSlug, normalizePublicSlug } from "../lib/public-url";

type AssignmentResult = "assigned" | "confirmation" | "invalid" | "missing" | "reason" | "taken";

function destination(businessId: string, result: AssignmentResult) {
  return `/admin/businesses/${businessId}?protectedSlug=${result}`;
}

export async function assignProtectedSlugAdminAction(formData: FormData) {
  const admin = await requireAdmin();
  const businessId = String(formData.get("businessId") ?? "").trim();
  const slug = normalizePublicSlug(String(formData.get("protectedSlug") ?? ""));
  const confirmation = normalizePublicSlug(String(formData.get("confirmationSlug") ?? ""));
  const authorizationReference = String(formData.get("authorizationReference") ?? "").trim();

  if (!businessId) redirect("/admin?error=protected-slug");
  if (!slug || isSystemReservedPublicSlug(slug) || !isProtectedPublicSlug(slug)) redirect(destination(businessId, "invalid"));
  if (confirmation !== slug) redirect(destination(businessId, "confirmation"));
  if (authorizationReference.length < 12 || authorizationReference.length > 500) redirect(destination(businessId, "reason"));

  let result: AssignmentResult = "assigned";
  let previousSlug = "";
  try {
    result = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`protected-slug:${slug}`}))`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`admin-business:${businessId}`}))`;

      const business = await tx.business.findFirst({
        where: { id: businessId, deletedAt: null },
        select: { id: true, name: true, slug: true },
      });
      if (!business) return "missing" as const;
      previousSlug = business.slug;

      const [conflictingBusiness, aliases] = await Promise.all([
        tx.business.findFirst({ where: { slug, id: { not: business.id } }, select: { id: true } }),
        tx.$queryRaw<Array<{ businessId: string }>>`
          SELECT "businessId" FROM "BusinessSlugAlias" WHERE "slug" = ${slug} LIMIT 1
        `,
      ]);
      if (conflictingBusiness || (aliases[0] && aliases[0].businessId !== business.id)) return "taken" as const;

      if (business.slug !== slug) await tx.business.update({ where: { id: business.id }, data: { slug } });
      await tx.analyticsEvent.create({
        data: {
          businessId: business.id,
          eventType: PROTECTED_SLUG_GRANT_EVENT,
          metadata: {
            slug,
            previousSlug: business.slug,
            businessName: business.name,
            authorizationReference,
            assignedAt: new Date().toISOString(),
            assignedByUserId: admin.id,
            assignedByEmail: admin.email,
            source: "central_admin_business",
            policy: "protected_brand_admin_exception",
          },
        },
      });
      return "assigned" as const;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") result = "taken";
    else {
      console.error("[admin-protected-slug] assignment failed", error);
      result = "taken";
    }
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/businesses/${businessId}`);
  if (previousSlug) revalidatePath(`/${previousSlug}`);
  if (result === "assigned") revalidatePath(`/${slug}`);
  redirect(destination(businessId, result));
}

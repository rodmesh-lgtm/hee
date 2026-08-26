"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../lib/db";
import { requireAdmin } from "../lib/admin";

export async function setBusinessVerificationAdminAction(formData: FormData) {
  const admin = await requireAdmin();
  const businessId = String(formData.get("businessId") ?? "").trim();
  const desired = String(formData.get("verified") ?? "") === "true";
  if (!businessId) redirect("/admin?error=verification");

  const result = await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`admin-business:${businessId}`}))`;
    const business = await tx.business.findFirst({
      where: { id: businessId, deletedAt: null },
      select: { id: true, isVerified: true },
    });
    if (!business) return "missing" as const;
    if (business.isVerified === desired) return "unchanged" as const;

    await tx.business.update({ where: { id: business.id }, data: { isVerified: desired } });
    await tx.analyticsEvent.create({
      data: {
        businessId: business.id,
        eventType: "admin_verification_changed",
        metadata: {
          status: desired ? "verified" : "unverified",
          previousVerified: business.isVerified,
          reviewedAt: new Date().toISOString(),
          reviewedByUserId: admin.id,
          reviewedByEmail: admin.email,
          source: "central_admin_business",
        },
      },
    });

    // A direct administrative verification resolves any still-pending customer requests.
    if (desired) {
      const pending = await tx.analyticsEvent.findMany({
        where: { businessId: business.id, eventType: "verification_requested" },
        select: { id: true, metadata: true },
      });
      for (const event of pending) {
        const metadata = event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)
          ? event.metadata as Record<string, unknown>
          : {};
        if (String(metadata.status ?? "pending") !== "pending") continue;
        await tx.analyticsEvent.update({
          where: { id: event.id },
          data: { metadata: { ...metadata, status: "approved", reviewedAt: new Date().toISOString(), reviewedByUserId: admin.id, reviewedByEmail: admin.email, source: "central_admin_business_direct" } },
        });
      }
    }
    return desired ? "verified" as const : "unverified" as const;
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/businesses/${businessId}`);
  revalidatePath("/dashboard/branding");
  if (result === "missing") redirect("/admin?error=verification");
  redirect(`/admin/businesses/${businessId}?verification=${result}`);
}

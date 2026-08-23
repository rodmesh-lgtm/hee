"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../lib/db";
import { getCurrentUserForWrites } from "../lib/auth";
import { getActiveBusinessForUser } from "../lib/active-business";
import { getPersistentStorageAdapter } from "../lib/storage";
import { removePersistentUrl, removeReplacedPersistentUrl } from "../lib/storage-lifecycle";
import { consumePublicWriteLimit } from "../lib/rate-limit";

function folder(businessId: string) { return `company-profiles/${businessId}`; }
function cleanTitle(value: FormDataEntryValue | null) {
  return String(value ?? "").trim().replace(/[\r\n\t]+/g, " ").slice(0, 120) || "الملف التعريفي للشركة";
}

export async function updateCompanyProfileAction(formData: FormData) {
  const user = await getCurrentUserForWrites();
  if (!user) redirect("/dashboard/digital-identity?profile=readonly");
  const business = await getActiveBusinessForUser(user.id);
  if (!business) redirect("/onboarding");

  try {
    const rate = await consumePublicWriteLimit({ scope: "company-profile", businessId: business.id, identity: user.id, limit: 12, windowSeconds: 60 * 60 });
    if (!rate.allowed) redirect("/dashboard/digital-identity?profile=rate-limited");
  } catch (error) {
    console.error("[company-profile] rate_limit_failed", { businessId: business.id, error });
    redirect("/dashboard/digital-identity?profile=error");
  }

  const file = formData.get("profileFile");
  if (!(file instanceof File) || file.size <= 0) redirect("/dashboard/digital-identity?profile=missing");

  let uploaded: Awaited<ReturnType<ReturnType<typeof getPersistentStorageAdapter>["upload"]>> | null = null;
  try {
    uploaded = await getPersistentStorageAdapter().upload({ file, folder: folder(business.id) });
    if (uploaded.mimeType !== "application/pdf") throw new Error("company profile must be PDF");
    const title = cleanTitle(formData.get("profileTitle"));
    const previous = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`company-profile:${business.id}`}))`;
      const current = await tx.business.findFirst({ where: { id: business.id, ownerId: user.id, deletedAt: null }, select: { companyProfileUrl: true } });
      if (!current) return null;
      const updated = await tx.business.updateMany({ where: { id: business.id, ownerId: user.id, deletedAt: null }, data: { companyProfileUrl: uploaded!.url, companyProfileTitle: title } });
      return updated.count === 1 ? current.companyProfileUrl : null;
    });
    if (previous === null) {
      await removePersistentUrl(uploaded.url, folder(business.id));
      redirect("/dashboard/digital-identity?profile=error");
    }
    await removeReplacedPersistentUrl(previous, uploaded.url, folder(business.id));
  } catch (error) {
    if (uploaded?.url) await removePersistentUrl(uploaded.url, folder(business.id)).catch(() => undefined);
    console.error("[company-profile] upload_failed", { businessId: business.id, error });
    redirect("/dashboard/digital-identity?profile=error");
  }

  revalidatePath("/dashboard/digital-identity");
  revalidatePath(`/${business.slug}`);
  redirect("/dashboard/digital-identity?profile=saved");
}

export async function removeCompanyProfileAction() {
  const user = await getCurrentUserForWrites();
  if (!user) redirect("/dashboard/digital-identity?profile=readonly");
  const business = await getActiveBusinessForUser(user.id);
  if (!business) redirect("/onboarding");
  const previous = await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`company-profile:${business.id}`}))`;
    const current = await tx.business.findFirst({ where: { id: business.id, ownerId: user.id, deletedAt: null }, select: { companyProfileUrl: true } });
    if (!current) return null;
    await tx.business.updateMany({ where: { id: business.id, ownerId: user.id, deletedAt: null }, data: { companyProfileUrl: null, companyProfileTitle: null } });
    return current.companyProfileUrl;
  });
  if (previous) await removePersistentUrl(previous, folder(business.id)).catch((error) => console.error("[company-profile] cleanup_failed", { businessId: business.id, error }));
  revalidatePath("/dashboard/digital-identity");
  revalidatePath(`/${business.slug}`);
  redirect("/dashboard/digital-identity?profile=removed");
}

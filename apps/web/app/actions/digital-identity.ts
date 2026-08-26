"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../lib/db";
import { getCurrentUserForWrites } from "../lib/auth";
import { getActiveBusinessForUser } from "../lib/active-business";
import { getPersistentStorageAdapter, type StorageUploadResult } from "../lib/storage";
import { removePersistentUrl, removeReplacedPersistentUrl } from "../lib/storage-lifecycle";
import { consumePublicWriteLimit } from "../lib/rate-limit";

const PROFILE_FOLDER = "company-profiles";
function cleanTitle(value: FormDataEntryValue | null) { return String(value ?? "").trim().replace(/[\r\n\t]+/g, " ").slice(0, 120) || "الملف التعريفي للشركة"; }

export async function updateCompanyProfileAction(formData: FormData) {
  const user = await getCurrentUserForWrites();
  if (!user) redirect("/dashboard/digital-identity?profile=readonly");
  const business = await getActiveBusinessForUser(user.id);
  if (!business) redirect("/onboarding");
  let rateAllowed = false;
  try {
    const rate = await consumePublicWriteLimit({ scope: "company-profile", businessId: business.id, identity: user.id, limit: 12, windowSeconds: 60 * 60 });
    rateAllowed = rate.allowed;
  } catch (error) {
    console.error("[company-profile] rate_limit_failed", { businessId: business.id, error });
    redirect("/dashboard/digital-identity?profile=error");
  }
  if (!rateAllowed) redirect("/dashboard/digital-identity?profile=rate-limited");
  const file = formData.get("profileFile");
  if (!(file instanceof File) || file.size <= 0) redirect("/dashboard/digital-identity?profile=missing");
  let uploaded: StorageUploadResult | null = null;
  try {
    uploaded = await getPersistentStorageAdapter().upload({ file, folder: PROFILE_FOLDER });
    if (uploaded.mimeType !== "application/pdf") throw new Error("company profile must be PDF");
    const title = cleanTitle(formData.get("profileTitle"));
    const result = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`company-profile:${business.id}`}))`;
      const current = await tx.business.findFirst({ where: { id: business.id, ownerId: user.id, deletedAt: null }, select: { companyProfileUrl: true } });
      if (!current) return { found: false as const, previous: null };
      const updated = await tx.business.updateMany({ where: { id: business.id, ownerId: user.id, deletedAt: null }, data: { companyProfileUrl: uploaded!.url, companyProfileTitle: title } });
      return { found: updated.count === 1, previous: current.companyProfileUrl };
    });
    if (!result.found) {
      await removePersistentUrl(uploaded.url, PROFILE_FOLDER);
      redirect("/dashboard/digital-identity?profile=error");
    }
    await removeReplacedPersistentUrl(result.previous, uploaded.url, PROFILE_FOLDER);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error && String((error as { digest?: unknown }).digest ?? "").startsWith("NEXT_REDIRECT")) throw error;
    if (uploaded?.url) await removePersistentUrl(uploaded.url, PROFILE_FOLDER).catch(() => undefined);
    console.error("[company-profile] upload_failed", { businessId: business.id, error });
    redirect("/dashboard/digital-identity?profile=error");
  }
  revalidatePath("/dashboard/digital-identity"); revalidatePath(`/${business.slug}`);
  redirect("/dashboard/digital-identity?profile=saved");
}

export async function removeCompanyProfileAction() {
  const user = await getCurrentUserForWrites();
  if (!user) redirect("/dashboard/digital-identity?profile=readonly");
  const business = await getActiveBusinessForUser(user.id);
  if (!business) redirect("/onboarding");
  const result = await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`company-profile:${business.id}`}))`;
    const current = await tx.business.findFirst({ where: { id: business.id, ownerId: user.id, deletedAt: null }, select: { companyProfileUrl: true } });
    if (!current) return { found: false as const, previous: null };
    const updated = await tx.business.updateMany({ where: { id: business.id, ownerId: user.id, deletedAt: null }, data: { companyProfileUrl: null, companyProfileTitle: null } });
    return { found: updated.count === 1, previous: current.companyProfileUrl };
  });
  if (!result.found) redirect("/dashboard/digital-identity?profile=error");
  if (result.previous) await removePersistentUrl(result.previous, PROFILE_FOLDER).catch((error) => console.error("[company-profile] cleanup_failed", { businessId: business.id, error }));
  revalidatePath("/dashboard/digital-identity"); revalidatePath(`/${business.slug}`);
  redirect("/dashboard/digital-identity?profile=removed");
}

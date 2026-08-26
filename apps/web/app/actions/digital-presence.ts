"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "../lib/db";
import { getCurrentUserForWrites } from "../lib/auth";
import { getActiveBusinessForUser } from "../lib/active-business";
import { consumePublicWriteLimit } from "../lib/rate-limit";

const optionalEmail = z.union([z.literal(""), z.string().trim().email().max(254)]);
const schema = z.object({
  nameEn: z.string().trim().max(120),
  email: optionalEmail,
  website: z.string().trim().max(500),
  address: z.string().trim().max(240),
  instagramUrl: z.string().trim().max(500),
  xUrl: z.string().trim().max(500),
  tiktokUrl: z.string().trim().max(500),
  snapchatUrl: z.string().trim().max(500),
  facebookUrl: z.string().trim().max(500),
  metaTitle: z.string().trim().max(70),
  metaDescription: z.string().trim().max(180),
}).strict();

type SocialKey = "instagramUrl" | "xUrl" | "tiktokUrl" | "snapchatUrl" | "facebookUrl";
const allowedSocialHosts: Record<SocialKey, string[]> = {
  instagramUrl: ["instagram.com"],
  xUrl: ["x.com", "twitter.com"],
  tiktokUrl: ["tiktok.com"],
  snapchatUrl: ["snapchat.com"],
  facebookUrl: ["facebook.com", "fb.com"],
};
const socialStatus: Record<SocialKey, string> = {
  instagramUrl: "invalid-instagram",
  xUrl: "invalid-x",
  tiktokUrl: "invalid-tiktok",
  snapchatUrl: "invalid-snapchat",
  facebookUrl: "invalid-facebook",
};

function formString(formData: FormData, key: string) { return String(formData.get(key) ?? "").trim(); }
function normalizeHttpUrl(raw: string, allowedHosts?: string[]) {
  if (!raw) return null;
  try {
    const parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!/^https?:$/.test(parsed.protocol) || parsed.username || parsed.password || !parsed.hostname.includes(".")) return null;
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
    if (allowedHosts && !allowedHosts.some((host) => hostname === host || hostname.endsWith(`.${host}`))) return null;
    parsed.hash = "";
    return parsed.toString();
  } catch { return null; }
}
function invalidSchemaStatus(error: z.ZodError) {
  const field = String(error.issues[0]?.path[0] ?? "");
  if (field === "email") return "invalid-email";
  if (field === "website") return "invalid-url";
  if (field in socialStatus) return socialStatus[field as SocialKey];
  if (["nameEn", "address", "metaTitle", "metaDescription"].includes(field)) return `invalid-${field}`;
  return "invalid";
}

export async function updateDigitalPresenceAction(formData: FormData) {
  const user = await getCurrentUserForWrites();
  const business = await getActiveBusinessForUser(user.id);
  if (!business) redirect("/onboarding");

  let rateAllowed = false;
  try {
    const rate = await consumePublicWriteLimit({ scope: "digital-presence", businessId: business.id, identity: user.id, limit: 30, windowSeconds: 60 * 60 });
    rateAllowed = rate.allowed;
  } catch (error) {
    console.error("[digital-presence] rate_limit_failed", { businessId: business.id, error });
    redirect("/dashboard/digital-identity?presence=error");
  }
  if (!rateAllowed) redirect("/dashboard/digital-identity?presence=rate-limited");

  const raw = {
    nameEn: formString(formData, "nameEn"), email: formString(formData, "email"), website: formString(formData, "website"), address: formString(formData, "address"),
    instagramUrl: formString(formData, "instagramUrl"), xUrl: formString(formData, "xUrl"), tiktokUrl: formString(formData, "tiktokUrl"), snapchatUrl: formString(formData, "snapchatUrl"), facebookUrl: formString(formData, "facebookUrl"),
    metaTitle: formString(formData, "metaTitle"), metaDescription: formString(formData, "metaDescription"),
  };
  const parsed = schema.safeParse(raw);
  if (!parsed.success) redirect(`/dashboard/digital-identity?presence=${invalidSchemaStatus(parsed.error)}`);

  const website = normalizeHttpUrl(parsed.data.website);
  if (parsed.data.website && !website) redirect("/dashboard/digital-identity?presence=invalid-url");
  const socials = {} as Record<SocialKey, string | null>;
  for (const key of Object.keys(allowedSocialHosts) as SocialKey[]) {
    const value = parsed.data[key];
    const normalized = normalizeHttpUrl(value, allowedSocialHosts[key]);
    if (value && !normalized) redirect(`/dashboard/digital-identity?presence=${socialStatus[key]}`);
    socials[key] = normalized;
  }

  try {
    const result = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`business-autosave:${business.id}`}))`;
      const current = await tx.business.findFirst({
        where: { id: business.id, ownerId: user.id, deletedAt: null },
        select: { isPublished: true, phone: true, whatsapp: true },
      });
      if (!current) return "missing" as const;
      const nextEmail = parsed.data.email || null;
      if (current.isPublished && !Boolean(current.phone?.trim() || current.whatsapp?.trim() || nextEmail || website)) return "contact-required" as const;
      const updated = await tx.business.updateMany({
        where: { id: business.id, ownerId: user.id, deletedAt: null },
        data: {
          nameEn: parsed.data.nameEn || null,
          email: nextEmail,
          website,
          address: parsed.data.address || null,
          ...socials,
          metaTitle: parsed.data.metaTitle || null,
          metaDescription: parsed.data.metaDescription || null,
        },
      });
      return updated.count === 1 ? "updated" as const : "missing" as const;
    });
    if (result === "contact-required") redirect("/dashboard/digital-identity?presence=contact-required");
    if (result !== "updated") redirect("/dashboard/digital-identity?presence=missing");
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error && String((error as { digest?: unknown }).digest ?? "").startsWith("NEXT_REDIRECT")) throw error;
    console.error("[digital-presence] write_failed", { businessId: business.id, error });
    redirect("/dashboard/digital-identity?presence=error");
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/digital-identity");
  revalidatePath("/preview");
  revalidatePath(`/${business.slug}`);
  redirect("/dashboard/digital-identity?presence=saved");
}

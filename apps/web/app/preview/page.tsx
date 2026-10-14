import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../lib/auth";
import { getActiveBusinessForUser } from "../lib/active-business";
import { db } from "../lib/db";
import { PublicBusinessBio } from "../../components/public-business-bio";
import { PublicIdentityHighlights } from "../../components/public/public-identity-highlights";
import { getPublicBusinessUrlFromRequest } from "../lib/public-url";
import { sanitizePublicBusiness } from "../lib/public-business-sanitize";
import { normalizePageModules } from "../lib/page-modules";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "معاينة الصفحة | INFRO",
  robots: { index: false, follow: false, noarchive: true, nocache: true },
};

export default async function OwnerPreviewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const activeBusiness = await getActiveBusinessForUser(user.id, "page");
  if (!activeBusiness) redirect("/onboarding");

  const business = await db.business.findFirst({
    where: { id: activeBusiness.id, ownerId: activeBusiness.ownerId, deletedAt: null },
    include: {
      products: { include: { category: true } }, offers: true, services: true, openingHours: true,
      galleryItems: true, socialLinks: true, branches: true,
      contactPersons: { where: { isActive: true }, include: { branch: true, department: true }, orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
      departments: { include: { contacts: { where: { isActive: true }, include: { branch: true } } } },
    },
  });
  if (!business) redirect("/onboarding");
  const publicUrl = await getPublicBusinessUrlFromRequest(business.slug);
  const publicBusiness = sanitizePublicBusiness(business);
  const pageModules = normalizePageModules(business.pageModules, business.businessType);
  return <>
    <PublicBusinessBio business={publicBusiness} publicUrl={publicUrl} pageModules={pageModules} />
    <PublicIdentityHighlights
      companyProfileUrl={business.companyProfileUrl}
      companyProfileTitle={business.companyProfileTitle}
      socialLinks={[
        ["Instagram", business.instagramUrl], ["X", business.xUrl], ["TikTok", business.tiktokUrl], ["Snapchat", business.snapchatUrl], ["Facebook", business.facebookUrl],
      ].flatMap(([label, value]) => {
        if (!value) return [];
        try { const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`); return /^https?:$/.test(url.protocol) ? [{label: label!, href: url.toString()}] : []; } catch { return []; }
      })}
    />
  </>;
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../lib/auth";
import { getActiveBusinessForUser } from "../lib/active-business";
import { db } from "../lib/db";
import { PublicBusinessPageV10Light } from "../../components/public-business-page-v10-light";
import { getPublicBusinessUrlFromRequest } from "../lib/public-url";
import { sanitizePublicBusiness } from "../lib/public-business-sanitize";

function makeQrUrl(url: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
}

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "معاينة الصفحة | HEE",
  robots: { index: false, follow: false, noarchive: true, nocache: true },
};

export default async function OwnerPreviewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const activeBusiness = await getActiveBusinessForUser(user.id);
  if (!activeBusiness) redirect("/onboarding");

  const business = await db.business.findFirst({
    where: { id: activeBusiness.id, ownerId: user.id, deletedAt: null },
    include: {
      products: { include: { category: true } }, offers: true, services: true, openingHours: true,
      galleryItems: true, socialLinks: true, branches: true,
      contactPersons: { where: { isActive: true }, include: { branch: true, department: true }, orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
      departments: { include: { contacts: { where: { isActive: true }, include: { branch: true } } } },
    },
  });
  if (!business) redirect("/onboarding");
  const publicUrl = await getPublicBusinessUrlFromRequest(business.slug);
  return <PublicBusinessPageV10Light business={sanitizePublicBusiness(business)} qrDataUrl={makeQrUrl(publicUrl)} publicUrl={publicUrl} />;
}

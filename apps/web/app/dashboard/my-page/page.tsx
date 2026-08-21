import { redirect } from "next/navigation";
import { db } from "../../lib/db";
import { getCurrentUser } from "../../lib/auth";
import { getOwnedBusinessForRead } from "../../lib/ownership";
import { SimpleBusinessEditor } from "../../../components/dashboard/simple-business-editor";

export default async function DashboardMyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusiness = await getOwnedBusinessForRead();
  if (!activeBusiness) redirect("/onboarding");

  const business = await db.business.findFirst({
    where: { id: activeBusiness.id, ownerId: activeBusiness.ownerId, deletedAt: null },
    include: {
      services: { where: { isActive: true, deletedAt: null } },
      branches: { where: { isActive: true } },
      contactPersons: { where: { isActive: true } },
    },
  });

  if (!business) redirect("/onboarding");
  const effectivelyPublished = Boolean(business.isPublished && user.emailVerifiedAt);

  return <SimpleBusinessEditor business={{
    name: business.name,
    shortDescription: business.shortDescription ?? "",
    description: business.description ?? "",
    phone: business.phone ?? "",
    whatsapp: business.whatsapp ?? "",
    city: business.city ?? "",
    district: business.district ?? "",
    googleMapsLink: business.googleMapsLink ?? "",
    isPublished: effectivelyPublished,
    slug: business.slug,
  }} serviceCount={business.services.length} branchCount={business.branches.length} contactCount={business.contactPersons.length} />;
}

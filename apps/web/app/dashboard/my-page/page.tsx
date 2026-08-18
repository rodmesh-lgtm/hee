import { redirect } from "next/navigation";
import { getCurrentUser } from "../../lib/auth";
import { db } from "../../lib/db";
import { SimpleBusinessEditor } from "../../../components/dashboard/simple-business-editor";

export default async function DashboardMyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const business = await db.business.findFirst({
    where: { ownerId: user.id, deletedAt: null },
    include: {
      services: { where: { isActive: true, deletedAt: null } },
      branches: { where: { isActive: true } },
      contactPersons: { where: { isActive: true } },
    },
  });

  if (!business) redirect("/onboarding");

  return <SimpleBusinessEditor business={{
    name: business.name,
    shortDescription: business.shortDescription ?? "",
    description: business.description ?? "",
    phone: business.phone ?? "",
    whatsapp: business.whatsapp ?? "",
    city: business.city ?? "",
    district: business.district ?? "",
    googleMapsLink: business.googleMapsLink ?? "",
    isPublished: business.isPublished,
    slug: business.slug,
  }} serviceCount={business.services.length} branchCount={business.branches.length} contactCount={business.contactPersons.length} />;
}

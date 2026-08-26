import { redirect } from "next/navigation";
import { db } from "../../lib/db";
import { getCurrentUser } from "../../lib/auth";
import { getOwnedBusinessForRead } from "../../lib/ownership";
import { normalizePageModules, type PageModuleId } from "../../lib/page-modules";
import { SimpleBusinessEditor } from "../../../components/dashboard/simple-business-editor";
import { PageSectionOrderEditor } from "../../../components/dashboard/page-section-order-editor";

const managedIds = new Set<PageModuleId>(["about", "services", "location", "contactTeam", "portfolio", "contact"]);

type ManagedId = Extract<PageModuleId, "about" | "services" | "location" | "contactTeam" | "portfolio" | "contact">;

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
  const moduleOrder = normalizePageModules(business.pageModules, business.businessType)
    .filter((module): module is typeof module & { id: ManagedId } => managedIds.has(module.id))
    .map((module) => module.id);

  return <div className="space-y-5">
    <SimpleBusinessEditor business={{
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
    }} serviceCount={business.services.length} branchCount={business.branches.length} contactCount={business.contactPersons.length} />
    <PageSectionOrderEditor initialOrder={moduleOrder} />
  </div>;
}

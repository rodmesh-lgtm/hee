import { redirect } from "next/navigation";
import { getCurrentUser } from "../../lib/auth";
import { db } from "../../lib/db";
import { completionPercent } from "../../lib/dashboard-metrics";
import { getPublicBusinessUrlFromRequest } from "../../lib/public-url";
import { PageBuilderWizard } from "../../../components/dashboard/page-builder-wizard";

export default async function DashboardPageBuilderPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const business = await db.business.findFirst({
    where: { ownerId: user.id },
    include: {
      products: { include: { category: true } },
      services: true,
      offers: true,
      openingHours: true,
      galleryItems: true,
      socialLinks: true,
    },
  });

  if (!business) {
    redirect("/onboarding");
  }

  const publicUrl = await getPublicBusinessUrlFromRequest(business.slug);
  const completion = completionPercent({
    name: business.name,
    businessType: business.businessType,
    shortDescription: business.shortDescription,
    logoUrl: business.logoUrl,
    coverUrl: business.coverUrl,
    phone: business.phone,
    whatsapp: business.whatsapp,
    city: business.city,
    website: business.website,
  });

  return <PageBuilderWizard business={business} completion={completion} publicUrl={publicUrl} />;
}

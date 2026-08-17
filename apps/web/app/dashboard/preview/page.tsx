import { redirect } from "next/navigation";
import { getCurrentUser } from "../../lib/auth";
import { db } from "../../lib/db";
import { PublicBusinessPageV10Light } from "../../../components/public-business-page-v10-light";
import { getPublicBusinessUrlFromRequest } from "../../lib/public-url";

function makeQrUrl(url: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
}

export default async function DashboardBusinessPreviewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const business = await db.business.findFirst({
    where: { ownerId: user.id },
    include: {
      products: { include: { category: true } },
      offers: true,
      services: true,
      openingHours: true,
      galleryItems: true,
      socialLinks: true,
      branches: true,
      contactPersons: { where: { isActive: true }, orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
      departments: {
        include: { contacts: { include: { branch: true } } },
      },
    },
  });

  if (!business) redirect("/onboarding");

  const publicUrl = await getPublicBusinessUrlFromRequest(business.slug);
  return (
    <PublicBusinessPageV10Light
      business={business}
      qrDataUrl={makeQrUrl(publicUrl)}
      publicUrl={publicUrl}
    />
  );
}

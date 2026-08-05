import { getCurrentUser } from "../../lib/auth";
import { db } from "../../lib/db";
import { BusinessEditor } from "../../../components/shared/business-editor";

export default async function DashboardBusinessPage() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const business = await db.business.findFirst({ where: { ownerId: user.id } });

  return <BusinessEditor business={business} />;
}

import { redirect } from "next/navigation";
import { getCurrentUser } from "../lib/auth";
import { db } from "../lib/db";
import { OnboardingClient } from "../../components/onboarding-client";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const existingBusiness = await db.business.findFirst({
    where: { ownerId: user.id, deletedAt: null },
    select: { id: true },
  });

  if (existingBusiness) redirect("/dashboard");
  return <OnboardingClient />;
}

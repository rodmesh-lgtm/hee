import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "./auth";
import { getDashboardBusinessForUser } from "./active-business";
import { commercialAccess } from "./commercial-access";
import { canUsePaidSection, paidSectionBillingHref, type PaidSection } from "./paid-sections";

/** Subscription gate only; each page still enforces its existing owner/member authorization. */
export async function requirePaidSectionPage(section: PaidSection) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const business = await getDashboardBusinessForUser(user.id);
  if (business && !canUsePaidSection(await commercialAccess(business.id), section)) redirect(paidSectionBillingHref(section));
}

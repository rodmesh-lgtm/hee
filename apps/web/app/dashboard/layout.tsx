import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "../lib/auth";
import { isAdminEmail } from "../lib/admin";
import { getQaAuditSessionUser } from "../lib/qa-audit";
import { getActiveBusinessForUser, getOwnedBusinessSummaries } from "../lib/active-business";
import { hasActiveWhatsAppMarketingEntitlement } from "../lib/whatsapp/feature-entitlement";
import { DashboardShell } from "../../components/dashboard/dashboard-shell";

export const metadata: Metadata = {
  title: "لوحة التحكم",
  robots: { index: false, follow: false, noarchive: true, nocache: true },
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [qaAuditUser, business, businesses] = await Promise.all([
    getQaAuditSessionUser(),
    getActiveBusinessForUser(user.id),
    getOwnedBusinessSummaries(user.id),
  ]);
  const hasWhatsAppMarketing = business ? await hasActiveWhatsAppMarketingEntitlement({ businessId: business.id }) : false;
  const effectivelyPublished = Boolean(business?.isPublished && user.emailVerifiedAt);

  return <>
    <a
      href="#dashboard-main-content"
      className="fixed right-4 top-3 z-[100] -translate-y-24 rounded-xl bg-[#1f2552] px-4 py-2 text-sm font-black text-white shadow-lg transition-transform focus:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8b73e6] focus-visible:ring-offset-2"
    >
      الانتقال إلى المحتوى الرئيسي
    </a>
    <DashboardShell
      businessId={business?.id ?? null}
      businessName={business?.name ?? "نشاط جديد"}
      businessSlug={business?.slug ?? null}
      isPublished={effectivelyPublished}
      businesses={businesses.map(({ id, name, slug }) => ({ id, name, slug }))}
      showQaBadge={Boolean(qaAuditUser)}
      showAdminLink={!qaAuditUser && Boolean(user.emailVerifiedAt) && isAdminEmail(user.email)}
      hasWhatsAppMarketing={hasWhatsAppMarketing}
    >
      <div id="dashboard-main-content" tabIndex={-1} className="outline-none focus-visible:ring-2 focus-visible:ring-[#8b73e6] focus-visible:ring-offset-4">
        {children}
      </div>
    </DashboardShell>
  </>;
}

import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "../lib/auth";
import { isAdminEmail } from "../lib/admin";
import { getQaAuditSessionUser } from "../lib/qa-audit";
import { DashboardShell } from "../../components/dashboard/dashboard-shell";
import { db } from "../lib/db";

export const metadata: Metadata = {
  title: "لوحة التحكم",
  robots: { index: false, follow: false, noarchive: true, nocache: true },
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const qaAuditUser = await getQaAuditSessionUser();
  const business = await db.business.findFirst({
    where: { ownerId: user.id, deletedAt: null },
    select: { name: true, slug: true, isPublished: true },
  });

  return <DashboardShell businessName={business?.name ?? "نشاط جديد"} businessSlug={business?.slug ?? null} isPublished={business?.isPublished ?? false} showQaBadge={Boolean(qaAuditUser)} showAdminLink={!qaAuditUser && isAdminEmail(user.email)}>{children}</DashboardShell>;
}

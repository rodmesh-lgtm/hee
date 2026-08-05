import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "../lib/auth";
import { getQaAuditSessionUser } from "../lib/qa-audit";
import { DashboardShell } from "../../components/dashboard/dashboard-shell";
import { db } from "../lib/db";

export async function generateMetadata(): Promise<Metadata> {
  const qaAuditUser = await getQaAuditSessionUser();
  if (!qaAuditUser) {
    return {};
  }

  return {
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const qaAuditUser = await getQaAuditSessionUser();
  const showQaBadge = Boolean(qaAuditUser);

  const business = await db.business.findFirst({
    where: { ownerId: user.id },
    select: {
      name: true,
      slug: true,
      isPublished: true,
    },
  });

  return (
    <DashboardShell
      businessName={business?.name ?? "نشاط جديد"}
      businessSlug={business?.slug ?? null}
      isPublished={business?.isPublished ?? false}
      showQaBadge={showQaBadge}
    >
      {children}
    </DashboardShell>
  );
}

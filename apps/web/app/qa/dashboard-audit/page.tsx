import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { isPreviewQaEnvironment } from "../../lib/qa-audit";

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function QaDashboardAuditPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!isPreviewQaEnvironment()) {
    notFound();
  }

  const resolvedSearchParams = await searchParams;
  const headerList = await headers();
  const userAgent = headerList.get("user-agent") ?? "";

  if (userAgent.includes("bot") || userAgent.includes("crawler")) {
    notFound();
  }

  // Browser URLs carry only short-lived, single-use audit IDs. The long-lived
  // QA_AUDIT_SECRET is never copied into a query string.
  const auditId = Array.isArray(resolvedSearchParams?.auditId)
    ? resolvedSearchParams.auditId[0]
    : resolvedSearchParams?.auditId ?? null;
  const requestedPath = Array.isArray(resolvedSearchParams?.path)
    ? resolvedSearchParams.path[0]
    : resolvedSearchParams?.path ?? null;

  if (!auditId) {
    redirect("/login");
  }

  const redirectUrl = new URL(`/api/qa/dashboard-audit`, "https://placeholder.local");
  redirectUrl.searchParams.set("auditId", auditId);
  if (requestedPath) {
    redirectUrl.searchParams.set("path", requestedPath);
  }

  redirect(redirectUrl.pathname + redirectUrl.search);
}

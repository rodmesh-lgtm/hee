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

  const token = Array.isArray(resolvedSearchParams?.token)
    ? resolvedSearchParams.token[0]
    : resolvedSearchParams?.token ?? null;
  const auditId = Array.isArray(resolvedSearchParams?.auditId)
    ? resolvedSearchParams.auditId[0]
    : resolvedSearchParams?.auditId ?? null;
  const requestedPath = Array.isArray(resolvedSearchParams?.path)
    ? resolvedSearchParams.path[0]
    : resolvedSearchParams?.path ?? null;

  if (!token && !auditId) {
    redirect("/login");
  }

  const redirectUrl = new URL(`/api/qa/dashboard-audit`, "https://placeholder.local");
  if (token) {
    redirectUrl.searchParams.set("token", token);
  }
  if (auditId) {
    redirectUrl.searchParams.set("auditId", auditId);
  }
  if (requestedPath) {
    redirectUrl.searchParams.set("path", requestedPath);
  }

  redirect(redirectUrl.pathname + redirectUrl.search);
}

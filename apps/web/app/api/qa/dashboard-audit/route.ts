import { NextResponse } from "next/server";
import { createQaAuditOneTimeLink, hasQaAuditRequestAccess, isPreviewQaEnvironment, requireQaAuditAccess } from "../../../lib/qa-audit";

export async function GET(request: Request) {
  if (!isPreviewQaEnvironment()) {
    return new NextResponse(null, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  // The long-lived QA_AUDIT_SECRET is deliberately never accepted from the URL.
  // URLs can leak through browser history, proxy logs and referrers. Interactive
  // browser handoff uses only the single-use auditId minted by an authorized POST.
  const redirectTarget = await requireQaAuditAccess({
    auditId: searchParams.get("auditId"),
    path: searchParams.get("path"),
  });

  if (redirectTarget) {
    return NextResponse.redirect(new URL(redirectTarget, request.url));
  }

  return new NextResponse(null, { status: 404 });
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  // Do not let the fallback query-token support in the shared helper become a
  // credential transport for this endpoint. Use Authorization: Bearer or an
  // already-established preview QA session instead.
  if (searchParams.has("token")) {
    return new NextResponse(null, { status: 404 });
  }
  if (!(await hasQaAuditRequestAccess(request))) {
    return new NextResponse(null, { status: 404 });
  }

  let path: string | null = null;
  try {
    const payload = (await request.json().catch(() => ({}))) as { path?: string };
    path = typeof payload.path === "string" ? payload.path : null;
  } catch {
    path = null;
  }

  const created = await createQaAuditOneTimeLink(path);
  if (!created) {
    return new NextResponse(null, { status: 404 });
  }

  const url = new URL(request.url);
  const auditUrl = `${url.origin}/qa/dashboard-audit?auditId=${created.auditId}&path=${encodeURIComponent(created.path)}`;
  return NextResponse.json({
    url: auditUrl,
    expiresAt: created.expiresAt.toISOString(),
    expiresInMinutes: 45,
    readOnly: true,
    previewOnly: true,
  });
}

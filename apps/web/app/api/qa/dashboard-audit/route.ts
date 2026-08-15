import { NextResponse } from "next/server";
import { createQaAuditOneTimeLink, hasQaAuditRequestAccess, isPreviewQaEnvironment, requireQaAuditAccess } from "../../../lib/qa-audit";

export async function GET(request: Request) {
  if (!isPreviewQaEnvironment()) {
    return new NextResponse(null, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const redirectTarget = await requireQaAuditAccess({
    token: searchParams.get("token"),
    auditId: searchParams.get("auditId"),
    path: searchParams.get("path"),
  });

  if (redirectTarget) {
    return NextResponse.redirect(new URL(redirectTarget, request.url));
  }

  return new NextResponse(null, { status: 404 });
}

export async function POST(request: Request) {
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

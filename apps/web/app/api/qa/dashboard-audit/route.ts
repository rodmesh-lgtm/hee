import { NextResponse } from "next/server";
import { createQaAuditOneTimeLink, isPreviewQaEnvironment, isQaAuditTokenValid, requireQaAuditAccess } from "../../../lib/qa-audit";
import { getCurrentUser } from "../../../lib/auth";

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
  if (!isPreviewQaEnvironment()) {
    return new NextResponse(null, { status: 404 });
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  const url = new URL(request.url);
  const queryToken = url.searchParams.get("token");
  const authToken = bearerToken || queryToken;

  let canMintLink = isQaAuditTokenValid(authToken);
  if (!canMintLink) {
    const user = await getCurrentUser();
    canMintLink = Boolean(user);
  }

  if (!canMintLink) {
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

  const origin = url.origin;
  const auditUrl = `${origin}/qa/dashboard-audit?auditId=${created.auditId}&path=${encodeURIComponent(created.path)}`;
  return NextResponse.json({
    url: auditUrl,
    expiresAt: created.expiresAt.toISOString(),
    expiresInMinutes: 45,
    readOnly: true,
    previewOnly: true,
  });
}

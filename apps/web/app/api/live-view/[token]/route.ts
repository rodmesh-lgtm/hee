import { getWatchSession, livePrivateHeaders } from "../../../lib/live-view/access";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const session = await getWatchSession((await params).token);
    return Response.json({ active: Boolean(session) }, { headers: livePrivateHeaders, status: session ? 200 : 410 });
  } catch { return Response.json({ active: false }, { headers: livePrivateHeaders, status: 503 }); }
}

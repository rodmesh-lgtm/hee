import { getWatchSession, livePrivateHeaders } from "../../../../../lib/live-view/access";
import { fetchLiveMedia, readBoundedMedia, liveGatewayConfig } from "../../../../../lib/live-view/gateway";
import { rewriteLivePlaylist, validMediaFile } from "../../../../../lib/live-view/policy";
import { mediaGrant, validMediaGrant } from "../../../../../lib/live-view/media-grant";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ token: string; file: string }> }) {
  const { token, file } = await params;
  const deny = (status: number) => new Response(null, { status, headers: livePrivateHeaders });
  if (!validMediaFile(file)) return deny(404);
  try {
    const session = await getWatchSession(token); if (!session) return deny(410);
    const config = liveGatewayConfig(); if (!config) return deny(503);
    if (file !== "index.m3u8" && !validMediaGrant(config.secret, session.tokenHash, file, new URL(request.url).searchParams)) return deny(403);
    const upstream = await fetchLiveMedia(session.station.streamKey, file);
    if (!upstream.ok) { await upstream.body?.cancel(); return deny(503); }
    const playlist = file.endsWith(".m3u8");
    const bytes = await readBoundedMedia(upstream, playlist ? 256_000 : 4_000_000);
    // A close/expiry during the upstream fetch must not release another segment.
    if (!await getWatchSession(token)) return deny(410);
    const body = playlist ? rewriteLivePlaylist(bytes.toString("utf8"), `/api/live-view/${token}/stream`, asset => mediaGrant(config.secret, session.tokenHash, asset, session.expiresAt)) : new Uint8Array(bytes);
    const type = playlist ? "application/vnd.apple.mpegurl" : file.endsWith(".ts") ? "video/mp2t" : "video/mp4";
    return new Response(body, { headers: { ...livePrivateHeaders, "Content-Type": type } });
  } catch { return deny(503); }
}

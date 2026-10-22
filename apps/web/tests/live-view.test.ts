import assert from "node:assert/strict";
import { test } from "node:test";
import { canWatch, liveTokenHash, newLiveToken, rewriteLivePlaylist, validLiveToken, validMediaFile } from "../app/lib/live-view/policy";
import { mediaGrant, validMediaGrant } from "../app/lib/live-view/media-grant";
import { memberCanAccess, staffCanOpenPath } from "../app/lib/staff-permissions";

test("watch capabilities have 256 bits of entropy; only digests are persisted", () => {
  const a = newLiveToken(), b = newLiveToken();
  assert.ok(validLiveToken(a.token)); assert.notEqual(a.token, b.token);
  assert.equal(a.hash, liveTokenHash(a.token)); assert.notEqual(a.hash, a.token);
  for (const bad of ["", "a".repeat(1000), "../camera", "token"]) assert.equal(validLiveToken(bad), false);
});
test("lease fails closed on expiry, explicit end, disabled station and deleted tenant", () => {
  const now = new Date("2026-10-22T12:00:00Z");
  const s = { endedAt: null, expiresAt: new Date(now.getTime()+1), station: { enabled: true }, business: { deletedAt: null } };
  assert.equal(canWatch(s,now),true);
  assert.equal(canWatch({...s,expiresAt:now},now),false);
  assert.equal(canWatch({...s,endedAt:now},now),false);
  assert.equal(canWatch({...s,station:{enabled:false}},now),false);
  assert.equal(canWatch({...s,business:{deletedAt:now}},now),false);
});
test("rewrite all child playlists and media through the authenticated same-origin proxy", () => {
  const source = '#EXTM3U\n#EXT-X-MAP:URI="init.mp4"\n#EXTINF:2,\nseg1.ts\nstream.m3u8\n';
  const out = rewriteLivePlaylist(source, "/api/live-view/capability/stream", () => "?grant=test");
  assert.ok(out.includes('URI="/api/live-view/capability/stream/init.mp4?grant=test"'));
  assert.ok(out.includes("/api/live-view/capability/stream/seg1.ts?grant=test"));
  assert.ok(out.includes("/api/live-view/capability/stream/stream.m3u8?grant=test"));
});
test("reject upstream URLs, traversal, encryption keys, queries and oversized playlists", () => {
  for (const uri of ["https://evil.test/seg.ts", "//evil/seg.ts", "../seg.ts", "%2e%2e/seg.ts", "seg.ts?token=x", "file.key", "/camera/seg.ts", "seg.ts#x"]) {
    assert.equal(validMediaFile(uri),false); assert.throws(() => rewriteLivePlaylist(`#EXTM3U\n${uri}`,"/proxy"));
    assert.throws(() => rewriteLivePlaylist(`#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="${uri}"`,"/proxy"));
  }
  assert.throws(() => rewriteLivePlaylist('#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI=https://evil.test/key', "/proxy"));
  assert.throws(() => rewriteLivePlaylist('#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,uri="key.mp4"', "/proxy"));
  assert.throws(() => rewriteLivePlaylist("not a playlist", "/proxy"));
  assert.throws(() => rewriteLivePlaylist("#EXTM3U"+" ".repeat(256_000), "/proxy"));
});
test("segment grants are lease-, filename-, secret- and expiry-bound", () => {
  const now=Date.parse("2026-10-22T12:00:00Z"), secret="s".repeat(32), lease=liveTokenHash("lease");
  const query = new URLSearchParams(mediaGrant(secret,lease,"seg1.ts",new Date(now+60_000),now));
  assert.equal(validMediaGrant(secret,lease,"seg1.ts",query,now),true);
  assert.equal(validMediaGrant(secret,lease,"seg2.ts",query,now),false);
  assert.equal(validMediaGrant(secret,liveTokenHash("other"),"seg1.ts",query,now),false);
  assert.equal(validMediaGrant("x".repeat(32),lease,"seg1.ts",query,now),false);
  assert.equal(validMediaGrant(secret,lease,"seg1.ts",query,now+30_000),false);
  assert.equal(validMediaGrant(secret,lease,"seg1.ts",new URLSearchParams(),now),false);
  const short = new URLSearchParams(mediaGrant(secret,lease,"seg1.ts",new Date(now+10),now));
  assert.equal(validMediaGrant(secret,lease,"seg1.ts",short,now+10),false);
});
test("existing staff roles cannot inherit camera access", () => {
  assert.equal(memberCanAccess(["whatsapp","appointments"],"liveView"),false);
  assert.equal(staffCanOpenPath("/dashboard/live-view",["liveView"]),true);
  assert.equal(staffCanOpenPath("/dashboard/live-view",["whatsapp"]),false);
  assert.equal(memberCanAccess(null,"liveView"),false);
});
